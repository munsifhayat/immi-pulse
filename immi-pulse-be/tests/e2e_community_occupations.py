"""End-to-end exercise of the coded ANZSCO occupation list (714 occupations).

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_occupations.py
Requires both seeders, in this order:
    PYTHONPATH=src python scripts/seed_visa_taxonomy.py
    PYTHONPATH=src python scripts/seed_occupations.py

Covers what replaced an 80-character free-text box placeheld "e.g. Nurse,
Developer", and pins the four things most likely to regress quietly:

  * **Filter by subclass.** A 189 applicant sees the 212 occupations they can
    nominate, not all 714. The competing tracker ships one flat alphabetical
    list for every visa, which is how you end up choosing between "Aboriginal
    and Torres Strait Islander Education Worker" and 713 others for a 482.

  * **The two-version trap.** Home Affairs runs ANZSCO 2022 for subclass 186 and
    482 and ANZSCO 2013 for every other skilled subclass. 416 occupations carry
    both codes and 409 agree, so a wrong edition is invisible until one of the
    **7 that differ** — Arborist, Flower Grower, Landscape Gardener, Management
    Consultant, Plumber (General), Statistician, Zoologist. Every one of those
    seven is asserted here in both editions, because this is the failure that
    would never show up in manual testing and would be permanently wrong in the
    data.

  * **Required means required, hidden means hidden.** A published timeline on a
    subclass with ``requires_occupation`` must carry one. A subclass without —
    600 Tourist, partner visas — must neither ask for one nor store one, because
    a guessed occupation pools that timeline into a cohort it has no business in.

  * **Typeahead matches the ANZSCO code as well as the name.** Members who know
    their code know it better than the department's phrasing of their job title.
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

TEST_CLIENT_IP = "127.0.0.1"
PASSWORD = "anzsco-is-not-free-text-88"

# The seven occupations whose 2013 and 2022 codes disagree. Everything else in
# the dataset is identical across editions, which is exactly what makes these
# dangerous: pick one edition and 707 rows will tell you it works.
DIVERGENT = {
    "Arborist": ("362212", "362511"),
    "Flower Grower": ("121212", "121611"),
    "Landscape Gardener": ("362213", "362711"),
    "Management Consultant": ("224711", "224713"),
    "Plumber (General)": ("334111", "334116"),
    "Statistician": ("224113", "224116"),
    "Zoologist": ("234518", "234522"),
}


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

    An account, not a bare device: the timeline cap is per-device and these
    checks post several timelines.
    """
    r = await client.post("/community/public/identity", headers=svc)
    device = r.json()["device_token"]
    r = await client.post(
        "/community/public/auth/signup",
        headers={**svc, "X-Device-Token": device},
        json={
            "password": PASSWORD,
            "email": f"occupations-{uuid.uuid4().hex[:8]}@example.com",
        },
    )
    return {**svc, "Authorization": f"Bearer {r.json()['token']}"}


