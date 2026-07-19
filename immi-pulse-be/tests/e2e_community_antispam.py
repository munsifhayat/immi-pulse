"""End-to-end exercise of the trust ladder and the anti-spam controls (Phase 6).

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_antispam.py

Drives the HTTP surface in-process via httpx ASGITransport, against the real
database and real JWTs — the project's convention for flow coverage, since
there is no router-level pytest.

What it proves, in order:

  1. link gating       a new account's link is refused; a seeded T2's lands;
                       an official gov.au link works at every tier
  2. touting           the pitch is held for review at every tier, and lands in
                       the *existing* moderation queue labelled as automatic
  3. author's view     held content is invisible to the room and present for
                       the person who wrote it — the point of a soft hold
  4. release           a moderator dismissing the auto-report puts it straight
                       back in the feed
  5. similarity        the same body in a third thread is held
  6. velocity          a burst is held
  7. weighted reports  one established member cannot hold content alone; two
                       can; one trusted member can
  8. demotion          an upheld report demotes on the spot, and enough of them
                       shadow-limit the account
  9. shadow limiting   the author still sees their own post; the feed does not
 10. recompute         the nightly job promotes silently
 11. never a ban       an exhausted IP ceiling still says "sign in or try
                       tomorrow", and an established account is not held to it
"""

import os

os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
PASSWORD = "Correct-Horse-Battery-42"
_failures = []


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)


async def _signup(client, svc):
    """Fresh device -> claimed account. Returns (session_token, handle)."""
    r = await client.post("/community/public/identity", headers=svc)
    device = r.json()["device_token"]
    client.cookies.clear()
    r = await client.post(
        "/community/public/auth/signup",
        headers={**svc, "X-Device-Token": device},
        json={"password": PASSWORD, "email": f"antispam-{uuid.uuid4().hex[:8]}@example.com"},
    )
    client.cookies.clear()
    payload = r.json()
    return payload.get("token"), payload.get("account", {}).get("handle")


async def _set_tier(handle, tier, *, upheld=0, shadow=False):
    """Force an account's stored tier.

    Earning T2 honestly needs seven days of wall-clock tenure, which no test can
    wait for. Setting the column directly is the standard way to test what a
    tier *unlocks* without also re-testing how it is earned — that half is
    covered purely in tests/agents/immigration/test_community_tiers.py.
    """
    from sqlalchemy import select

    from app.agents.immigration.community.models import AnonIdentity
    from app.db.session import get_async_session

    async with get_async_session() as db:
        account = (
            await db.execute(select(AnonIdentity).where(AnonIdentity.handle == handle))
        ).scalar_one()
        account.trust_tier = tier
        account.upheld_reports = upheld
        account.shadow_limited = shadow
        await db.commit()


async def _account_row(handle):
    from sqlalchemy import select

    from app.agents.immigration.community.models import AnonIdentity
    from app.db.session import get_async_session

    async with get_async_session() as db:
        return (
            await db.execute(select(AnonIdentity).where(AnonIdentity.handle == handle))
        ).scalar_one()


