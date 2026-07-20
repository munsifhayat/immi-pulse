"""End-to-end exercise of the adaptive share form, its context fields, and consent.

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_adaptive_form.py
Requires both seeders, in this order:
    PYTHONPATH=src python scripts/seed_visa_taxonomy.py
    PYTHONPATH=src python scripts/seed_occupations.py

Four things are pinned here, each of which fails silently if it regresses.

  * **Nationality never leaves the building.** It is collected for cohort
    matching and excluded from every public payload. A pseudonymous timeline
    plus a nationality plus a lodgement date re-identifies people inside a small
    cohort, and this community is full of members whose visa status is not safe
    to attach to that. The check greps whole response bodies rather than named
    keys, so adding it to a nested serializer is caught too.

  * **Hidden means not stored.** A field the visa does not ask for is dropped
    server-side, not merely hidden by the client. A stale tab or a direct API
    call would otherwise write "Regional" onto a partner visa and pool that
    timeline into a distinction that does not exist for it.

  * **Consent is stated, never inferred.** ``publish`` is required with no
    default. It used to default to true, which meant a caller that forgot the
    argument published somebody's visa timeline to a public feed.

  * **Timelines run forwards.** A milestone dated before the one above it is a
    typo — "EOI submitted: 06 Nov 2026" against a July 2026 grant is a real
    example from the wild — and unlike most dirty data it is observable.
"""

import os

# Must be set before the first get_settings() — encryption.py calls it at import.
os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import json
import uuid
from datetime import date, timedelta

import httpx
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []

TEST_CLIENT_IP = "127.0.0.1"
PASSWORD = "a-form-that-adapts-to-you-91"

