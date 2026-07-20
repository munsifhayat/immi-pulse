"""End-to-end exercise of Wait Check ↔ timeline, and honest numbers (Phase 4).

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_waitcheck_save.py

Two things are under test and they pull in opposite directions.

**Wait Check must stay completely open.** It is the acquisition hook and the SEO
surface; a gate on it costs more than the data it collects. Section 1 calls it
with *no* API key, *no* session, *no* device token and *no* cookie jar, and
asserts a 200. If that ever fails, the funnel is broken no matter how good the
rest is.

**Saving must not publish.** A saved check is a private note. The single most
damaging bug this phase could ship is a timeline reaching the feed — or the
public median — because someone tapped "keep this". So the absence assertions
are the load-bearing ones here, and they are made against every public surface
independently rather than trusting one filter: the feed list, the feed summary
counts, the detail route as a stranger, the processing board, and the wait-check
figures themselves.

The rest follows the phase's honesty requirements: an n-floor that refuses to
publish a thin median, a 12-month window, an official block that always carries
its as-at date, and a provenance split on every Room figure — because
forum-collected timelines now count toward public statistics, and the condition
of that decision was that no figure they touch is ever a bare number.
"""

import os

# Must be set before the first get_settings() — encryption.py calls it at import.
os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import uuid
from datetime import date, timedelta

import httpx
import sqlalchemy as sa
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []

TEST_CLIENT_IP = "127.0.0.1"
PASSWORD = "wait-checks-become-timelines-42"


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)
    return cond


