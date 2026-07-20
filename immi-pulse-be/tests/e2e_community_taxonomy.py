"""End-to-end exercise of the Home Affairs visa taxonomy (43 subclasses / 76 streams).

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_taxonomy.py
Requires the taxonomy to be seeded:  PYTHONPATH=src python scripts/seed_visa_taxonomy.py

Covers the behaviour that replaced 8 hand-seeded rows and a hardcoded 5-item
stream list, and pins the three things most likely to regress quietly:

  * ``group_key`` — not ``code`` — is what a picker groups on, because subclass
    858 is two different programs (Global Talent, National Innovation) whose
    waits differ by 3.5x and which are both streamless.
  * The **stream is snapshotted from reference data**, never from the client.
    The old form defaulted a free-text stream to "Direct Entry (DE)" for every
    visa on earth, so a 500 Student timeline claimed an employer-sponsorship
    stream. A client sending the wrong stream must be corrected, not obeyed.
  * ``cohort_key`` decides what the statistics pool on: 186's three streams sit
    within 10% of each other and share one cohort; 500's seven sectors span 35x
    and keep their own. Getting this backwards either splits a scarce sample for
    no signal or merges populations that have nothing to do with each other.
"""

import os

# Must be set before the first get_settings() — encryption.py calls it at import.
os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import uuid
from datetime import date

import httpx
import sqlalchemy as sa
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []

TEST_CLIENT_IP = "127.0.0.1"
PASSWORD = "streams-are-not-free-text-77"


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)
    return cond


class NoCookieClient:
    """Forgets cookies between calls so two devices stay two devices."""

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
    """Fresh device -> claimed account. Returns auth headers.

    An account, not a bare device: the timeline cap is per-device, and these
    checks post several timelines.
    """
    r = await client.post("/community/public/identity", headers=svc)
    device = r.json()["device_token"]
    r = await client.post(
        "/community/public/auth/signup",
        headers={**svc, "X-Device-Token": device},
        json={
            "password": PASSWORD,
            "email": f"taxonomy-{uuid.uuid4().hex[:8]}@example.com",
        },
    )
    return {**svc, "Authorization": f"Bearer {r.json()['token']}"}


