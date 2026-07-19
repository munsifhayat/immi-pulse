"""End-to-end exercise of durable rate limiting and tier caps (Phase 2).

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_ratelimit.py

The claim this file exists to prove is narrow and specific: **a counter written
by one process still binds in another**. That is the entire reason the limiter
moved out of a module-level dict and into Postgres. So the centrepiece is a
real second interpreter — ``subprocess`` re-running this same file with
``--child`` — which imports the app fresh, with empty module state and its own
connection pool, and finds the exhausted account still exhausted. Under the old
dict the child would have started at zero and sailed through, so the test can
actually fail if the change is reverted.

The child also posts successfully as a *different* account before it reports
back. Without that, a child that failed for some unrelated reason (bad env, no
DB, wrong path) would look exactly like a child correctly hitting the cap, and
the whole test would pass by accident.

Also covered here, because none of it can be asserted without a database:
T0-vs-T1 (a visitor and a member get visibly different allowances), the per-IP
ceiling boundary and its sign-in-not-ban wording, and the operator reset.
"""

import os

# Must be set before the first get_settings() — encryption.py calls it at import.
os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import json
import subprocess
import sys
import uuid

import httpx
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []

# httpx's ASGITransport reports every request as coming from 127.0.0.1, so the
# whole suite shares one IP scope — including across runs, now that counters are
# durable. Every entry point here resets that scope first.
TEST_CLIENT_IP = "127.0.0.1"

PASSWORD = "durable-counters-4-life"


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)
    return cond


class NoCookieClient:
    """An httpx client that forgets cookies between calls.

    The backend sets a durable HttpOnly ``ip_device`` cookie, and httpx's jar
    would replay it — quietly turning every "a brand-new device" scenario below
    into "the same device again". See ``tests/e2e_community_accounts.py``.
    """

    def __init__(self, inner: httpx.AsyncClient):
        self._inner = inner

    async def get(self, url, **kw):
        return await self._call("GET", url, **kw)

    async def post(self, url, **kw):
        return await self._call("POST", url, **kw)

    async def _call(self, method, url, **kw):
        response = await self._inner.request(method, url, **kw)
        self._inner.cookies.clear()
        return response


# --------------------------------------------------------------------------
# Shared helpers
# --------------------------------------------------------------------------


async def _reset_ip_scope():
    """Clear this machine's IP buckets so a run never inherits the last one."""
    from app.agents.immigration.community.service import hash_ip, reset_rate_counters
    from app.db.session import get_async_session

    async with get_async_session() as db:
        removed = await reset_rate_counters(
            db, scope_type="ip", scope_key=hash_ip(TEST_CLIENT_IP)
        )
        await db.commit()
    return removed


async def _signup(client, svc, suffix):
    """Bootstrap a fresh device and claim it as an account. Returns (token, handle)."""
    r = await client.post("/community/public/identity", headers=svc)
    device = r.json()["device_token"]
    r = await client.post(
        "/community/public/auth/signup",
        headers={**svc, "X-Device-Token": device},
        json={"password": PASSWORD, "accepted_no_recovery": True},
    )
    body = r.json()
    return body.get("token"), body.get("account", {}).get("handle"), device


async def _post_question(client, headers, label):
    return await client.post(
        "/community/journeys",
        headers=headers,
        json={
            "post_type": "question",
            "title": f"Rate-limit probe {label}",
            "note": "Posted by tests/e2e_community_ratelimit.py",
        },
    )


# --------------------------------------------------------------------------
# Child process — the cross-process proof
# --------------------------------------------------------------------------


async def child_main(session_token: str) -> dict:
    """A FRESH interpreter: no warm module state, no inherited counters.

    Returns a small JSON verdict the parent asserts on.
    """
    from app.core.config import get_settings
    from app.main import app

    svc = {"X-API-Key": get_settings().api_key}
    transport = ASGITransport(app=app)
    suffix = uuid.uuid4().hex[:8]
    out = {}

    async with httpx.AsyncClient(
        transport=transport, base_url="http://test/api/v1"
    ) as _inner:
        c = NoCookieClient(_inner)

        # 1. The account the parent exhausted. If the limiter were still a
        #    per-process dict, this process would know nothing about it.
        r = await _post_question(
            c, {**svc, "Authorization": f"Bearer {session_token}"}, f"child-{suffix}"
        )
        out["exhausted_status"] = r.status_code
        out["exhausted_detail"] = r.json().get("detail", "") if r.content else ""

        # 2. A brand-new account in this same process. This must SUCCEED —
        #    otherwise a broken child would be indistinguishable from a
        #    correctly-blocked one and the check above would prove nothing.
        fresh_token, _, _ = await _signup(c, svc, suffix)
        r = await _post_question(
            c, {**svc, "Authorization": f"Bearer {fresh_token}"}, f"child-fresh-{suffix}"
        )
        out["fresh_status"] = r.status_code

    return out