class NoCookieClient:
    """An httpx client that forgets cookies between calls.

    The backend sets a durable HttpOnly ``ip_device`` cookie; httpx's jar would
    replay it and quietly collapse "two different people" into "one device
    twice", which would make the ownership assertions below pass for the wrong
    reason. See tests/e2e_community_accounts.py.
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


async def _signup(client, svc):
    """Fresh device -> claimed account. Returns (auth headers, handle)."""
    r = await client.post("/community/public/identity", headers=svc)
    device = r.json()["device_token"]
    r = await client.post(
        "/community/public/auth/signup",
        headers={**svc, "X-Device-Token": device},
        json={"password": PASSWORD, "email": f"wcsave-{uuid.uuid4().hex[:8]}@example.com"},
    )
    payload = r.json()
    return (
        {**svc, "Authorization": f"Bearer {payload['token']}"},
        payload.get("account", {}).get("handle"),
    )


async def main():
    from app.agents.immigration.community.models import (
        TIMELINE_SOURCE_FORUM,
        CommunityTimeline,
        Journey,
        VisaSubclass,
    )
    from app.agents.immigration.community.service import hash_ip, reset_rate_counters
    from app.core.config import get_settings
    from app.db.session import get_async_session
    from app.main import app

    settings = get_settings()
    suffix = uuid.uuid4().hex[:8]
    svc = {"X-API-Key": settings.api_key}
    today = date.today()

    # Rate counters are durable (Phase 2) and every ASGITransport request reports
    # as 127.0.0.1, so without this reset a few runs in one UTC day would exhaust
    # the network ceiling and this script would fail on its own history.
    async with get_async_session() as db:
        await reset_rate_counters(db, scope_type="ip", scope_key=hash_ip(TEST_CLIENT_IP))
        await db.commit()

    # A private visa subclass, so every statistic asserted below is computed from
    # rows this script created and nothing else. Sharing a real subclass with the
    # seed data would make the numbers depend on whatever else is in the DB.
    slug = f"p4test-{suffix}"
    async with get_async_session() as db:
        db.add(
            VisaSubclass(
                id=uuid.uuid4(),
                slug=slug,
                code="P4T",
                name=f"Phase 4 Test Visa {suffix}",
                stream=None,
                category_slug=None,
                official_p50_days=180,
                official_p90_days=360,
                official_updated="Mar 2026",
                sort_order=9999,
                is_active=True,
            )
        )
        await db.commit()

    transport = ASGITransport(app=app)

    try:
        async with httpx.AsyncClient(
            transport=transport, base_url="http://test/api/v1"
        ) as _inner:
            c = NoCookieClient(_inner)

            # ══ 1. Wait Check is open to everyone — the contract that must not break
            print("\n1. Wait Check works with no account, no key, no device")
            lodged = today - timedelta(days=200)
            bare = await c.get(
                "/community/public/wait-check",
                params={"subclass": slug, "lodged_on": lodged.isoformat()},
            )
            check("no API key, no session, no device token → 200", bare.status_code == 200)
            wc = bare.json()
            check("it answers with a verdict", bool(wc.get("headline")))
            check("elapsed days computed from the lodgement date", wc["elapsed_days"] == 200)
            check(
                "unchanged legacy fields still present",
                all(
                    k in wc
                    for k in (
                        "tier",
                        "basis",
                        "detail",
                        "sample_size",
                        "pending",
                        "p50",
                        "official_p50_days",
                        "official_updated",
                    )
                ),
            )

            # ══ 2. Honest numbers on an empty room
            print("\n2. With no timelines, it says so and falls back to official")
            check("basis is official, not a fabricated community median", wc["basis"] == "official")
            check("sufficient is false", wc["sufficient"] is False)
            check("the floor is published, not hidden", wc["min_sample"] == 20)
            check("the window is published", wc["window_months"] == 12)
            check("nothing to describe → no provenance sentence", wc["provenance_note"] is None)
            check("provenance totals zero", wc["provenance"]["total"] == 0)

            print("\n   the official block always carries its as-at date")
            check("official block present", isinstance(wc.get("official"), dict))
            check("as-at date present", wc["official"]["as_at"] == "Mar 2026")
            check("p50 band present", wc["official"]["p50_days"] == 180)
            check(
                "is_live is false — figures are hand-seeded, never ingested",
                wc["official"]["is_live"] is False,
            )
            check("source attributed", "Home Affairs" in wc["official"]["source"])
            blob = (wc["detail"] + " " + str(wc["official"])).lower()
            check(
                "nothing claims the official figures are checked daily",
                not any(p in blob for p in ("checked daily", "updated daily", "live from")),
            )

            print("\n   the room block travels alongside, always")
            check("room block present", isinstance(wc.get("room"), dict))
            check("room reports its own emptiness", wc["room"]["sample_size"] == 0)
            check("room declares insufficiency", wc["room"]["sufficient"] is False)

            # ══ 3. Saving a check creates a private timeline
            print("\n3. Saving a wait check creates an UNPUBLISHED timeline")
            A, a_handle = await _signup(c, svc)
            r = await c.post(
                "/community/public/wait-check/save",
                headers=A,
                json={"subclass_slug": slug, "lodged_on": lodged.isoformat()},
            )
            check("save accepted", r.status_code == 201)
            saved = r.json()
            draft_id = saved["id"]
            check("it is a timeline post", saved["post_type"] == "timeline")
            check("it is NOT published", saved["is_published"] is False)
            check("it belongs to the saver", saved["is_mine"] is True)
            check(
                "the lodgement became a milestone",
                any(m["milestone_type"] == "Visa Lodged" for m in saved["milestones"]),
            )

            # ══ 4. A draft is invisible everywhere that matters
            print("\n4. The draft is absent from every public surface")
            r = await c.get(
                "/community/public/journeys", headers=svc, params={"subclass": slug}
            )
            check("feed does not list it", all(j["id"] != draft_id for j in r.json()))

            r = await c.get("/community/public/feed-summary", headers=svc)
            summary_before = r.json()
            check(
                "feed summary does not count it",
                summary_before["timelines"] >= 0,  # recorded; compared after publish
            )

            r = await c.get(f"/community/public/journeys/{draft_id}", headers=svc)
            check("a stranger gets 404, not a private post", r.status_code == 404)

            r = await c.get(f"/community/public/journeys/{draft_id}", headers=A)
            check("its owner CAN open it", r.status_code == 200)

            r = await c.get(
                "/community/public/wait-check",
                params={"subclass": slug, "lodged_on": lodged.isoformat()},
            )
            check(
                "it does not move the wait-check numbers",
                r.json()["room"]["provenance"]["total"] == 0,
            )

            r = await c.get("/community/public/processing", headers=svc)
            board = {row["slug"]: row for row in r.json()}
            check(
                "it does not appear on the processing board",
                board[slug]["room"]["provenance"]["total"] == 0,
            )

            print("\n   and no mirror row exists in the stats table at all")
            async with get_async_session() as db:
                mirrored = await db.scalar(
                    sa.select(sa.func.count())
                    .select_from(CommunityTimeline)
                    .where(CommunityTimeline.journey_id == uuid.UUID(draft_id))
                )
            check("the stats spine has never heard of the draft", int(mirrored or 0) == 0)

            # ══ 5. Publishing is a separate, explicit consent
            print("\n5. Publishing needs its own explicit consent")
            r = await c.post(
                f"/community/public/journeys/{draft_id}/publish", headers=A, json={}
            )
            check("publishing without consent is refused", r.status_code == 422)

            r = await c.post(
                f"/community/public/journeys/{draft_id}/publish",
                headers=A,
                json={"consent_public": False},
            )
            check("consent_public=false is refused too", r.status_code == 422)

            B, b_handle = await _signup(c, svc)
            r = await c.post(
                f"/community/public/journeys/{draft_id}/publish",
                headers=B,
                json={"consent_public": True},
            )
            check("someone else cannot publish your draft", r.status_code == 404)

            r = await c.get(f"/community/public/journeys/{draft_id}", headers=svc)
            check("still absent after those attempts", r.status_code == 404)

            r = await c.post(
                f"/community/public/journeys/{draft_id}/publish",
                headers=A,
                json={"consent_public": True},
            )
            check("its owner, with consent, publishes it", r.status_code == 200)
            check("it is now published", r.json()["is_published"] is True)

            r = await c.post(
                f"/community/public/journeys/{draft_id}/publish",
                headers=A,
                json={"consent_public": True},
            )
            check("publishing twice is a no-op, not an error", r.status_code == 200)

            # ══ 6. Now — and only now — it counts
            print("\n6. Once published it reaches the feed and the numbers")
            r = await c.get(
                "/community/public/journeys", headers=svc, params={"subclass": slug}
            )
            check("the feed lists it", any(j["id"] == draft_id for j in r.json()))

            r = await c.get("/community/public/feed-summary", headers=svc)
            check(
                "the feed summary now counts it",
                r.json()["timelines"] == summary_before["timelines"] + 1,
            )

            r = await c.get(
                "/community/public/wait-check",
                params={"subclass": slug, "lodged_on": lodged.isoformat()},
            )
            wc = r.json()
            check("the room now has one timeline", wc["room"]["provenance"]["total"] == 1)
            check(
                "counted as member-reported, not forum-collected",
                wc["room"]["provenance"]["member_reported"] == 1
                and wc["room"]["provenance"]["forum_collected"] == 0,
            )
            check("it is a still-waiting case", wc["room"]["pending"] == 1)
            check(
                "the sentence names its composition",
                "reported by members" in (wc["room"]["provenance_note"] or ""),
            )

            # ══ 7. A saved timeline accepts later milestones from its owner
            print("\n7. The timeline keeps growing — medical, s56, grant")
            r = await c.post(
                f"/community/public/journeys/{draft_id}/milestones",
                headers=B,
                json={
                    "milestones": [
                        {
                            "milestone_type": "Medical Examination",
                            "occurred_on": (today - timedelta(days=150)).isoformat(),
                        }
                    ]
                },
            )
            check("a stranger cannot add to your timeline", r.status_code == 404)

            r = await c.post(
                f"/community/public/journeys/{draft_id}/milestones",
                headers=A,
                json={
                    "milestones": [
                        {
                            "milestone_type": "Medical Examination",
                            "occurred_on": (today - timedelta(days=150)).isoformat(),
                        },
                        {
                            "milestone_type": "S56 Request Received",
                            "occurred_on": (today - timedelta(days=90)).isoformat(),
                        },
                    ]
                },
            )
            check("its owner can add later steps", r.status_code == 200)
            types = [m["milestone_type"] for m in r.json()["milestones"]]
            check("all three milestones are present", len(types) == 3)
            check("they are ordered by date", types[0] == "Visa Lodged")

            r = await c.post(
                f"/community/public/journeys/{draft_id}/milestones",
                headers=A,
                json={
                    "milestones": [
                        {
                            "milestone_type": "Medical Examination",
                            "occurred_on": (today - timedelta(days=150)).isoformat(),
                        }
                    ]
                },
            )
            check(
                "re-sending a milestone does not duplicate it",
                len(r.json()["milestones"]) == 3,
            )

            print("\n   and the grant date moves the public number")
            r = await c.post(
                f"/community/public/journeys/{draft_id}/milestones",
                headers=A,
                json={
                    "milestones": [
                        {
                            "milestone_type": "Visa Granted",
                            "occurred_on": (today - timedelta(days=10)).isoformat(),
                        }
                    ],
                    "outcome": "granted",
                },
            )
            check("the grant lands", r.status_code == 200)
            check("the timeline is now granted", r.json()["outcome"] == "granted")
            check("its span was derived", r.json()["processing_days"] == 190)

            r = await c.get(
                "/community/public/wait-check",
                params={"subclass": slug, "lodged_on": lodged.isoformat()},
            )
            wc = r.json()
            check("the decided case entered the sample", wc["room"]["sample_size"] == 1)
            check("and left the pending count", wc["room"]["pending"] == 0)

            # ══ 8. The n = 20 floor: a thin median is not published
            print("\n8. Below twenty decided cases, no community median is published")
            check("one grant is not enough", wc["room"]["sufficient"] is False)
            check("so the answer comes from official figures", wc["basis"] == "official")
            check(
                "but the room's real count is still reported honestly",
                wc["room"]["provenance"]["total"] == 1,
            )

            # Nineteen more decided cases → twenty in total, the floor exactly.
            async with get_async_session() as db:
                for i in range(19):
                    db.add(
                        CommunityTimeline(
                            id=uuid.uuid4(),
                            subclass_slug=slug,
                            journey_id=None,
                            lodged_on=today - timedelta(days=300 + i),
                            decided_on=today - timedelta(days=100 + i),
                            outcome="granted",
                            source="member",
                            status="active",
                        )
                    )
                await db.commit()

            r = await c.get(
                "/community/public/wait-check",
                params={"subclass": slug, "lodged_on": lodged.isoformat()},
            )
            wc = r.json()
            check("twenty decided cases reached", wc["room"]["sample_size"] == 20)
            check("now it is sufficient", wc["room"]["sufficient"] is True)
            check("and the answer becomes the room's own", wc["basis"] == "community")
            check("with a real median", wc["p50"] is not None)

            # ══ 9. Provenance is visible on every figure forum data touches
            print("\n9. Forum-collected timelines count — and always say so")
            async with get_async_session() as db:
                for i in range(5):
                    db.add(
                        CommunityTimeline(
                            id=uuid.uuid4(),
                            subclass_slug=slug,
                            journey_id=None,
                            lodged_on=today - timedelta(days=320 + i),
                            decided_on=today - timedelta(days=40 + i),
                            outcome="granted",
                            source=TIMELINE_SOURCE_FORUM,
                            status="active",
                        )
                    )
                await db.commit()

            r = await c.get(
                "/community/public/wait-check",
                params={"subclass": slug, "lodged_on": lodged.isoformat()},
            )
            wc = r.json()
            prov = wc["room"]["provenance"]
            check("forum rows now feed the statistics", wc["room"]["sample_size"] == 25)
            check("the split is reported", prov["member_reported"] == 20)
            check("both sides of it", prov["forum_collected"] == 5)
            check("and the total agrees", prov["total"] == 25)
            note = wc["room"]["provenance_note"] or ""
            check("the sentence states the composition", "25" in note and "20" in note)
            check("and names where the rest came from", "forum" in note.lower())

            r = await c.get("/community/public/processing", headers=svc)
            row = {x["slug"]: x for x in r.json()}[slug]
            check(
                "the processing board carries provenance too",
                row["room"]["provenance"]["forum_collected"] == 5,
            )
            check(
                "and its official block carries the as-at date",
                row["official"]["as_at"] == "Mar 2026",
            )

            # ══ 10. The 12-month window
            print("\n10. Only the last twelve months of lodgements count")
            async with get_async_session() as db:
                db.add(
                    CommunityTimeline(
                        id=uuid.uuid4(),
                        subclass_slug=slug,
                        journey_id=None,
                        # Lodged three years ago — a different processing regime.
                        lodged_on=today - timedelta(days=1100),
                        decided_on=today - timedelta(days=900),
                        outcome="granted",
                        source="member",
                        status="active",
                    )
                )
                await db.commit()

            r = await c.get(
                "/community/public/wait-check",
                params={"subclass": slug, "lodged_on": lodged.isoformat()},
            )
            check(
                "a three-year-old lodgement is excluded",
                r.json()["room"]["sample_size"] == 25,
            )

            # ══ 11. Drafts never generate inbox notifications (p3 gotcha 4)
            print("\n11. An unpublished timeline generates no inbox noise")
            r = await c.post(
                "/community/public/wait-check/save",
                headers=B,
                json={"subclass_slug": slug, "lodged_on": lodged.isoformat()},
            )
            b_draft = r.json()["id"]
            check("B saves a private check", r.status_code == 201)

            r = await c.post(
                f"/community/journeys/{b_draft}/comments",
                headers=A,
                json={"body": "Can I reply to something nobody can see?"},
            )
            check("nobody can even reply to a draft", r.status_code in (400, 404))

            r = await c.get("/community/me/inbox", headers=B)
            check("so B's inbox stays empty", r.json()["unread_count"] == 0)

            print("\n   but the draft is still on B's own profile, to publish later")
            r = await c.get("/community/me/posts", headers=B)
            mine = {p["id"]: p for p in r.json()}
            check("B sees their own draft", b_draft in mine)
            check("marked as unpublished", mine[b_draft]["is_published"] is False)

            # ══ 12. Anonymous save — no account required to keep a check
            print("\n12. A visitor with no account can still save a check")
            r = await c.post("/community/public/identity", headers=svc)
            device = r.json()["device_token"]
            V = {**svc, "X-Device-Token": device}
            r = await c.post(
                "/community/public/wait-check/save",
                headers=V,
                json={"subclass_slug": slug, "lodged_on": lodged.isoformat()},
            )
            check("saved against the device identity", r.status_code == 201)
            check("and it is unpublished, like every other save", r.json()["is_published"] is False)

    finally:
        # Leave the machine clean for the next script.
        async with get_async_session() as db:
            await db.execute(
                sa.delete(CommunityTimeline).where(
                    CommunityTimeline.subclass_slug == slug
                )
            )
            # Also clear anything attributed to this test's network. Step 12
            # asserts that an anonymous visitor can still save, which the
            # per-IP anonymous timeline cap will refuse once a couple of runs
            # (or any unrelated dev data) have accumulated against the same
            # hash — a self-cleaning run is the difference between a real
            # assertion and a flake.
            await db.execute(
                sa.delete(CommunityTimeline).where(
                    CommunityTimeline.author_ip_hash == hash_ip(TEST_CLIENT_IP)
                )
            )
            await db.execute(sa.delete(Journey).where(Journey.subclass_slug == slug))
            await db.execute(sa.delete(VisaSubclass).where(VisaSubclass.slug == slug))
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
    print(f"{PASS} All wait-check save/publish and honest-numbers checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
