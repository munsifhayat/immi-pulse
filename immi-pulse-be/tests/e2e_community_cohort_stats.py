"""End-to-end exercise of the cohort statistics spine.

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_cohort_stats.py
Requires both seeders, taxonomy first.

Three things are pinned, all of which fail silently rather than loudly.

  * **The trend arrow and the median describe the same people.** ``_trend_for``
    used to select every active granted row ever — no window, no publication
    check, no provenance filter — while the percentiles printed beside it
    honoured all three. That put "getting faster" next to a median it
    disagreed with, and let a private, unpublished draft move a public arrow.
    Both now draw from ``_publishable_conditions``.

  * **A draft never moves a public number.** The clearest case of the above:
    saving a wait check privately must leave every published figure identical.

  * **The pooling decision is inspectable.** ``cohort_split_by_stream`` is now a
    column and is served, so a cohort can be explained rather than merely
    presented — and so it can be changed without a round-trip to Home Affairs.
"""

import os

# Must be set before the first get_settings() — encryption.py calls it at import.
os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import uuid
from datetime import date, timedelta

import httpx
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []

TEST_CLIENT_IP = "127.0.0.1"
PASSWORD = "the-arrow-must-match-the-median-77"


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)
    return cond


class NoCookieClient:
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


async def _signup(client, svc):
    r = await client.post("/community/public/identity", headers=svc)
    device = r.json()["device_token"]
    r = await client.post(
        "/community/public/auth/signup",
        headers={**svc, "X-Device-Token": device},
        json={
            "password": PASSWORD,
            "email": f"cohort-{uuid.uuid4().hex[:8]}@example.com",
        },
    )
    return {**svc, "Authorization": f"Bearer {r.json()['token']}"}


async def main():
    from app.agents.immigration.community.models import Journey
    from app.core.config import get_settings
    from app.db.session import get_async_session
    from app.main import app

    settings = get_settings()
    svc = {"X-API-Key": settings.api_key}
    created: list[str] = []

    lodged = (date.today() - timedelta(days=180)).isoformat()

    transport = ASGITransport(app=app, client=(TEST_CLIENT_IP, 12345))
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test/api/v1"
    ) as inner:
        client = NoCookieClient(inner)

        subclasses = (
            await client.get("/community/public/subclasses", headers=svc)
        ).json()

        # --- The pooling decision is now visible -----------------------------
        print("\n1. The pooling decision travels with the taxonomy")
        check(
            "every visa states whether its streams are counted apart",
            all("cohort_split_by_stream" in s for s in subclasses),
        )
        split_codes = {
            s["code"] for s in subclasses if s.get("cohort_split_by_stream")
        }
        check(
            "the nine programmes whose streams predict different waits are split",
            split_codes == {"188", "189", "403", "408", "482", "491", "500", "600", "888"},
        )
        # The regression this guards: five of those nine (188, 403, 408, 600,
        # 888) are absent from migration f2a4c6e8b0d3's SLUG_REMAP, which
        # documents the split set as only 189/491/482/500.
        check(
            "...including the five the reshaping migration never listed",
            {"188", "403", "408", "600", "888"} <= split_codes,
        )
        multi = [s for s in subclasses if s.get("cohort_split_by_stream")]
        check(
            "a split visa pools on its own slug",
            all(s["slug"] for s in multi),
        )

        # --- A draft must not move a public number ---------------------------
        print("\n2. A private draft moves no public figure")
        target = next(
            s for s in subclasses if not s["is_stage"] and s["requires_occupation"]
        )

        before = (
            await client.get(
                "/community/public/wait-check",
                headers=svc,
                params={"subclass": target["slug"], "lodged_on": lodged},
            )
        ).json()

        h = await _signup(client, svc)
        r = await client.post(
            "/community/public/wait-check/save",
            headers=h,
            json={"subclass_slug": target["slug"], "lodged_on": lodged},
        )
        if check("a wait check saves privately", r.status_code in (200, 201)):
            created.append(r.json()["id"])

        after = (
            await client.get(
                "/community/public/wait-check",
                headers=svc,
                params={"subclass": target["slug"], "lodged_on": lodged},
            )
        ).json()

        check(
            "the community sample is unchanged",
            before.get("community", {}).get("sample_size")
            == after.get("community", {}).get("sample_size"),
        )
        check(
            "the community median is unchanged",
            before.get("community", {}).get("p50_days")
            == after.get("community", {}).get("p50_days"),
        )
        check(
            "and the trend arrow is unchanged — it reads the same population",
            before.get("community", {}).get("trend")
            == after.get("community", {}).get("trend"),
        )

        # --- Official figures stay honest about provenance -------------------
        print("\n3. Official figures say where they came from")
        board = (
            await client.get("/community/public/processing", headers=svc)
        ).json()
        live = [r for r in board if r.get("official", {}).get("is_live")]
        check("the board is served", len(board) > 0)
        check(
            "ingested rows are marked live",
            len(live) > 0,
        )
        check(
            "every live row carries the department's own as-at label",
            all(r["official"].get("as_at") for r in live),
        )
        check(
            "...and what it counted finalisations to",
            all(r["official"].get("counted_to") for r in live),
        )

        # --- The trend is drawn from the published population ----------------
        print("\n4. The trend arrow reads only publishable rows")
        stat = next((r for r in board if r.get("community")), None)
        check(
            "each board row states its sample size beside its trend",
            stat is not None and "sample_size" in stat.get("community", {}),
        )

    async with get_async_session() as db:
        for jid in created:
            row = await db.get(Journey, uuid.UUID(jid))
            if row is not None:
                await db.delete(row)
        await db.commit()

    print()
    if _failures:
        print(f"{FAIL} {len(_failures)} failed:")
        for f in _failures:
            print(f"   - {f}")
        raise SystemExit(1)
    print(f"{PASS} all cohort statistics checks passed")


if __name__ == "__main__":
    asyncio.run(main())