async def main():
    from app.agents.immigration.community.models import Journey
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
        allrows = (
            await client.get("/community/public/occupations", headers=svc)
        ).json()
        check("the full skilled occupation list is published", len(allrows) == 714)
        check(
            "every occupation carries at least one ANZSCO code",
            all(r["anzsco_2013_code"] or r["anzsco_2022_code"] for r in allrows),
        )
        check(
            "every occupation carries a major group for the picker to group on",
            all(r["major_group_code"] for r in allrows),
        )
        groups = {r["major_group_name"] for r in allrows}
        check(
            "occupations span six ANZSCO major groups, none of them 'Other'",
            len(groups) == 6 and "Other" not in groups,
        )
        check(
            "Professionals is the largest group",
            max(groups, key=lambda g: sum(1 for r in allrows if r["major_group_name"] == g))
            == "Professionals",
        )
        check(
            "skills-assessment authority is stored even though nothing renders it",
            sum(1 for r in allrows if r["assessing_authority"]) == 690,
        )

        # --- Filter by subclass ----------------------------------------------
        print("\nFilter by subclass")
        by_189 = (
            await client.get(
                "/community/public/occupations",
                params={"subclass": "189-points-tested"},
                headers=svc,
            )
        ).json()
        check("189 is filtered down from 714", 0 < len(by_189) < len(allrows))
        check(
            "every row returned for 189 is actually eligible for 189",
            all("189" in r["eligible_subclasses"] for r in by_189),
        )

        by_186 = (
            await client.get(
                "/community/public/occupations",
                params={"subclass": "186-direct-entry"},
                headers=svc,
            )
        ).json()
        check(
            "186 and 189 return genuinely different lists",
            len(by_186) != len(by_189),
        )

        # The slug is what the picker holds; the bare number is what cohort_key
        # often holds. Both are in circulation, so both must work.
        by_number = (
            await client.get(
                "/community/public/occupations",
                params={"subclass": "189"},
                headers=svc,
            )
        ).json()
        check(
            "a bare subclass number filters identically to its slug",
            [r["slug"] for r in by_number] == [r["slug"] for r in by_189],
        )

        # A subclass with no nominated occupation must not be silently handed
        # the whole list — that is how a 600 Tourist ends up with an ANZSCO code.
        subclasses = (
            await client.get("/community/public/subclasses", headers=svc)
        ).json()
        by_slug = {s["slug"]: s for s in subclasses}
        visitor = next(s for s in subclasses if s["code"] == "600")
        check(
            "600 Tourist does not require an occupation",
            visitor["requires_occupation"] is False,
        )
        check(
            "no ANZSCO edition is claimed for a visa with no occupation",
            visitor["anzsco_version"] is None,
        )
        by_600 = (
            await client.get(
                "/community/public/occupations",
                params={"subclass": visitor["slug"]},
                headers=svc,
            )
        ).json()
        check("600 Tourist matches no occupations at all", by_600 == [])

        # --- The two-version trap --------------------------------------------
        print("\nANZSCO editions (the two-version trap)")
        check(
            "186 reads the 2022 edition",
            by_slug["186-direct-entry"]["anzsco_version"] == "2022",
        )
        check(
            "482 reads the 2022 edition",
            by_slug["482-core-skills"]["anzsco_version"] == "2022",
        )
        check(
            "189 reads the 2013 edition",
            by_slug["189-points-tested"]["anzsco_version"] == "2013",
        )
        check(
            "491 reads the 2013 edition",
            by_slug["491-state-or-territory-nominated"]["anzsco_version"] == "2013",
        )

        # Resolve each divergent occupation under both editions and assert the
        # server hands back the right code for the right visa.
        for name, (code_2013, code_2022) in DIVERGENT.items():
            r186 = (
                await client.get(
                    "/community/public/occupations",
                    params={"subclass": "186-direct-entry", "q": name},
                    headers=svc,
                )
            ).json()
            r189 = (
                await client.get(
                    "/community/public/occupations",
                    params={"subclass": "189-points-tested", "q": name},
                    headers=svc,
                )
            ).json()
            hit186 = next((r for r in r186 if r["name"] == name), None)
            hit189 = next((r for r in r189 if r["name"] == name), None)
            check(
                f"{name}: 186 resolves to the 2022 code {code_2022}",
                hit186 is not None and hit186["anzsco_code"] == code_2022,
            )
            check(
                f"{name}: 189 resolves to the 2013 code {code_2013}",
                hit189 is None or hit189["anzsco_code"] == code_2013,
            )
            check(
                f"{name}: both editions travel so the divergence is inspectable",
                hit186 is not None
                and (hit186["anzsco_2013_code"], hit186["anzsco_2022_code"])
                == (code_2013, code_2022),
            )

        # --- Typeahead --------------------------------------------------------
        print("\nTypeahead")
        by_name = (
            await client.get(
                "/community/public/occupations",
                params={"subclass": "189-points-tested", "q": "nurse"},
                headers=svc,
            )
        ).json()
        check("a name query matches", len(by_name) > 0)
        check(
            "the name query is case-insensitive and matches anywhere in the name",
            all("nurse" in r["name"].lower() for r in by_name),
        )
        check(
            "'nurse' alone is many occupations — which is why free text failed",
            len(by_name) > 5,
        )

        by_code = (
            await client.get(
                "/community/public/occupations",
                params={"subclass": "189-points-tested", "q": "261313"},
                headers=svc,
            )
        ).json()
        check("an ANZSCO code query matches", len(by_code) == 1)
        check(
            "261313 is Software Engineer",
            by_code and by_code[0]["name"] == "Software Engineer",
        )

        partial = (
            await client.get(
                "/community/public/occupations",
                params={"q": "2613"},
                headers=svc,
            )
        ).json()
        check("a partial code prefix matches its whole unit group", len(partial) >= 3)

        nothing = (
            await client.get(
                "/community/public/occupations",
                params={"q": "zzzznotarealoccupation"},
                headers=svc,
            )
        ).json()
        check("an unmatched query returns empty, not everything", nothing == [])

        # --- The write path ---------------------------------------------------
        print("\nWrite path")
        # These checks post a dozen timelines from one IP; the anti-spam bucket
        # would refuse long before the interesting cases.
        async with get_async_session() as db:
            await reset_rate_counters(
                db, scope_type="ip", scope_key=hash_ip(TEST_CLIENT_IP)
            )
            await db.commit()
        auth = await _signup(client, svc)

        software_eng = next(
            r for r in by_189 if r["name"] == "Software Engineer"
        )

        # 1. Required subclass, no occupation -> refused.
        r = await client.post(
            "/community/journeys",
            headers=auth,
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": "189-points-tested",
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": "2025-06-01"}
                ],
            },
        )
        # 400, like every other reference-data refusal on this route (unknown
        # subclass, lodgement stage) — the member can fix it themselves.
        check(
            "a 189 timeline without an occupation is refused",
            r.status_code == 400,
        )
        check(
            "the refusal names the subclass rather than saying 'invalid'",
            "189" in r.text,
        )

        # 2. Required subclass, coded occupation -> accepted, code stamped.
        r = await client.post(
            "/community/journeys",
            headers=auth,
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": "189-points-tested",
                "occupation_slug": software_eng["slug"],
                "outcome": "granted",
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": "2025-06-01"},
                    {"milestone_type": "Visa Granted", "occurred_on": "2026-02-01"},
                ],
            },
        )
        created = r.json()
        check("a 189 timeline with a coded occupation is accepted", r.status_code == 201)
        if r.status_code == 201:
            created_journey_ids.append(created["id"])
            check(
                "the ANZSCO code is stamped from the 2013 edition",
                created["occupation_code"] == "261313",
            )
            check(
                "the display name is snapshotted from reference data",
                created["occupation"] == "Software Engineer",
            )

        # 3. An occupation not on the chosen visa's list -> refused. The picker
        #    filters, but the subclass can be changed after the occupation was
        #    picked, so the server cannot trust the pairing.
        only_186 = next(
            (
                r
                for r in by_186
                if "189" not in r["eligible_subclasses"]
            ),
            None,
        )
        check("there is an occupation 186 can nominate and 189 cannot", only_186 is not None)
        if only_186:
            r = await client.post(
                "/community/journeys",
                headers=auth,
                json={
                    "publish": True,
                    "post_type": "timeline",
                    "subclass_slug": "189-points-tested",
                    "occupation_slug": only_186["slug"],
                    "milestones": [
                        {"milestone_type": "Visa Lodged", "occurred_on": "2025-06-01"}
                    ],
                },
            )
            check(
                "an occupation off the chosen visa's list is refused",
                r.status_code == 400,
            )

        # 4. An unknown occupation slug -> refused, not silently dropped.
        r = await client.post(
            "/community/journeys",
            headers=auth,
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": "189-points-tested",
                "occupation_slug": "not-a-real-occupation",
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": "2025-06-01"}
                ],
            },
        )
        check("an unknown occupation slug is refused", r.status_code == 400)

        # 5. A visa with no nominated occupation needs nothing — and must not
        #    keep one if a client sends it anyway.
        r = await client.post(
            "/community/journeys",
            headers=auth,
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": visitor["slug"],
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": "2025-11-01"}
                ],
            },
        )
        check("a 600 Tourist timeline needs no occupation", r.status_code == 201)
        if r.status_code == 201:
            created_journey_ids.append(r.json()["id"])

        r = await client.post(
            "/community/journeys",
            headers=auth,
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": visitor["slug"],
                "occupation_slug": software_eng["slug"],
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": "2025-11-02"}
                ],
            },
        )
        check(
            "an occupation sent for a visa that has none is accepted but dropped",
            r.status_code == 201
            and r.json()["occupation"] is None
            and r.json()["occupation_code"] is None,
        )
        if r.status_code == 201:
            created_journey_ids.append(r.json()["id"])

        # 6. A question is not a timeline and never carries an occupation.
        r = await client.post(
            "/community/journeys",
            headers=auth,
            json={
                "publish": True,
                "post_type": "question",
                "subclass_slug": "189-points-tested",
                "title": "Does the 189 queue move in December?",
                "note": "Asking because my EOI has been sitting since June.",
            },
        )
        check("a question on a required subclass needs no occupation", r.status_code == 201)
        if r.status_code == 201:
            created_journey_ids.append(r.json()["id"])
            check(
                "a question carries no occupation",
                r.json()["occupation_code"] is None,
            )

        # 7. The draft path stays open. A saved wait check collects a subclass
        #    and a lodgement date and has no field to put an occupation in, so
        #    requiring one there would break saving rather than improve data.
        r = await client.post(
            "/community/public/wait-check/save",
            headers=auth,
            json={"subclass_slug": "189-points-tested", "lodged_on": "2025-08-01"},
        )
        check(
            "a wait-check draft on a required subclass still saves",
            r.status_code in (200, 201),
        )
        if r.status_code in (200, 201):
            created_journey_ids.append(r.json()["id"])

    # --- Cleanup -------------------------------------------------------------
    async with get_async_session() as db:
        for jid in created_journey_ids:
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
    print(f"{PASS} all occupation checks passed")


if __name__ == "__main__":
    asyncio.run(main())
