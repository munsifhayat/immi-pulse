"""Seed a curated set of SAMPLE community-feed journeys.

These are clearly flagged ``is_sample=True`` so the feed isn't empty on launch —
and, crucially, sample posts NEVER feed the wait-check / processing stats (only
real, user-submitted timelines do). This keeps the "honest sourcing" stance:
the numbers stay real while the feed has life.

Run:   PYTHONPATH=src python scripts/seed_community_feed.py [--force]
``--force`` deletes existing sample posts first, then reseeds.
"""

import asyncio
import sys
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete, func, select

from app.agents.immigration.community import processing
from app.agents.immigration.community.models import (
    Journey,
    JourneyComment,
    JourneyMilestone,
)
from app.db.session import get_async_session

NOW = datetime.now(timezone.utc)


def _d(s: str) -> date:
    return date.fromisoformat(s)


def C(handle, color, body, mins_ago, replies=None):
    return {
        "handle": handle,
        "color": color,
        "body": body,
        "mins_ago": mins_ago,
        "replies": replies or [],
    }


def R(handle, color, body, mins_ago):
    return {"handle": handle, "color": color, "body": body, "mins_ago": mins_ago}


# Each timeline: subclass_slug + category_slug match the seeded reference data.
SAMPLES = [
    # --- Employer Sponsored ---
    {
        "post_type": "timeline", "subclass_slug": "186-direct-entry",
        "category_slug": "employer-sponsored", "outcome": "waiting",
        "handle": "BoldLagoon7745", "color": "#C026D3", "mins_ago": 1,
        "stream": "TRT", "occupation": "Gardener", "state": "VIC",
        "area": "metro", "sponsor_type": "accredited",
        "note": "Lodged my 186 in Dec 2024 but no nomination or visa decision yet. "
                "Gardener, accredited sponsor, VIC — is this wait normal?",
        "milestones": [
            ("Nomination Lodged", "2024-12-02"),
            ("Visa Lodged", "2024-12-02"),
        ],
        "comments": [
            C("HappyWombat", "#0EA5E9",
              "Same boat — 186 TRT lodged Nov 2024, accredited. Mine moved after I "
              "called DHA and asked if it was within the published timeframe.", 40,
              [R("BoldLagoon7745", "#C026D3",
                 "Thanks! Did you just ask about the published processing time?", 22),
               R("HappyWombat", "#0EA5E9",
                 "Yep — grant came about 3 weeks later.", 12)]),
            C("CalmRiver", "#7A5AF8",
              "Accredited sponsors are usually quicker. It's on the longer side but "
              "not unusual for TRT right now.", 18),
        ],
    },
    {
        "post_type": "timeline", "subclass_slug": "482-core-skills",
        "category_slug": "employer-sponsored", "outcome": "granted",
        "handle": "KindHawk3710", "color": "#65A30D", "mins_ago": 42,
        "stream": "Direct Entry", "occupation": "Network Engineer", "state": "VIC",
        "area": "metro", "sponsor_type": "non_accredited",
        "note": "Granted in ~5 weeks. Everything was uploaded day one, including "
                "police checks — decision-ready made all the difference.",
        "milestones": [
            ("Visa Lodged", "2025-05-03"),
            ("Medical Examination", "2025-05-24"),
            ("Visa Granted", "2025-06-10"),
        ],
        "comments": [
            C("EagerKoala", "#2563EB",
              "Congrats! Was it decision-ready from the start?", 180,
              [R("KindHawk3710", "#65A30D",
                 "Yes — everything in on day one. Highly recommend.", 120)]),
        ],
    },
    # --- Skilled ---
    {
        "post_type": "timeline", "subclass_slug": "189-independent",
        "category_slug": "skilled-migration", "outcome": "waiting",
        "handle": "GentlePine2204", "color": "#2563EB", "mins_ago": 60,
        "stream": "Points-tested", "occupation": "Management Accountant",
        "state": "NSW", "area": "metro", "sponsor_type": None,
        "note": "Invitation in March, medicals done — now waiting on the grant. "
                "Is the gap after medicals normal?",
        "milestones": [
            ("EOI Submitted", "2025-01-24"),
            ("Invitation Received", "2025-03-12"),
            ("Medical Examination", "2025-03-31"),
        ],
        "comments": [
            C("SteadyEagle", "#65A30D",
              "Totally normal for 189 right now. The gap after medicals is the worst "
              "part — hang in there.", 55,
              [R("GentlePine2204", "#2563EB",
                 "Thank you, genuinely needed to hear that today.", 50)]),
        ],
    },
    {
        "post_type": "timeline", "subclass_slug": "189-independent",
        "category_slug": "skilled-migration", "outcome": "granted",
        "handle": "BrightSummit6610", "color": "#F59E0B", "mins_ago": 2880,
        "stream": "Points-tested", "occupation": "Software Engineer",
        "state": "VIC", "area": "metro", "sponsor_type": None,
        "note": "Granted in ~5 months end-to-end. 95 points, decision-ready, no CO "
                "contact at all. Sharing the full timeline so others can compare.",
        "milestones": [
            ("EOI Submitted", "2024-11-03"),
            ("Invitation Received", "2024-11-22"),
            ("Visa Lodged", "2024-11-30"),
            ("Medical Examination", "2024-12-12"),
            ("Visa Granted", "2025-04-02"),
        ],
        "comments": [
            C("MellowOtter", "#0EA5E9",
              "95 points is a rocket. Congrats!", 1440),
        ],
    },
    {
        "post_type": "timeline", "subclass_slug": "190-nominated",
        "category_slug": "skilled-migration", "outcome": "waiting",
        "handle": "SilentWave2210", "color": "#7A5AF8", "mins_ago": 180,
        "stream": "Points-tested", "occupation": "Registered Nurse",
        "state": "QLD", "area": "regional", "sponsor_type": None,
        "note": "State nomination came through fast. Now waiting on the visa — "
                "anyone with a similar profile (RN, QLD regional) heard back?",
        "milestones": [
            ("Skills Assessment Approved", "2025-02-14"),
            ("State Nomination", "2025-04-16"),
            ("Visa Lodged", "2025-04-18"),
        ],
        "comments": [
            C("HopefulMeadow", "#1B7B6F",
              "RN here, QLD regional too. State nom was 8 weeks, visa another 4 "
              "months. You should be close.", 160),
        ],
    },
    {
        "post_type": "timeline", "subclass_slug": "491-regional",
        "category_slug": "skilled-migration", "outcome": "waiting",
        "handle": "SteadyMeadow2093", "color": "#1B7B6F", "mins_ago": 300,
        "stream": "Points-tested", "occupation": "Diesel Mechanic",
        "state": "SA", "area": "regional", "sponsor_type": None,
        "note": "491 regional — nomination through but the visa has been quiet for "
                "months. Anyone in regional SA hearing back?",
        "milestones": [
            ("EOI Submitted", "2024-10-10"),
            ("Invitation Received", "2025-01-02"),
            ("Visa Lodged", "2025-01-04"),
        ],
        "comments": [
            C("WarmCedar", "#0EA5E9",
              "Regional is slow everywhere right now. Mine took 7 months after "
              "nomination. Hang in there.", 280),
        ],
    },
    # --- Partner & Family ---
    {
        "post_type": "timeline", "subclass_slug": "820-partner",
        "category_slug": "partner-visas", "outcome": "waiting",
        "handle": "QuietFalcon8841", "color": "#DB2777", "mins_ago": 360,
        "stream": None, "occupation": None, "state": "WA",
        "area": "metro", "sponsor_type": None,
        "note": "18 months on the 820 bridging visa. Provided more relationship "
                "evidence under s56 in March. Still nothing.",
        "milestones": [
            ("Visa Lodged", "2025-01-02"),
            ("S56 Request Received", "2026-02-03"),
            ("S56 Response Submitted", "2026-03-07"),
        ],
        "comments": [
            C("LuckyMoon", "#2563EB",
              "820 timelines are all over the place. After you respond to s56 it can "
              "still take months. Frustrating but normal.", 300),
        ],
    },
    # --- Student & Graduate ---
    {
        "post_type": "timeline", "subclass_slug": "500-higher-ed",
        "category_slug": "student-visas", "outcome": "granted",
        "handle": "SwiftPine9920", "color": "#65A30D", "mins_ago": 480,
        "stream": None, "occupation": None, "state": "Offshore",
        "area": "metro", "sponsor_type": None,
        "note": "500 student granted in ~3 weeks. The Genuine Student statement was "
                "the part they scrutinised most.",
        "milestones": [
            ("Visa Lodged", "2025-06-02"),
            ("Medical Examination", "2025-06-09"),
            ("Visa Granted", "2025-06-23"),
        ],
        "comments": [
            C("BrightMeadow", "#DB2777",
              "Congrats! Any tips on the Genuine Student statement?", 360),
        ],
    },
    {
        "post_type": "timeline", "subclass_slug": "485-post-study",
        "category_slug": "graduate-post-study", "outcome": "waiting",
        "handle": "MellowOtter3318", "color": "#F59E0B", "mins_ago": 720,
        "stream": None, "occupation": "Accountant", "state": "SA",
        "area": "metro", "sponsor_type": None,
        "note": "485 lodged on a bridging visa after my 500 expired. Skills "
                "assessment was the bottleneck. Anyone waited longer than 4 months?",
        "milestones": [
            ("Skills Assessment Lodged", "2025-01-10"),
            ("Skills Assessment Approved", "2025-03-28"),
            ("Visa Lodged", "2025-04-02"),
        ],
        "comments": [
            C("PatientHarbour", "#7A5AF8",
              "485 is sitting around 3–5 months lately. Your BVA keeps your work "
              "rights, so you're fine in the meantime.", 600),
        ],
    },
    # --- Pure questions ---
    {
        "post_type": "question", "subclass_slug": "186-direct-entry",
        "category_slug": "employer-sponsored", "outcome": "waiting",
        "handle": "SwiftCedar4127", "color": "#0EA5E9", "mins_ago": 5,
        "title": "S56 request for 186 — how long for a response?",
        "note": "How long does it take to hear back after you submit the s56 "
                "(request for more information)? Mine's been three weeks and I'm "
                "anxious it's holding everything up.",
        "milestones": [],
        "comments": [
            C("WarmWillow", "#DB2777",
              "For me it was about 6 weeks after I uploaded the s56 docs before the "
              "CO looked again. No news is normal news.", 4),
        ],
    },
    {
        "post_type": "question", "subclass_slug": "189-independent",
        "category_slug": "skilled-migration", "outcome": "waiting",
        "handle": "RestlessKoala8830", "color": "#2563EB", "mins_ago": 200,
        "title": "189 · 70 points, March 2025 EOI — anyone got an invite yet?",
        "note": "Software engineer, 70 points, EOI March 2025. The last few rounds "
                "skipped my occupation. Should I chase a 190 state nomination?",
        "milestones": [],
        "comments": [
            C("CleverFox5521", "#65A30D",
              "2613xx is heavily backlogged at 70 — recent invites were 75+. A 190 "
              "state nom is the faster path right now.", 150),
        ],
    },
    {
        "post_type": "question", "subclass_slug": "820-partner",
        "category_slug": "partner-visas", "outcome": "waiting",
        "handle": "KindFern2098", "color": "#1B7B6F", "mins_ago": 360,
        "title": "820 partner visa — how much relationship evidence is \"enough\"?",
        "note": "We have a joint lease, shared bank account and 2 years of photos. "
                "The CO asked for more under s56. What finally satisfied yours?",
        "milestones": [],
        "comments": [
            C("HumbleReef7740", "#7A5AF8",
              "Form 888 statutory declarations from friends/family tipped ours over. "
              "Get 4–6 if you can.", 240),
        ],
    },
]


