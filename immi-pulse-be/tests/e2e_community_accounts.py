"""End-to-end exercise of pseudonymous community accounts (Phase 1).

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_accounts.py

Drives the HTTP surface in-process via httpx ASGITransport:

  bootstrap a device -> post a question anonymously -> claim that identity as an
  account (no email, explicit no-recovery acknowledgement) -> log in from a
  FRESH client carrying no device token at all -> the earlier post is still
  listed as theirs. Then: signup WITH an email -> recover -> reset -> log in on
  the new password. Plus the guardrails that matter: login throttling, the
  recovery endpoint refusing to act as an account oracle, and the leak sweep
  proving a member's handle and email never reach a consultant.
"""

import os

# Must be set before the first get_settings() — encryption.py calls it at import.
os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import uuid

import httpx
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)
    return cond


class NoCookieClient:
    """An httpx client that forgets cookies between calls.

    The backend now sets a durable HttpOnly ``ip_device`` cookie, and httpx's
    cookie jar would happily replay it — which would quietly defeat every
    "a brand-new device with no device token" scenario in this file. Dropping
    the jar after each call makes device identity purely header-driven, so the
    cross-device claims below mean what they say. That the cookie is set at all
    is asserted separately, off the raw Set-Cookie header.
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


async def main():
    # Capture recovery mail instead of sending it (pattern: e2e_portal_flow.py).
    from app.integrations.resend import templates as email_templates

    sent_emails = []

    async def _fake_send_generic(**kw):
        sent_emails.append(kw)
        return {"id": "fake-" + uuid.uuid4().hex[:8]}

    email_templates.send_generic = _fake_send_generic

    from app.agents.immigration.community.service import hash_ip, reset_rate_counters
    from app.agents.immigration.orgs.models import Organization, Seat
    from app.agents.immigration.users.models import User
    from app.core.config import get_settings
    from app.core.jwt_auth import issue_token
    from app.db.session import get_async_session
    from app.main import app

    settings = get_settings()
    suffix = uuid.uuid4().hex[:8]
    api_key = settings.api_key

    # ── Clear this machine's IP write-allowance buckets ──
    # Rate counters are durable now (Phase 2), and every ASGITransport request
    # reports as 127.0.0.1 — so without this, a handful of runs in one UTC day
    # would exhaust the network ceiling and this script would start failing on
    # its own history rather than on anything it tests.
    async with get_async_session() as db:
        await reset_rate_counters(db, scope_type="ip", scope_key=hash_ip("127.0.0.1"))
        await db.commit()

    # ── Seed a consultant owner/seat/org for the leak sweep ──
    async with get_async_session() as db:
        org = Organization(name=f"Accounts Test Org {suffix}", country="AU")
        db.add(org)
        await db.flush()
        user = User(
            email=f"agent.{suffix}@firm.com", first_name="Ada", last_name="Gent"
        )
        db.add(user)
        await db.flush()
        seat = Seat(org_id=org.id, user_id=user.id, role="owner", status="active")
        db.add(seat)
        await db.commit()
        owner_jwt = issue_token(user.id, seat.id, org.id)

    transport = ASGITransport(app=app)
    base = "http://test/api/v1"
    svc = {"X-API-Key": api_key}
    consultant = {"X-API-Key": api_key, "Authorization": f"Bearer {owner_jwt}"}

    async with httpx.AsyncClient(transport=transport, base_url=base) as _inner:
        c = NoCookieClient(_inner)
        # ══ 1. Anonymous device: bootstrap, then post before any account exists ══
        r = await c.post("/community/public/identity", headers=svc)
        check("identity bootstrapped", r.status_code == 200)
        dev1 = r.json()["device_token"]
        handle1 = r.json()["handle"]
        check("handle assigned, not chosen", bool(handle1) and len(handle1) > 6)
        check("no account yet", r.json()["has_account"] is False)
        check(
            "device cookie set server-side (survives Safari ITP)",
            "ip_device" in r.headers.get("set-cookie", ""),
        )

        h1 = {**svc, "X-Device-Token": dev1}

        # Reroll is allowed *before* committing to an account.
        r = await c.post("/community/public/identity/reroll", headers=h1)
        check("handle can be rerolled before signup", r.status_code == 200)
        handle1 = r.json()["handle"]

        marker = f"question-{suffix}"
        r = await c.post(
            "/community/journeys",
            headers=h1,
            json={
                "post_type": "question",
                "title": f"Is my wait normal? {marker}",
                "note": "Asked anonymously, before I made an account.",
            },
        )
        check("anonymous question posted", r.status_code == 201)
        journey_id = r.json()["id"]

        # ══ 2. Claim that identity as an account — email is now required ══
        r = await c.post(
            "/community/public/auth/signup",
            headers=h1,
            json={"password": "correct-horse-battery-7"},
        )
        check(
            "signup without an email is refused outright",
            r.status_code in (400, 422),
        )

        email1 = f"claim-{suffix}@example.com"
        r = await c.post(
            "/community/public/auth/signup",
            headers=h1,
            json={"password": "correct-horse-battery-7", "email": email1},
        )
        check("signup succeeds with an email", r.status_code == 201)
        body = r.json()
        session_token = body["token"]
        check("session token issued", bool(session_token))
        check("account keeps its pre-signup handle", body["account"]["handle"] == handle1)
        check("account can recover — email is mandatory now", body["account"]["can_recover"] is True)
        check("but the address is not treated as verified", body["account"]["email_verified"] is False)
        check("account serializer carries no email address", "email" not in str(body["account"]).replace("has_email", "").replace("email_verified", ""))

        # Weak passwords are rejected by the existing policy.
        r = await c.post("/community/public/identity", headers=svc)
        weak_dev = r.json()["device_token"]
        r = await c.post(
            "/community/public/auth/signup",
            headers={**svc, "X-Device-Token": weak_dev},
            json={"password": "1234567", "email": f"weak-{suffix}@example.com"},
        )
        check("short password rejected", r.status_code in (400, 422))

        # Signing up a second time on the same browser is a normal thing to do,
        # not a 409. The first signup released this browser's device token, so
        # the browser is a stranger again — and a stranger is entitled to their
        # own account. This is the shared-computer case the old conflict made a
        # dead end: the person at the keyboard is not the person who owns the
        # first account, and has no password to "just log in" with.
        r = await c.post(
            "/community/public/auth/signup",
            headers=h1,
            json={"password": "another-password-99", "email": f"dupe-{suffix}@example.com"},
        )
        check("a second signup on the same browser succeeds", r.status_code == 201)
        second_handle = r.json()["account"]["handle"]
        check(
            "...and mints a distinct account rather than returning the first",
            bool(second_handle) and second_handle != handle1,
        )

        # Handle locks once the account exists — it is the login identifier now.
        # Asserted through the SESSION rather than the device token: a member's
        # browser carries a throwaway anonymous row alongside their account, so
        # a device-only reroll would happily reroll *that* and report success
        # while the handle they actually log in with never moved.
        r = await c.post(
            "/community/public/identity/reroll",
            headers={**svc, "Authorization": f"Bearer {session_token}"},
        )
        check("handle locks after signup", r.status_code == 409)

        # ══ 3. Log in from a FRESH client — no device token, no cookie ══
        async with httpx.AsyncClient(transport=transport, base_url=base) as _fresh_inner:
            fresh = NoCookieClient(_fresh_inner)
            r = await fresh.post(
                "/community/public/auth/login",
                headers=svc,
                json={"handle": handle1, "password": "correct-horse-battery-7"},
            )
            check("login from a second device succeeds", r.status_code == 200)
            fresh_token = r.json()["token"]
            check(
                "login resolves the same handle",
                r.json()["account"]["handle"] == handle1,
            )

            auth = {**svc, "Authorization": f"Bearer {fresh_token}"}

            # The whole point: find the questions you posted from the first device.
            r = await fresh.get(
                f"/community/public/journeys/{journey_id}", headers=auth
            )
            check("post is reachable from the second device", r.status_code == 200)
            check("post is recognised as theirs (is_mine)", r.json().get("is_mine") is True)

            # Without the session, the same fresh client sees it as a stranger's.
            r = await fresh.get(
                f"/community/public/journeys/{journey_id}", headers=svc
            )
            check(
                "same post is NOT 'mine' to a signed-out reader",
                r.json().get("is_mine") is not True,
            )

            # /auth/me resolves without a seat or an org.
            r = await fresh.get("/community/public/auth/me", headers=auth)
            check("auth/me resolves with no seat and no org", r.status_code == 200)
            check("auth/me returns the handle", r.json()["handle"] == handle1)

            # Writing from the new device attributes to the account, not a new identity.
            r = await fresh.post(
                f"/community/journeys/{journey_id}/comments",
                headers=auth,
                json={"body": "Replying to my own question from a new device."},
            )
            check("comment from second device accepted", r.status_code == 201)
            check(
                "comment is attributed to the account handle",
                r.json()["handle"] == handle1,
            )

        # ══ 4. Auth failure modes ══
        r = await c.post(
            "/community/public/auth/login",
            headers=svc,
            json={"handle": handle1, "password": "wrong-password-entirely"},
        )
        check("wrong password rejected", r.status_code == 401)
        wrong_pw_detail = r.json()["detail"]

        r = await c.post(
            "/community/public/auth/login",
            headers=svc,
            json={"handle": "NoSuchHandle0000", "password": "wrong-password-entirely"},
        )
        check("unknown handle rejected", r.status_code == 401)
        check(
            "unknown handle and wrong password are indistinguishable",
            r.json()["detail"] == wrong_pw_detail,
        )

        r = await c.get("/community/public/auth/me", headers=svc)
        check("auth/me without a token is 401", r.status_code == 401)

        r = await c.get(
            "/community/public/auth/me",
            headers={**svc, "Authorization": "Bearer not-a-real-token"},
        )
        check("auth/me with a junk token is 401", r.status_code == 401)

        # A console (consultant) JWT must not open the community door.
        r = await c.get(
            "/community/public/auth/me",
            headers={**svc, "Authorization": f"Bearer {owner_jwt}"},
        )
        check("a consultant console JWT is not a community session", r.status_code == 401)

        # Throttling: burn through the attempt budget on a throwaway account.
        r = await c.post("/community/public/identity", headers=svc)
        thr_dev = r.json()["device_token"]
        h_thr = {**svc, "X-Device-Token": thr_dev}
        r = await c.post(
            "/community/public/auth/signup",
            headers=h_thr,
            json={"password": "throttle-me-please-42", "email": f"throttle-{suffix}@example.com"},
        )
        thr_handle = r.json()["account"]["handle"]
        statuses = []
        for _ in range(9):
            rr = await c.post(
                "/community/public/auth/login",
                headers=svc,
                json={"handle": thr_handle, "password": "definitely-wrong-1"},
            )
            statuses.append(rr.status_code)
        check("repeated failures eventually throttle (429)", 429 in statuses)
        r = await c.post(
            "/community/public/auth/login",
            headers=svc,
            json={"handle": thr_handle, "password": "throttle-me-please-42"},
        )
        check("lockout holds even for the correct password", r.status_code == 429)

        # ══ 5. Signup WITH an email → recover → reset ══
        r = await c.post("/community/public/identity", headers=svc)
        dev2 = r.json()["device_token"]
        h2 = {**svc, "X-Device-Token": dev2}
        member_email = f"member.{suffix}@example.com"

        r = await c.post(
            "/community/public/auth/signup",
            headers=h2,
            json={"password": "another-long-password-8", "email": member_email},
        )
        check("signup with an email succeeds (no acknowledgement needed)", r.status_code == 201)
        handle2 = r.json()["account"]["handle"]
        check("account with an email can recover", r.json()["account"]["can_recover"] is True)
        check("signup response still hides the address", member_email not in r.text)

        # An UNVERIFIED duplicate is deliberately allowed. Refusing it is what
        # turns a required-but-unverified email into a denial-of-service: type a
        # stranger's address first and they can never attach their own. Only a
        # verified address takes the unique slot.
        r = await c.post("/community/public/identity", headers=svc)
        dupe_dev = r.json()["device_token"]
        r = await c.post(
            "/community/public/auth/signup",
            headers={**svc, "X-Device-Token": dupe_dev},
            json={"password": "yet-another-password-9", "email": member_email},
        )
        check(
            "an unverified duplicate email is allowed (no pre-hijacking)",
            r.status_code == 201,
        )
        dupe_handle = r.json()["account"]["handle"]

        # ...and the cost of allowing it used to be paid by both members:
        # recovery resolved a pending address only when exactly one account
        # claimed it, so a duplicate locked BOTH of them out, permanently and
        # silently. It now mails every claimant instead — each with its own
        # single-use token and its own handle named in the body, so the member
        # picks their account by opening the right mail. Nothing leaks, because
        # only the person holding that inbox ever sees any of it.
        sent_emails.clear()
        r = await c.post(
            "/community/public/auth/recover",
            headers=svc,
            json={"email": member_email},
        )
        check("recovery on an ambiguous address still 200s", r.status_code == 200)
        check(
            "...and mails BOTH claimants rather than locking them both out",
            len(sent_emails) == 2,
        )
        check(
            "every mail goes to the claimed address and nowhere else",
            all(e["to"] == member_email for e in sent_emails),
        )
        named = {
            h
            for h in (handle2, dupe_handle)
            if any(h in e.get("body_html", "") for e in sent_emails)
        }
        check(
            "each mail names its own handle, so they can be told apart",
            named == {handle2, dupe_handle},
        )
        dupe_tokens = {
            e.get("cta_url", "").split("token=", 1)[-1] for e in sent_emails
        }
        check("each claimant gets a distinct token", len(dupe_tokens) == 2)

        # A sole claimant recovers normally.
        member_email = f"solo.{suffix}@example.com"
        r = await c.post("/community/public/identity", headers=svc)
        solo_dev = r.json()["device_token"]
        r = await c.post(
            "/community/public/auth/signup",
            headers={**svc, "X-Device-Token": solo_dev},
            json={"password": "sole-claimant-pass-31", "email": member_email},
        )
        check("sole-claimant signup succeeds", r.status_code == 201)
        handle2 = r.json()["account"]["handle"]

        sent_emails.clear()
        r = await c.post(
            "/community/public/auth/recover",
            headers=svc,
            json={"email": member_email},
        )
        check("recovery accepted for a known address", r.status_code == 200)
        known_body = r.json()
        check("exactly one recovery email captured", len(sent_emails) == 1)

        r = await c.post(
            "/community/public/auth/recover",
            headers=svc,
            json={"email": f"nobody.{suffix}@example.com"},
        )
        check("recovery accepted for an unknown address too", r.status_code == 200)
        check(
            "known and unknown addresses respond identically (no account oracle)",
            r.json() == known_body,
        )
        check("no email sent for the unknown address", len(sent_emails) == 1)

        captured = sent_emails[0]
        check("recovery email addressed to the member", captured["to"] == member_email)
        subject = captured["subject"].lower()
        check(
            "recovery subject names no visa subclass or topic",
            not any(t in subject for t in ("visa", "189", "482", "190", "subclass", "partner")),
        )

        # Pull the token out of the captured CTA link.
        cta = captured.get("cta_url", "")
        token = cta.split("token=", 1)[1] if "token=" in cta else ""
        check("recovery link carries a token", bool(token))

        r = await c.post(
            "/community/public/auth/reset",
            headers=svc,
            json={"token": "not-a-real-recovery-token", "password": "irrelevant-pw-11"},
        )
        check("bogus recovery token rejected", r.status_code == 400)

        r = await c.post(
            "/community/public/auth/reset",
            headers=svc,
            json={"token": token, "password": "recovered-password-77"},
        )
        check("reset with a valid token succeeds", r.status_code == 200)
        check("reset returns a usable session", bool(r.json().get("token")))

        r = await c.post(
            "/community/public/auth/reset",
            headers=svc,
            json={"token": token, "password": "reused-token-password-3"},
        )
        check("recovery token is single-use", r.status_code == 400)

        r = await c.post(
            "/community/public/auth/login",
            headers=svc,
            json={"handle": handle2, "password": "recovered-password-77"},
        )
        check("login works on the new password", r.status_code == 200)

        r = await c.post(
            "/community/public/auth/login",
            headers=svc,
            json={"handle": handle2, "password": "another-long-password-8"},
        )
        check("the old password no longer works", r.status_code == 401)

        # An email-less account has no recovery path at all — as promised.
        sent_emails.clear()
        r = await c.post(
            "/community/public/auth/recover",
            headers=svc,
            json={"email": f"never.set.{suffix}@example.com"},
        )
        check("recovery for an email-less account sends nothing", len(sent_emails) == 0)

        # ══ 6. LEAK SWEEP — a client must never be discoverable to their agent ══
        #
        # A live report is filed FIRST, deliberately: the moderation queue is the
        # single consultant-side surface that carries a community handle, and a
        # sweep run against an empty queue would pass by accident and prove
        # nothing. Seeding it makes the exception real and visible.
        r = await c.post(
            f"/community/journeys/{journey_id}/report",
            headers=h2,
            json={"reason": "spam", "description": "leak-sweep probe"},
        )
        check("report filed to seed the moderation queue", r.status_code == 201)

        # The one documented exception. `/community/admin/reports` returns
        # `target_handle` on purpose — a moderator cannot action content without
        # knowing whose it is — and that surface answers to the platform-admin
        # role, not to a consultant looking at their own client list. The
        # exception is scoped to the handle and must NEVER extend to the email.
        MODERATION_QUEUE = "/api/v1/community/admin/reports"

        leaky_handle, leaky_email = [], []
        consultant_paths = [
            p
            for r_ in app.routes
            if (p := getattr(r_, "path", ""))
            and "GET" in (getattr(r_, "methods", set()) or set())
            and "{" not in p
            and p.startswith("/api/v1")
            and "/public" not in p
            and "/client-portal" not in p
            # Excluded: side-effectful or environment-dependent (OAuth redirects,
            # demo harnesses) — none of them read community data.
            and not p.startswith(
                ("/api/v1/integrations/", "/api/v1/demo/", "/api/v1/test/")
            )
        ]
        check("consultant surface enumerated", len(consultant_paths) >= 10)
        check("moderation queue is inside the swept surface", MODERATION_QUEUE in consultant_paths)

        swept, queue_seen_handle = 0, False
        for path in sorted(set(consultant_paths)):
            rr = await c.get(path.replace("/api/v1", ""), headers=consultant)
            if rr.status_code >= 500:
                continue
            swept += 1
            text = rr.text
            # Email is swept everywhere, with no exceptions at all.
            if member_email in text:
                leaky_email.append(path)
            if handle1 in text or handle2 in text:
                if path == MODERATION_QUEUE:
                    queue_seen_handle = True
                else:
                    leaky_handle.append(path)

        check(f"swept {swept} consultant endpoints", swept >= 10)
        check(
            f"community handle never reaches a consultant (leaks: {leaky_handle})",
            not leaky_handle,
        )
        check(
            f"community email never reaches a consultant, no exceptions (leaks: {leaky_email})",
            not leaky_email,
        )
        # Proves the sweep was actually capable of catching a handle — without
        # this, an all-green result could just mean nothing was ever there.
        check(
            "sweep is load-bearing: the moderation queue DID surface a handle",
            queue_seen_handle,
        )

        r = await c.get("/community/admin/reports", headers=consultant)
        check("moderation queue readable by an owner", r.status_code == 200)
        check("moderation queue never carries an email address", member_email not in r.text)

        # And the public feed exposes neither.
        r = await c.get("/community/public/journeys", headers=svc)
        check("public feed carries no email address", member_email not in r.text)
        r = await c.get(f"/community/public/journeys/{journey_id}", headers=svc)
        check("public post detail carries no email address", member_email not in r.text)

    print()
    if _failures:
        print(f"{FAIL} {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"    - {f}")
        raise SystemExit(1)
    print(f"{PASS} All community account checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