async def main():
    from app.agents.immigration.community.models import CommunityTimeline, Journey
    from app.agents.immigration.community.service import hash_ip, reset_rate_counters
    from app.core.config import get_settings
    from app.db.session import get_async_session
    from app.main import app

    settings = get_settings()
    svc = {"X-API-Key": settings.api_key}
    created_journey_ids: list[str] = []

    transport = ASGITransport(app=app, client=(TEST_CLIENT_IP, 12345))
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test/api/v1"
    ) as inner:
        client = NoCookieClient(inner)

        # --- The catalogue ----------------------------------------------------
        print("\nCatalogue")
        rows = (await client.get("/community/public/subclasses", headers=svc)).json()
        check("76 subclass+stream rows are published", len(rows) == 76)

        groups = {r["group_key"] for r in rows}
        codes = {r["code"] for r in rows}
        check("group_key yields 43 picker groups", len(groups) == 43)
        check(
            "code alone would yield 42 — 858 is two programs, hence group_key",
            len(codes) == 42,
        )

        g858 = sorted(
            (r["group_key"], r["name"]) for r in rows if r["code"] == "858"
        )
        check(
            "858 splits into Global Talent and National Innovation",
            len(g858) == 2 and g858[0][0] != g858[1][0],
        )

        stages = [r for r in rows if r["is_stage"]]
        check(
            "3 lodgement stages are flagged, not offered as streams",
            len(stages) == 3
            and {r["slug"] for r in stages}
            == {"482-nomination", "482-sponsorship", "870-sponsorship"},
        )

        by_slug = {r["slug"]: r for r in rows}
        check(
            "186 carries all three of its streams",
            {"186-direct-entry", "186-labour-agreement",
             "186-temporary-residence-transition"} <= by_slug.keys(),
        )
        check(
            "500 carries all seven education sectors",
            len([r for r in rows if r["code"] == "500"]) == 7,
        )
        check(
            "legacy slugs were remapped, not left behind",
            "189-independent" not in by_slug and "189-points-tested" in by_slug,
        )

        # --- Official figures -------------------------------------------------
        print("\nOfficial figures")
        wc = (
            await client.get(
                "/community/public/wait-check",
                params={"subclass": "482-core-skills", "lodged_on": "2026-04-01"},
                headers=svc,
            )
        ).json()
        off = wc["official"]
        check(
            "all four percentiles travel",
            all(off.get(k) is not None for k in ("p25_days", "p50_days", "p75_days", "p90_days")),
        )
        check("percentiles are monotonic", off["p25_days"] <= off["p50_days"] <= off["p75_days"] <= off["p90_days"])
        check("as_at is the department's own label", bool(off.get("as_at")))
        check(
            "counted_to is shipped — a June figure counts finalisations to May",
            bool(off.get("counted_to")),
        )
        check("is_live is true now that figures are ingested", off.get("is_live") is True)

        # --- Stages are not visas --------------------------------------------
        print("\nLodgement stages are refused on both paths")
        r = await client.get(
            "/community/public/wait-check",
            params={"subclass": "482-nomination", "lodged_on": "2026-01-15"},
            headers=svc,
        )
        check("wait-check on a stage 404s", r.status_code == 404)

        # --- The write path ---------------------------------------------------
        print("\nWrite path")
        auth = await _signup(client, svc)

        r = await client.post(
            "/community/journeys",
            headers=auth,
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": "482-nomination",
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": "2025-06-01"}
                ],
            },
        )
        check("posting a timeline against a stage is rejected", r.status_code >= 400)

        # 186 is employer-sponsored, so its timelines carry a coded occupation.
        # Resolved through the API rather than hardcoded — 186 reads the ANZSCO
        # 2022 edition and hardcoding a code here would encode that choice in
        # the wrong place.
        occ = (
            await client.get(
                "/community/public/occupations",
                params={"subclass": "186-temporary-residence-transition", "limit": 1},
                headers=svc,
            )
        ).json()
        check("186 offers occupations to nominate", len(occ) == 1)

        # A client that lies about its stream must be corrected from reference
        # data, not obeyed — this is the "every timeline says Direct Entry" bug.
        r = await client.post(
            "/community/journeys",
            headers=auth,
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": "186-temporary-residence-transition",
                "occupation_slug": occ[0]["slug"],
                "stream": "Direct Entry (DE)",
                "outcome": "granted",
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": "2025-06-01"},
                    {"milestone_type": "Visa Granted", "occurred_on": "2026-02-01"},
                ],
            },
        )
        created = r.json()
        created_journey_ids.append(created["id"])
        check("timeline accepted", r.status_code == 201)
        check(
            "client's wrong stream is overwritten from reference data",
            created["stream"] == "Temporary Residence Transition (TRT)",
        )
        check("processing_days derived from the milestones", created["processing_days"] == 245)

        # --- Cohort pooling vs splitting -------------------------------------
        print("\nCohort keys")
        async with get_async_session() as db:
            pooled = (
                await db.execute(
                    sa.text(
                        "select distinct cohort_key from visa_subclasses where code='186'"
                    )
                )
            ).scalars().all()
            check(
                "186's three streams pool on one cohort (spread is 1.1x)",
                set(pooled) == {"186"},
            )

            split = (
                await db.execute(
                    sa.text(
                        "select distinct cohort_key from visa_subclasses where code='500'"
                    )
                )
            ).scalars().all()
            check(
                "500's seven sectors keep their own cohorts (spread is 35x)",
                len(set(split)) == 7,
            )

            spine = (
                await db.execute(
                    sa.text(
                        "select subclass_slug from community_timelines "
                        "where journey_id = :jid"
                    ),
                    {"jid": created["id"]},
                )
            ).scalar_one_or_none()
            check(
                "the statistics spine stores the cohort key, not the picked slug",
                spine == "186",
            )

        # --- Cleanup ----------------------------------------------------------
        async with get_async_session() as db:
            for jid in created_journey_ids:
                await db.execute(
                    sa.delete(CommunityTimeline).where(
                        CommunityTimeline.journey_id == uuid.UUID(jid)
                    )
                )
                await db.execute(
                    sa.delete(Journey).where(Journey.id == uuid.UUID(jid))
                )
            await reset_rate_counters(
                db, scope_type="ip", scope_key=hash_ip(TEST_CLIENT_IP)
            )
            await db.commit()

    print()
    if _failures:
        print(f"{FAIL} {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"    - {f}")
        raise SystemExit(1)
    print(f"{PASS} All visa taxonomy checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
