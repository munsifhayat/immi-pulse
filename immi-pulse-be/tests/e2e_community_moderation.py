"""End-to-end exercise of the community moderation + admin-gate flow (C1 + C7).

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_moderation.py

Drives the HTTP surface in-process via httpx ASGITransport:

  bootstrap identity -> share a granted timeline (feeds the stats) -> comment on
  it from a 2nd device -> report the comment -> admin (owner JWT) hides it ->
  comment disappears -> report the post -> admin removes it -> post disappears
  AND its timeline stops feeding the processing-time stats. Plus: the admin queue
  rejects a caller holding only the public API key (no owner JWT).
"""

import os

os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import uuid
from datetime import date, timedelta

import httpx
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)


async def main():
    from app.agents.immigration.community.service import hash_ip, reset_rate_counters
    from app.agents.immigration.orgs.models import Organization, Seat
    from app.agents.immigration.users.models import User
    from app.core.config import get_settings
    from app.core.jwt_auth import issue_token
    from app.db.session import get_async_session
    from app.main import app

    settings = get_settings()
    suffix = uuid.uuid4().hex[:8]

    # ── Clear this machine's IP write-allowance buckets ──
    # Rate counters are durable now (Phase 2), and every ASGITransport request
    # reports as 127.0.0.1 — so without this, a handful of runs in one UTC day
    # would exhaust the network ceiling and this script would start failing on
    # its own history rather than on anything it tests.
    async with get_async_session() as db:
        await reset_rate_counters(db, scope_type="ip", scope_key=hash_ip("127.0.0.1"))
        await db.commit()

    # ── Seed an owner user/seat/org so we can call the admin endpoints ──
    async with get_async_session() as db:
        org = Organization(name=f"Mod Test Org {suffix}", country="AU")
        db.add(org)
        await db.flush()
        user = User(email=f"mod.{suffix}@firm.com", first_name="Mod", last_name="Erator")
        db.add(user)
        await db.flush()
        seat = Seat(org_id=org.id, user_id=user.id, role="owner", status="active")
        db.add(seat)
        await db.commit()
        owner_jwt = issue_token(user.id, seat.id, org.id)

    api_key = settings.api_key
    transport = ASGITransport(app=app)
    base = "http://test/api/v1"

    async with httpx.AsyncClient(transport=transport, base_url=base) as c:
        svc = {"X-API-Key": api_key}
        admin = {"X-API-Key": api_key, "Authorization": f"Bearer {owner_jwt}"}

        # ── 0. Pick a real subclass slug ──
        r = await c.get("/community/public/subclasses", headers=svc)
        subclasses = r.json()
        check("subclasses seeded", r.status_code == 200 and len(subclasses) > 0)
        subclass = subclasses[0]
        slug = subclass["slug"]

        # Skilled subclasses require a coded occupation on every published
        # timeline, and this file's first subclass is one. Resolved from the API
        # rather than hardcoded so a change in sort order cannot silently turn
        # these moderation checks into occupation checks.
        occupation_slug = None
        if subclass["requires_occupation"]:
            r = await c.get(
                "/community/public/occupations",
                params={"subclass": slug, "limit": 1},
                headers=svc,
            )
            rows = r.json()
            check("an occupation is available for the chosen subclass", bool(rows))
            occupation_slug = rows[0]["slug"] if rows else None

        def community_sample(processing_rows, s):
            for row in processing_rows:
                if row["slug"] == s:
                    return row["community"]["sample_size"]
            return 0

        r = await c.get("/community/public/processing", headers=svc)
        base_sample = community_sample(r.json(), slug)

        # ── 1. Bootstrap two anonymous identities (two devices) ──
        # Bootstrap now also sets a durable HttpOnly ``ip_device`` cookie, and one
        # httpx client keeps one cookie jar — so without clearing it the second
        # call would correctly return the *same* identity (one browser, one
        # device) and this would stop simulating two devices at all.
        r = await c.post("/community/public/identity", headers=svc)
        dev1 = r.json()["device_token"]
        check("identity 1 issued", bool(dev1))
        c.cookies.clear()

        r = await c.post("/community/public/identity", headers=svc)
        dev2 = r.json()["device_token"]
        check("identity 2 issued", bool(dev2) and dev2 != dev1)
        c.cookies.clear()

        h1 = {**svc, "X-Device-Token": dev1}
        h2 = {**svc, "X-Device-Token": dev2}

        # ── 2. Device 1 shares a GRANTED timeline → materialises a stats row ──
        lodged = (date.today() - timedelta(days=200)).isoformat()
        granted = (date.today() - timedelta(days=20)).isoformat()
        payload = {
            "publish": True,
            "post_type": "timeline",
            "subclass_slug": slug,
            "occupation_slug": occupation_slug,
            "outcome": "granted",
            "note": "Test timeline for moderation e2e.",
            "milestones": [
                {"milestone_type": "Visa Lodged", "occurred_on": lodged},
                {"milestone_type": "Visa Granted", "occurred_on": granted},
            ],
        }
        r = await c.post("/community/journeys", headers=h1, json=payload)
        check("timeline post created", r.status_code == 201)
        journey_id = r.json()["id"]

        r = await c.get("/community/public/processing", headers=svc)
        after_post_sample = community_sample(r.json(), slug)
        check(
            "post feeds the processing stats (sample +1)",
            after_post_sample == base_sample + 1,
        )

        # ── 3. Device 2 comments on the timeline ──
        r = await c.post(
            f"/community/journeys/{journey_id}/comments",
            headers=h2,
            json={"body": "This is a test comment that will be reported."},
        )
        check("comment created", r.status_code == 201)
        comment_id = r.json()["id"]

        r = await c.get(f"/community/public/journeys/{journey_id}", headers=svc)
        check("comment visible in detail", len(r.json()["messages"]) == 1)

        # ── 4. Report the comment (journey_comment) ──
        r = await c.post(
            f"/community/comments/{comment_id}/report",
            headers=h1,
            json={"reason": "harassment", "description": "test report on comment"},
        )
        check("comment report accepted", r.status_code == 201)
        check("report target_type is journey_comment", r.json()["target_type"] == "journey_comment")

        # ── 5. C7: admin queue rejects the public key alone (no owner JWT) ──
        r = await c.get("/community/admin/reports", headers=svc)
        check("admin queue blocks public-key-only caller (C7)", r.status_code in (401, 403))

        # ── 6. Owner JWT sees the enriched queue ──
        r = await c.get("/community/admin/reports", headers=admin)
        check("admin queue readable with owner JWT", r.status_code == 200)
        reports = r.json()
        comment_report = next(
            (x for x in reports if x["target_id"] == comment_id), None
        )
        check("comment report present in queue", comment_report is not None)
        check(
            "queue shows the reported content preview",
            bool(comment_report and comment_report.get("target_preview")),
        )

        # ── 7. Hide the comment → it disappears from the public detail ──
        r = await c.post(
            f"/community/admin/reports/{comment_report['id']}/action",
            headers=admin,
            json={"action": "hide"},
        )
        check("hide action succeeds", r.status_code == 200)

        r = await c.get(f"/community/public/journeys/{journey_id}", headers=svc)
        check("hidden comment gone from detail", len(r.json()["messages"]) == 0)

        # ── 8. Report the post (journey) and REMOVE it ──
        r = await c.post(
            f"/community/journeys/{journey_id}/report",
            headers=h2,
            json={"reason": "misleading_advice", "description": "test report on post"},
        )
        check("journey report accepted", r.status_code == 201)
        check("report target_type is journey", r.json()["target_type"] == "journey")
        journey_report_id = r.json()["id"]

        # find the enriched report row id from the queue
        r = await c.get("/community/admin/reports", headers=admin)
        jr = next((x for x in r.json() if x["target_id"] == journey_id), None)
        check("journey report present in queue", jr is not None)

        r = await c.post(
            f"/community/admin/reports/{jr['id']}/action",
            headers=admin,
            json={"action": "remove", "note": "removed in e2e"},
        )
        check("remove action succeeds", r.status_code == 200)

        # ── 9. The post is gone from the feed + detail 404s ──
        r = await c.get("/community/public/journeys", headers=svc)
        ids = [j["id"] for j in r.json()]
        check("removed post gone from feed", journey_id not in ids)

        r = await c.get(f"/community/public/journeys/{journey_id}", headers=svc)
        check("removed post detail 404s", r.status_code == 404)

        # ── 10. Stats no longer count the removed timeline ──
        r = await c.get("/community/public/processing", headers=svc)
        final_sample = community_sample(r.json(), slug)
        check(
            "removed post no longer feeds the stats (sample back to base)",
            final_sample == base_sample,
        )

    print()
    if _failures:
        print(f"{FAIL} {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"    - {f}")
        raise SystemExit(1)
    print(f"{PASS} All moderation + admin-gate checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