async def seed(force: bool = False) -> None:
    async with get_async_session() as db:
        existing = await db.scalar(
            select(func.count()).select_from(Journey).where(Journey.is_sample.is_(True))
        )
        if existing and not force:
            print(f"Already seeded ({existing} sample journeys). Use --force to reseed.")
            return
        if force and existing:
            sample_ids = (
                await db.execute(select(Journey.id).where(Journey.is_sample.is_(True)))
            ).scalars().all()
            if sample_ids:
                await db.execute(
                    delete(JourneyComment).where(
                        JourneyComment.journey_id.in_(sample_ids)
                    )
                )
                await db.execute(
                    delete(JourneyMilestone).where(
                        JourneyMilestone.journey_id.in_(sample_ids)
                    )
                )
                await db.execute(delete(Journey).where(Journey.id.in_(sample_ids)))
            print(f"Cleared {len(sample_ids)} existing sample journeys.")

        created = 0
        for s in SAMPLES:
            jid = uuid.uuid4()
            ms_tuples = [(t, _d(d)) for t, d in s["milestones"]]
            lodged, decided, days = processing.derive_span(ms_tuples, s["outcome"])
            j = Journey(
                id=jid,
                identity_id=None,
                post_type=s["post_type"],
                subclass_slug=s.get("subclass_slug"),
                category_slug=s.get("category_slug"),
                stream=s.get("stream"),
                occupation=s.get("occupation"),
                state=s.get("state"),
                area=s.get("area"),
                sponsor_type=s.get("sponsor_type"),
                outcome=s["outcome"],
                title=s.get("title"),
                note=s.get("note"),
                handle=s["handle"],
                color=s["color"],
                is_sample=True,
                status="active",
                lodged_on=lodged,
                decided_on=decided,
                processing_days=days,
                created_at=NOW - timedelta(minutes=s["mins_ago"]),
            )
            db.add(j)
            for i, (mtype, mdate) in enumerate(ms_tuples):
                db.add(
                    JourneyMilestone(
                        id=uuid.uuid4(),
                        journey_id=jid,
                        milestone_type=mtype,
                        occurred_on=mdate,
                        ordinal=i,
                    )
                )
            comment_count = 0
            for c in s["comments"]:
                cid = uuid.uuid4()
                db.add(
                    JourneyComment(
                        id=cid,
                        journey_id=jid,
                        parent_comment_id=None,
                        identity_id=None,
                        handle=c["handle"],
                        color=c["color"],
                        body=c["body"],
                        created_at=NOW - timedelta(minutes=c["mins_ago"]),
                    )
                )
                comment_count += 1
                for r in c["replies"]:
                    db.add(
                        JourneyComment(
                            id=uuid.uuid4(),
                            journey_id=jid,
                            parent_comment_id=cid,
                            identity_id=None,
                            handle=r["handle"],
                            color=r["color"],
                            body=r["body"],
                            created_at=NOW - timedelta(minutes=r["mins_ago"]),
                        )
                    )
                    comment_count += 1
            j.comment_count = comment_count
            created += 1

        await db.commit()
        print(f"Seeded {created} sample journeys.")


if __name__ == "__main__":
    asyncio.run(seed(force="--force" in sys.argv))