# A nonsense token so a substring search over a response body cannot collide
# with ordinary content.
SECRET_NATIONALITY = "Zzyzxian"


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
    """Fresh device -> claimed account. Returns auth headers."""
    r = await client.post("/community/public/identity", headers=svc)
    device = r.json()["device_token"]
    r = await client.post(
        "/community/public/auth/signup",
        headers={**svc, "X-Device-Token": device},
        json={
            "password": PASSWORD,
            "email": f"adaptive-{uuid.uuid4().hex[:8]}@example.com",
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

    lodged = (date.today() - timedelta(days=200)).isoformat()
    granted = (date.today() - timedelta(days=20)).isoformat()

    transport = ASGITransport(app=app, client=(TEST_CLIENT_IP, 12345))
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test/api/v1"
    ) as inner:
        client = NoCookieClient(inner)

        subclasses = (
            await client.get("/community/public/subclasses", headers=svc)
        ).json()
        by_slug = {s["slug"]: s for s in subclasses}

        # A visa that needs everything, and one that needs nothing. Chosen from
        # the served reference data rather than hardcoded, so the test follows
        # the seeder rather than duplicating its policy.
        skilled = next(
            s
            for s in subclasses
            if s["requires_occupation"] and s["requires_state_nomination"]
        )
        simple = next(
            s
            for s in subclasses
            if not s["requires_occupation"]
            and not s["requires_state_nomination"]
            and not s["is_stage"]
        )

        # --- The reference data drives the form ------------------------------
        print("\n1. The visa says which questions apply")
        check(
            "some visas nominate an occupation and some do not",
            any(s["requires_occupation"] for s in subclasses)
            and any(not s["requires_occupation"] for s in subclasses),
        )
        check(
            "metro/regional is scoped to the regional visas only",
            {s["code"] for s in subclasses if s["requires_region"]}
            == {"190", "491", "494"},
        )
        check(
            "accredited sponsorship is scoped to 482 and 186 only",
            {s["code"] for s in subclasses if s["requires_sponsor_type"]}
            == {"482", "186"},
        )
        check(
            f"a visitor-style visa ({simple['code']}) asks for no occupation",
            simple["requires_occupation"] is False,
        )

        # --- Consent is explicit ---------------------------------------------
        print("\n2. Consent is stated, never inferred")
        r = await client.post(
            "/community/journeys",
            headers=await _signup(client, svc),
            json={
                "post_type": "question",
                "title": f"Does omitting publish default to public? {uuid.uuid4().hex[:6]}",
                "note": "It must not — that is the whole point of this check.",
            },
        )
        check(
            "a payload with no 'publish' is refused rather than published",
            r.status_code == 422,
        )

        # --- Hidden means not stored -----------------------------------------
        print("\n3. A field the visa does not ask for is dropped, not stored")
        h = await _signup(client, svc)
        r = await client.post(
            "/community/journeys",
            headers=h,
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": simple["slug"],
                # All three are irrelevant to this visa and sent anyway, exactly
                # as a stale client or a direct API call would.
                "state": "NSW",
                "area": "regional",
                "sponsor_type": "accredited",
                "outcome": "granted",
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": lodged},
                    {"milestone_type": "Visa Granted", "occurred_on": granted},
                ],
            },
        )
        if check("a visitor-style timeline posts", r.status_code == 201):
            body = r.json()
            created.append(body["id"])
            check("...and the irrelevant state was dropped", body["state"] is None)
            check("...and the irrelevant area was dropped", body["area"] is None)
            check(
                "...and the irrelevant sponsor type was dropped",
                body["sponsor_type"] is None,
            )

        # --- Context fields round-trip, except the private one ---------------
        print("\n4. Context fields round-trip — except the one that must not")
        occ = (
            await client.get(
                "/community/public/occupations",
                headers=svc,
                params={"subclass": skilled["code"], "q": "accountant"},
            )
        ).json()
        occ_slug = (occ[0] if isinstance(occ, list) else occ["items"][0])["slug"]

        h = await _signup(client, svc)
        r = await client.post(
            "/community/journeys",
            headers=h,
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": skilled["slug"],
                "occupation_slug": occ_slug,
                "state": "VIC",
                "lodgement_location": "offshore",
                "nationality": SECRET_NATIONALITY,
                "lodged_via": "agent",
                "direct_grant": True,
                "outcome": "granted",
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": lodged},
                    {"milestone_type": "Visa Granted", "occurred_on": granted},
                ],
            },
        )
        if check("a skilled timeline with full context posts", r.status_code == 201):
            body = r.json()
            created.append(body["id"])
            jid = body["id"]
            check("onshore/offshore round-trips", body["lodgement_location"] == "offshore")
            check("self-vs-agent round-trips", body["lodged_via"] == "agent")
            check("the 'no CO contact' assertion round-trips", body["direct_grant"] is True)
            check("the nominated occupation is coded", bool(body["occupation_code"]))
            check(
                "elapsed time is computed for the member, never asked of them",
                body["processing_days"] is not None,
            )

            # The privacy check: whole-body substring, not a named key, so a
            # nationality leaking through any nested serializer is caught.
            print("\n5. Nationality is collected and never published")
            surfaces = {
                "the create response": r,
                "the public feed": await client.get(
                    "/community/public/journeys", headers=svc
                ),
                "the post's own detail": await client.get(
                    f"/community/public/journeys/{jid}", headers=svc
                ),
                "the author's own view": await client.get(
                    "/community/journeys", headers=h
                ),
            }
            for label, resp in surfaces.items():
                if resp.status_code != 200 and resp is not r:
                    continue
                check(
                    f"{label} carries no nationality",
                    SECRET_NATIONALITY not in json.dumps(resp.json()),
                )

            # ...but it did reach the database, or we collected nothing.
            async with get_async_session() as db:
                row = await db.get(Journey, uuid.UUID(jid))
                check(
                    "...yet it was stored, so cohort matching can use it",
                    row is not None and row.nationality == SECRET_NATIONALITY,
                )

        # --- Timelines run forwards ------------------------------------------
        print("\n6. A timeline that runs backwards is a typo, not data")
        r = await client.post(
            "/community/journeys",
            headers=await _signup(client, svc),
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": skilled["slug"],
                "occupation_slug": occ_slug,
                "outcome": "granted",
                "milestones": [
                    # The real-world shape: a grant, then an EOI dated after it.
                    {"milestone_type": "Visa Lodged", "occurred_on": granted},
                    {"milestone_type": "EOI Submitted", "occurred_on": lodged},
                ],
            },
        )
        check("out-of-order milestones are refused", r.status_code == 422)

        r = await client.post(
            "/community/journeys",
            headers=await _signup(client, svc),
            json={
                "publish": True,
                "post_type": "timeline",
                "subclass_slug": skilled["slug"],
                "occupation_slug": occ_slug,
                "outcome": "waiting",
                "milestones": [
                    {"milestone_type": "Visa Lodged", "occurred_on": lodged},
                    {"milestone_type": "Medical Examination", "occurred_on": lodged},
                ],
            },
        )
        if check("two milestones on the same day are fine", r.status_code == 201):
            created.append(r.json()["id"])

        # --- The draft back door is closed -----------------------------------
        print("\n7. A draft cannot reach the feed uncoded")
        h = await _signup(client, svc)
        r = await client.post(
            "/community/public/wait-check/save",
            headers=h,
            json={"subclass_slug": skilled["slug"], "lodged_on": lodged},
        )
        if check(
            "a wait check still saves privately with no occupation",
            r.status_code in (200, 201),
        ):
            draft_id = r.json()["id"]
            created.append(draft_id)
            check("...and it is a draft", r.json()["is_published"] is False)

            r = await client.post(
                f"/community/public/journeys/{draft_id}/publish",
                headers=h,
                json={"consent_public": True},
            )
            check(
                "...but publishing it without an occupation is refused",
                r.status_code == 400,
            )
            check(
                "...and the refusal names what to add",
                "occupation" in r.text.lower(),
            )

            # The way through: supply it at publication. Asking for it at *save*
            # time would put a question in front of the one action that has to
            # stay frictionless.
            r = await client.post(
                f"/community/public/journeys/{draft_id}/publish",
                headers=h,
                json={"consent_public": True, "occupation_slug": occ_slug},
            )
            if check(
                "...and supplying it at publish time lets it through",
                r.status_code == 200,
            ):
                check("...the draft is now public", r.json()["is_published"] is True)
                check(
                    "...and it carries the resolved ANZSCO code",
                    bool(r.json()["occupation_code"]),
                )

    # --- Cleanup -------------------------------------------------------------
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
    print(f"{PASS} all adaptive-form, privacy and consent checks passed")


if __name__ == "__main__":
    asyncio.run(main())