async def _journey_status(journey_id):
    from app.agents.immigration.community.models import Journey
    from app.db.session import get_async_session

    async with get_async_session() as db:
        row = await db.get(Journey, uuid.UUID(journey_id))
        return row.status if row else None


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

    # Durable counters + one shared 127.0.0.1 scope across the whole suite:
    # without this reset a few runs in one UTC day would exhaust the network
    # ceiling and this script would fail on its own history. (p2 gotcha 1.)
    async with get_async_session() as db:
        await reset_rate_counters(db, scope_type="ip", scope_key=hash_ip("127.0.0.1"))
        await db.commit()

    # Owner JWT for the admin moderation queue.
    async with get_async_session() as db:
        org = Organization(name=f"Antispam Org {suffix}", country="AU")
        db.add(org)
        await db.flush()
        user = User(
            email=f"spam.{suffix}@firm.com", first_name="Mod", last_name="Erator"
        )
        db.add(user)
        await db.flush()
        seat = Seat(org_id=org.id, user_id=user.id, role="owner", status="active")
        db.add(seat)
        await db.commit()
        owner_jwt = issue_token(user.id, seat.id, org.id)

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test/api/v1"
    ) as c:
        svc = {"X-API-Key": settings.api_key}
        admin = {**svc, "Authorization": f"Bearer {owner_jwt}"}

        async def post_question(headers, title, note):
            return await c.post(
                "/community/journeys",
                headers=headers,
                json={"post_type": "question", "title": title, "note": note},
            )

        # ═══ 1. Link gating below T2 ═══
        print("\n1. Outbound links are gated below T2")
        new_token, new_handle = await _signup(c, svc)
        NEW = {**svc, "Authorization": f"Bearer {new_token}"}

        r = await post_question(
            NEW, f"Any good agents? {suffix}", "I found best-migration-help.com"
        )
        check("a fresh account's link is refused", r.status_code == 400)
        detail = r.json().get("detail", "")
        check(
            "the refusal explains itself and says when it lifts",
            "links" in detail.lower() and "week" in detail.lower(),
        )
        check(
            "the refusal names no tier, score or number",
            "t2" not in detail.lower() and "tier" not in detail.lower(),
        )

        r = await post_question(
            NEW,
            f"Phone gating {suffix}",
            "My number is 0412 345 678 if anyone wants to chat",
        )
        check("a phone number is refused too", r.status_code == 400)

        r = await post_question(
            NEW, f"Handle gating {suffix}", "Reach me at helper.person@gmail.com"
        )
        check("an email address is refused too", r.status_code == 400)

        r = await post_question(
            NEW,
            f"Official link {suffix}",
            "The list is at https://immi.homeaffairs.gov.au/visas/getting-a-visa",
        )
        check(
            "an official gov.au link still works at T1 "
            "(the gate must not block the most useful post in the room)",
            r.status_code == 201,
        )

        est_token, est_handle = await _signup(c, svc)
        await _set_tier(est_handle, 2)
        EST = {**svc, "Authorization": f"Bearer {est_token}"}
        r = await post_question(
            EST, f"Established link {suffix}", "I used best-migration-help.com"
        )
        check("an established account's link goes through", r.status_code == 201)

        # ═══ 2. Touting auto-holds, at every tier ═══
        print("\n2. Touting is held for review — at every tier")
        r = await post_question(
            NEW,
            f"Cheap PR {suffix}",
            "I can lodge your 189 for you, my fee is very reasonable.",
        )
        check("the touting post is accepted, not refused", r.status_code == 201)
        touting_id = r.json()["id"]
        check("...but it is held", await _journey_status(touting_id) == "held")

        # Tenure must not buy an exemption: touting is an s276 question, and a
        # long-standing account touting is if anything more dangerous.
        r = await post_question(
            EST,
            f"Established touting {suffix}",
            "DM me for help with your PR, my fee is small.",
        )
        est_touting_id = r.json()["id"]
        check(
            "an established account's touting is held just the same",
            await _journey_status(est_touting_id) == "held",
        )

        trusted_token, trusted_handle = await _signup(c, svc)
        await _set_tier(trusted_handle, 3)
        TRUSTED = {**svc, "Authorization": f"Bearer {trusted_token}"}
        r = await post_question(
            TRUSTED,
            f"Trusted touting {suffix}",
            "We are a registered migration agency, contact us today for a quote.",
        )
        check(
            "a trusted account's touting is held too — tenure buys no exemption",
            await _journey_status(r.json()["id"]) == "held",
        )

        # ═══ 3. It lands in the EXISTING moderation queue ═══
        print("\n3. Held content lands in the existing moderation queue")
        r = await c.get("/community/admin/reports", headers=admin)
        reports = r.json()
        auto = [x for x in reports if x["target_id"] == touting_id]
        check("an open report exists against it", len(auto) == 1)
        check("it is labelled as automatic", auto and auto[0]["source"] == "auto")
        check(
            "it says which pattern fired, so a moderator can judge it",
            auto and "fee" in (auto[0]["description"] or "").lower(),
        )
        check(
            "the queue shows the content itself, not just an id",
            auto and bool(auto[0]["target_preview"]),
        )
        check("the queue reports it as held", auto and auto[0]["target_status"] == "held")

        # ═══ 4. Held is invisible to the room, visible to its author ═══
        print("\n4. Held content: gone from the room, present for its author")
        r = await c.get("/community/public/journeys?limit=100", headers=svc)
        check(
            "the feed does not carry it",
            all(j["id"] != touting_id for j in r.json()),
        )
        r = await c.get(f"/community/public/journeys/{touting_id}", headers=svc)
        check("a stranger gets 404, not 'under review'", r.status_code == 404)
        r = await c.get(f"/community/public/journeys/{touting_id}", headers=NEW)
        check("its author can still open it", r.status_code == 200)
        check("...and it is marked as held for them", r.json().get("is_held") is True)
        r = await c.get("/community/me/posts", headers=NEW)
        check(
            "it is still on the author's own profile",
            any(j["id"] == touting_id for j in r.json()),
        )

        # ═══ 5. Dismissing the auto-report releases it ═══
        print("\n5. A dismissed auto-hold goes straight back into the feed")
        r = await c.post(
            f"/community/admin/reports/{auto[0]['id']}/action",
            headers=admin,
            json={"action": "dismiss", "note": "false positive"},
        )
        check("the moderator dismissed it", r.status_code == 200)
        check("the post is active again", await _journey_status(touting_id) == "active")
        r = await c.get("/community/public/journeys?limit=100", headers=svc)
        check(
            "and it is back in the feed",
            any(j["id"] == touting_id for j in r.json()),
        )

        # ═══ 6. Same body across three threads ═══
        print("\n6. The same body in a third thread is held")
        host_token, _ = await _signup(c, svc)
        HOST = {**svc, "Authorization": f"Bearer {host_token}"}
        thread_ids = []
        for n in range(3):
            r = await post_question(
                HOST, f"Host thread {n} {suffix}", "Somewhere to reply to."
            )
            thread_ids.append(r.json()["id"])

        dup_token, _ = await _signup(c, svc)
        DUP = {**svc, "Authorization": f"Bearer {dup_token}"}
        body = (
            "Best migration agent in Sydney, we handle everything for you "
            f"end to end. Ref {suffix}."
        )
        statuses = []
        for jid in thread_ids:
            r = await c.post(
                f"/community/journeys/{jid}/comments", headers=DUP, json={"body": body}
            )
            statuses.append(r.status_code)

        from app.agents.immigration.community.models import JourneyComment
        from sqlalchemy import select

        async with get_async_session() as db:
            rows = (
                await db.execute(
                    select(JourneyComment.status)
                    .where(JourneyComment.body == body)
                    .order_by(JourneyComment.created_at.asc())
                )
            ).scalars().all()
        check("all three replies were accepted", statuses == [201, 201, 201])
        check(
            "the third one is held for review (two can be a coincidence)",
            len(rows) == 3 and rows[2] == "held",
        )
        check(
            "the first two stayed in the room",
            len(rows) == 3 and rows[0] == "active" and rows[1] == "active",
        )

        r = await c.get(f"/community/public/journeys/{thread_ids[2]}", headers=svc)
        messages = r.json()["messages"]
        check(
            "the held reply is not shown to the room",
            all(m["body"] != body for m in messages),
        )
        r = await c.get(f"/community/public/journeys/{thread_ids[2]}", headers=DUP)
        check(
            "...but its author still sees it",
            any(m["body"] == body for m in r.json()["messages"]),
        )
        # The third thread received exactly one reply, and it was held — so the
        # count the room sees must still be zero. A held reply that bumps the
        # counter advertises its own existence: the thread would read "1 reply"
        # with nothing under it, which tells a spammer precisely which of their
        # messages tripped the screen.
        r = await c.get(f"/community/public/journeys/{thread_ids[2]}", headers=HOST)
        check(
            "the held reply did not raise the visible reply count",
            r.json()["comment_count"] == 0,
        )

        # ═══ 7. Velocity ═══
        print("\n7. A burst is held")
        burst_token, _ = await _signup(c, svc)
        BURST = {**svc, "Authorization": f"Bearer {burst_token}"}
        limit = settings.community_velocity_max_writes
        burst_statuses = []
        for n in range(limit + 1):
            r = await c.post(
                f"/community/journeys/{thread_ids[0]}/comments",
                headers=BURST,
                json={"body": f"Reply number {n} about the {suffix} wait, unique text."},
            )
            burst_statuses.append(r.status_code)
        async with get_async_session() as db:
            burst_rows = (
                await db.execute(
                    select(JourneyComment.status)
                    .where(JourneyComment.body.like(f"%{suffix} wait, unique text.%"))
                    .order_by(JourneyComment.created_at.asc())
                )
            ).scalars().all()
        check(
            "every write was accepted (a burst is held, never refused)",
            all(s == 201 for s in burst_statuses),
        )
        check(
            f"the first {limit} landed",
            len(burst_rows) >= limit
            and all(s == "active" for s in burst_rows[:limit]),
        )
        check(
            "the one over the burst threshold is held",
            len(burst_rows) == limit + 1 and burst_rows[limit] == "held",
        )

        # ═══ 8. Weighted reports ═══
        print("\n8. Reports are weighted by who files them")
        target_token, _ = await _signup(c, svc)
        TARGET = {**svc, "Authorization": f"Bearer {target_token}"}
        r = await post_question(
            TARGET, f"Reportable one {suffix}", "A perfectly ordinary question."
        )
        target_a = r.json()["id"]
        r = await post_question(
            TARGET, f"Reportable two {suffix}", "Another perfectly ordinary question."
        )
        target_b = r.json()["id"]

        r2_token, r2_handle = await _signup(c, svc)
        await _set_tier(r2_handle, 2)
        R2 = {**svc, "Authorization": f"Bearer {r2_token}"}
        r = await c.post(
            f"/community/journeys/{target_a}/report",
            headers=R2,
            json={"reason": "spam", "description": "looks off"},
        )
        check("an established member's report is worth 3", r.json()["weight"] == 3)
        check(
            "one established member alone cannot hold a post — "
            "a report button that silences on one click will be used to silence",
            await _journey_status(target_a) == "active",
        )

        r2b_token, r2b_handle = await _signup(c, svc)
        await _set_tier(r2b_handle, 2)
        R2B = {**svc, "Authorization": f"Bearer {r2b_token}"}
        await c.post(
            f"/community/journeys/{target_a}/report",
            headers=R2B,
            json={"reason": "spam", "description": "agreed"},
        )
        check(
            "two established members together do hold it",
            await _journey_status(target_a) == "held",
        )

        r3_token, r3_handle = await _signup(c, svc)
        await _set_tier(r3_handle, 3)
        R3 = {**svc, "Authorization": f"Bearer {r3_token}"}
        r = await c.post(
            f"/community/journeys/{target_b}/report",
            headers=R3,
            json={"reason": "spam", "description": "this is touting"},
        )
        check(
            "a trusted member's report is worth the whole threshold",
            r.json()["weight"] >= 5,
        )
        check(
            "so one trusted report holds it on its own",
            await _journey_status(target_b) == "held",
        )

        # ═══ 9. Demotion on an upheld report ═══
        print("\n9. An upheld report demotes on the spot")
        await _set_tier(est_handle, 2)
        r = await c.get("/community/admin/reports", headers=admin)
        est_report = [
            x for x in r.json() if x["target_id"] == est_touting_id
        ]
        check("the established account's touting is queued", len(est_report) == 1)
        r = await c.post(
            f"/community/admin/reports/{est_report[0]['id']}/action",
            headers=admin,
            json={"action": "hide", "note": "touting"},
        )
        check("the moderator upheld it", r.status_code == 200)
        row = await _account_row(est_handle)
        check("the upheld report was recorded", row.upheld_reports == 1)
        check("the recency clock was stamped", row.last_upheld_report_at is not None)
        check(
            "the account was demoted immediately, not at the next nightly run",
            row.trust_tier == 1,
        )
        check("...and it is not shadow-limited for one strike", row.shadow_limited is False)

        r = await post_question(
            EST, f"Post-demotion link {suffix}", "Try best-migration-help.com"
        )
        check(
            "the demotion has teeth — its links are gated again",
            r.status_code == 400,
        )

        # ═══ 10. Shadow limiting ═══
        print("\n10. A shadow-limited author sees their own content; the room does not")
        shadow_token, shadow_handle = await _signup(c, svc)
        SHADOW = {**svc, "Authorization": f"Bearer {shadow_token}"}
        r = await post_question(
            SHADOW, f"Shadowed post {suffix}", "Written before the limit landed."
        )
        shadow_journey = r.json()["id"]
        await _set_tier(shadow_handle, 1, upheld=3, shadow=True)

        r = await c.get("/community/public/journeys?limit=100", headers=svc)
        check(
            "the feed omits it",
            all(j["id"] != shadow_journey for j in r.json()),
        )
        r = await c.get("/community/public/journeys?limit=100", headers=SHADOW)
        check(
            "the author's own feed still shows it — nothing tells them they are limited",
            any(j["id"] == shadow_journey for j in r.json()),
        )
        r = await c.get(f"/community/public/journeys/{shadow_journey}", headers=SHADOW)
        check("they can open it", r.status_code == 200)
        r = await c.get(f"/community/public/journeys/{shadow_journey}", headers=svc)
        check(
            "a stranger cannot — a permalink that still works is not shadow-limiting",
            r.status_code == 404,
        )

        # ═══ 11. The nightly recompute ═══
        print("\n11. The nightly recompute promotes silently")
        from app.agents.immigration.community.trust import recompute_all_tiers

        promo_token, promo_handle = await _signup(c, svc)
        PROMO = {**svc, "Authorization": f"Bearer {promo_token}"}
        for n in range(5):
            r = await post_question(
                PROMO, f"Contribution {n} {suffix}", f"A genuine question, number {n}."
            )
        # Age the account past probation and give it one upvote, so it meets
        # every T2 condition the moment the job looks at it.
        async with get_async_session() as db:
            from app.agents.immigration.community.models import AnonIdentity, Journey

            acct = (
                await db.execute(
                    select(AnonIdentity).where(AnonIdentity.handle == promo_handle)
                )
            ).scalar_one()
            acct.created_at = datetime.now(timezone.utc) - timedelta(days=30)
            first = (
                await db.execute(
                    select(Journey).where(Journey.identity_id == acct.id).limit(1)
                )
            ).scalar_one()
            first.upvotes = 2
            await db.commit()

        row = await _account_row(promo_handle)
        check("it starts on probation", row.trust_tier == 1)
        async with get_async_session() as db:
            result = await recompute_all_tiers(db)
        check("the recompute ran over every account", result["scanned"] >= 1)
        row = await _account_row(promo_handle)
        check("the qualifying account was promoted", row.trust_tier == 2)
        check("the run was stamped", row.tier_computed_at is not None)

        r = await post_question(
            PROMO, f"Promoted link {suffix}", "Now I can share best-migration-help.com"
        )
        check(
            "promotion is effective on the very next request",
            r.status_code == 201,
        )

        # The ladder must never be visible. A serializer that carried the tier
        # would turn the whole thing into a score to farm.
        r = await c.get("/community/public/auth/me", headers=PROMO)
        me = r.json()
        check(
            "no tier, score or badge is exposed to the member",
            "trust_tier" not in me and "tier" not in me,
        )
        r = await c.get("/community/public/journeys?limit=5", headers=svc)
        check(
            "and none in the feed either",
            all("trust_tier" not in j and "tier" not in j for j in r.json()),
        )

        # ═══ 12. IP throttling never bans ═══
        print("\n12. The network ceiling refuses softly, and not at all above T1")
        from app.agents.immigration.community import tiers
        from app.agents.immigration.community.service import CommunityRateLimitError

        # A fresh established account, set *after* section 11's recompute. The
        # recompute correctly re-derives every tier from real signals, so a
        # hand-set tier from an earlier section has since been reset to what the
        # account actually earned — which is T1 for an account created minutes
        # ago. Reusing one here would test the recompute, not the ceiling.
        housemate_token, housemate_handle = await _signup(c, svc)
        await _set_tier(housemate_handle, 2)

        async with get_async_session() as db:
            await reset_rate_counters(
                db, scope_type="ip", scope_key=hash_ip("127.0.0.1")
            )
            await db.commit()

        # Exhaust the ceiling directly — going through HTTP would need 25 real
        # posts and would exercise nothing this section is about.
        from app.agents.immigration.community.service import consume_rate

        async with get_async_session() as db:
            for _ in range(tiers.IP_CEILING.posts_per_day + 1):
                try:
                    await consume_rate(
                        db, "question", ip_hash=hash_ip("127.0.0.1"), identity=None
                    )
                except CommunityRateLimitError as err:
                    ceiling_error = err
                    break
            else:
                ceiling_error = None
            await db.rollback()

        check("the ceiling does refuse eventually", ceiling_error is not None)
        message = str(ceiling_error) if ceiling_error else ""
        check(
            "it offers signing in as the remedy, and tomorrow as the fallback",
            "sign in" in message.lower() and "tomorrow" in message.lower(),
        )
        check(
            "it never says banned, blocked or blacklisted",
            not any(
                w in message.lower() for w in ("ban", "blocked", "blacklist", "forbidden")
            ),
        )
        check("it states no number", not any(ch.isdigit() for ch in message))

        # And the resolution of the shared-IP tension: two members behind one
        # exhausted network address, one on probation and one established. The
        # probationer is asked to come back tomorrow; the established member is
        # not held to the network ceiling at all.
        async with get_async_session() as db:
            from app.agents.immigration.community.models import AnonIdentity

            # Push the shared address well past its ceiling.
            for _ in range(tiers.IP_CEILING.posts_per_day + 2):
                try:
                    await consume_rate(
                        db, "question", ip_hash=hash_ip("127.0.0.1"), identity=None
                    )
                except CommunityRateLimitError:
                    pass

            probationer = (
                await db.execute(
                    select(AnonIdentity).where(AnonIdentity.handle == new_handle)
                )
            ).scalar_one()
            refused_for_probationer = None
            try:
                await consume_rate(
                    db, "question", ip_hash=hash_ip("127.0.0.1"), identity=probationer
                )
            except CommunityRateLimitError as err:
                refused_for_probationer = err

            established = (
                await db.execute(
                    select(AnonIdentity).where(AnonIdentity.handle == housemate_handle)
                )
            ).scalar_one()
            refused_for_established = None
            try:
                await consume_rate(
                    db, "question", ip_hash=hash_ip("127.0.0.1"), identity=established
                )
            except CommunityRateLimitError as err:
                refused_for_established = err
            await db.rollback()

        check(
            "a probationer on the exhausted network is refused (the ceiling binds "
            "where free account creation would otherwise defeat it)",
            refused_for_probationer is not None
            and refused_for_probationer.scope == "ip",
        )
        check(
            "an established account is not refused by the same exhausted ceiling "
            "(the share-house / campus case)",
            refused_for_established is None,
            )

        async with get_async_session() as db:
            await reset_rate_counters(
                db, scope_type="ip", scope_key=hash_ip("127.0.0.1")
            )
            await db.commit()

    print()
    if _failures:
        print(f"{FAIL} {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"    - {f}")
        raise SystemExit(1)
    print(f"{PASS} All trust-ladder and anti-spam checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