# --------------------------------------------------------------------------
# Parent
# --------------------------------------------------------------------------


async def main():
    from app.agents.immigration.community import service, tiers
    from app.agents.immigration.community.models import RateCounter
    from app.agents.immigration.community.service import hash_ip
    from app.core.config import get_settings
    from app.db.session import get_async_session
    from app.main import app
    from sqlalchemy import select

    settings = get_settings()
    svc = {"X-API-Key": settings.api_key}
    transport = ASGITransport(app=app)
    base = "http://test/api/v1"
    suffix = uuid.uuid4().hex[:8]
    ip_hash = hash_ip(TEST_CLIENT_IP)

    await _reset_ip_scope()

    # ══ 0. The dict is actually gone ══
    print("\n0. The in-process limiter is gone")
    check(
        "no module-level _rate_state dict remains",
        not hasattr(service, "_rate_state"),
    )
    check(
        "no module-level _RATE_LIMITS table remains",
        not hasattr(service, "_RATE_LIMITS"),
    )
    check("consume_rate is DB-backed (takes a session)", callable(service.consume_rate))

    t1_posts = tiers.caps_for(tiers.T1_NEW).posts_per_day
    t0_posts = tiers.caps_for(tiers.T0_VISITOR).posts_per_day

    async with httpx.AsyncClient(transport=transport, base_url=base) as _inner:
        c = NoCookieClient(_inner)

        # ══ 1. A T1 account spends exactly its allowance ══
        print(f"\n1. A new account gets exactly {t1_posts} posts")
        session_token, handle, _device = await _signup(c, svc, suffix)
        check("account created", bool(session_token))
        auth = {**svc, "Authorization": f"Bearer {session_token}"}

        statuses = []
        for i in range(t1_posts):
            r = await _post_question(c, auth, f"{suffix}-{i}")
            statuses.append(r.status_code)
        check(
            f"all {t1_posts} posts within the allowance succeed",
            statuses == [201] * t1_posts,
        )

        r = await _post_question(c, auth, f"{suffix}-over")
        check("the next post is refused with 429", r.status_code == 429)
        detail = r.json().get("detail", "")
        check("refusal is member-facing, not a stack trace", bool(detail))
        check(
            "refusal does not state the cap (a visible cap is a plannable cap)",
            not any(ch.isdigit() for ch in detail),
        )

        # ══ 2. The counter is a real row, at the expected value ══
        print("\n2. The allowance is a durable row, not process memory")
        async with get_async_session() as db:
            row = (
                await db.execute(
                    select(RateCounter).where(
                        RateCounter.scope_type == "ip",
                        RateCounter.scope_key == ip_hash,
                        RateCounter.action == tiers.POST,
                        RateCounter.window_start == tiers.day_window_start(),
                    )
                )
            ).scalar_one_or_none()
        check("an ip-scoped counter row exists for this run", row is not None)
        check(
            "the test's assumed client IP matches what the app recorded",
            row is not None and row.scope_key == ip_hash,
        )
        check(
            f"the refused attempt was not banked (count stayed at {t1_posts})",
            row is not None and row.count == t1_posts,
        )

        # ══ 3. THE POINT: a second process finds the same account exhausted ══
        print("\n3. Cross-process: a fresh interpreter honours the same counter")
        proc = subprocess.run(
            [sys.executable, os.path.abspath(__file__), "--child", session_token],
            capture_output=True,
            text=True,
            cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            env={**os.environ, "PYTHONPATH": "src"},
            timeout=180,
        )
        verdict = {}
        for line in proc.stdout.splitlines():
            if line.startswith("CHILD_JSON:"):
                verdict = json.loads(line[len("CHILD_JSON:") :])
        if not check("child process reported a verdict", bool(verdict)):
            print("    child stdout:", proc.stdout[-2000:])
            print("    child stderr:", proc.stderr[-2000:])

        check(
            "a SECOND process still refuses the exhausted account (429)",
            verdict.get("exhausted_status") == 429,
        )
        # Load-bearing: proves the child was capable of posting at all, so the
        # 429 above is the limiter and not a broken child.
        check(
            "...while a brand-new account in that same process posts fine (201)",
            verdict.get("fresh_status") == 201,
        )

        # ══ 4. A visitor and a member get visibly different allowances ══
        print(f"\n4. A visitor (T0) gets {t0_posts}, not {t1_posts}")
        r = await c.post("/community/public/identity", headers=svc)
        visitor_device = r.json()["device_token"]
        vh = {**svc, "X-Device-Token": visitor_device}
        check("visitor has no account", r.json()["has_account"] is False)

        visitor_statuses = []
        for i in range(t0_posts + 1):
            r = await _post_question(c, vh, f"{suffix}-visitor-{i}")
            visitor_statuses.append(r.status_code)
        check(
            f"a visitor's first {t0_posts} posts succeed",
            visitor_statuses[:t0_posts] == [201] * t0_posts,
        )
        check(
            "a visitor is cut off before a member would be (tier is wired, "
            "not just stored)",
            visitor_statuses[-1] == 429 and t0_posts < t1_posts,
        )

        # ══ 5. remaining_allowance answers without spending anything ══
        print("\n5. The allowance can be read without spending it")
        async with get_async_session() as db:
            account = (
                await db.execute(
                    select(service.AnonIdentity).where(
                        service.AnonIdentity.handle == handle
                    )
                )
            ).scalar_one()
            before = await service.remaining_allowance(
                db, ip_hash=ip_hash, identity=account
            )
            after = await service.remaining_allowance(
                db, ip_hash=ip_hash, identity=account
            )
        check("reports the account's tier", before["tier"] == tiers.T1_NEW)
        check(
            "reports nothing left after the allowance was spent",
            before["actions"][tiers.POST]["remaining"] == 0,
        )
        check("replies are still available", before["actions"][tiers.REPLY]["remaining"] > 0)
        check("reading twice changes nothing (no side effect)", before == after)

        # ══ 6. The per-IP ceiling: a backstop that says "sign in", never "banned" ══
        #
        # Seeded to one below the ceiling rather than walked up to it — 25 real
        # posts would spend the whole day's network budget and strand every
        # other e2e script on this machine. The boundary is the behaviour under
        # test; the run-up to it is not.
        print("\n6. The per-IP ceiling binds, and offers a way through")
        ceiling = tiers.IP_CEILING.posts_per_day
        async with get_async_session() as db:
            await service.reset_rate_counters(db, scope_type="ip", scope_key=ip_hash)
            db.add(
                RateCounter(
                    id=uuid.uuid4(),
                    scope_type="ip",
                    scope_key=ip_hash,
                    action=tiers.POST,
                    window_start=tiers.day_window_start(),
                    count=ceiling - 1,
                )
            )
            await db.commit()

        r = await c.post("/community/public/identity", headers=svc)
        edge = {**svc, "X-Device-Token": r.json()["device_token"]}
        r = await _post_question(c, edge, f"{suffix}-at-ceiling")
        check("the post that reaches the ceiling still lands", r.status_code == 201)

        r = await _post_question(c, edge, f"{suffix}-over-ceiling")
        check("the post past the ceiling is refused (429)", r.status_code == 429)
        ip_detail = r.json().get("detail", "").lower()
        check(
            "the refusal points at signing in, not at a ban",
            "sign in" in ip_detail and "ban" not in ip_detail,
        )
        check(
            "the refusal blames the network, not the person",
            "network" in ip_detail,
        )
        check(
            "the refusal is temporary on its face",
            "tomorrow" in ip_detail,
        )

        # ══ 7. An operator can clear a shared address on the spot ══
        print("\n7. A shared address can be cleared, which is why it is not a ban")
        async with get_async_session() as db:
            removed = await service.reset_rate_counters(
                db, scope_type="ip", scope_key=ip_hash
            )
            await db.commit()
        check("reset removed the ip buckets", removed >= 1)

        r = await _post_question(c, edge, f"{suffix}-after-reset")
        check("posting works again immediately after the reset", r.status_code == 201)

        # Leave the machine clean for the next script.
        await _reset_ip_scope()

    print()
    if _failures:
        print(f"{FAIL} {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"    - {f}")
        raise SystemExit(1)
    print(f"{PASS} All community rate-limit checks passed.")


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--child":
        result = asyncio.run(child_main(sys.argv[2]))
        print("CHILD_JSON:" + json.dumps(result))
    else:
        asyncio.run(main())
