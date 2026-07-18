"""Seed a handful of community journeys for a local visual smoke test.

    PYTHONPATH=src python tests/seed_community_smoke.py
"""

import os

os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
from datetime import date, timedelta


async def main():
    from app.agents.immigration.community.schemas import (
        CreateJourneyCommentRequest,
        CreateJourneyRequest,
    )
    from app.agents.immigration.community.service import CommunityService
    from app.db.session import get_async_session

    def d(days_ago: int) -> date:
        return date.today() - timedelta(days=days_ago)

    async with get_async_session() as db:
        subs = await CommunityService.list_subclasses(db)
        slug = subs[0].slug if subs else "189"

        async def mk_identity(ip):
            ident = await CommunityService.get_or_create_identity(
                db, token=None, ip_hash=f"seed-{ip}"
            )
            return ident

        # 1) Granted timeline
        i1 = await mk_identity("a")
        await CommunityService.create_journey(
            db,
            CreateJourneyRequest(
                post_type="timeline",
                subclass_slug=slug,
                outcome="granted",
                stream="Direct Entry (DE)",
                state="NSW",
                area="metro",
                note="Straightforward case, no s56. Kept documents ready.",
                milestones=[
                    {"milestone_type": "Visa Lodged", "occurred_on": d(240)},
                    {"milestone_type": "Medical Examination", "occurred_on": d(210)},
                    {"milestone_type": "Visa Granted", "occurred_on": d(35)},
                ],
            ),
            identity=i1,
            ip_hash="seed-a",
        )

        # 2) Waiting timeline
        i2 = await mk_identity("b")
        await CommunityService.create_journey(
            db,
            CreateJourneyRequest(
                post_type="timeline",
                subclass_slug=slug,
                outcome="waiting",
                stream="Points-tested",
                state="VIC",
                area="regional",
                note="Still waiting after CO contact. Hoping it moves soon.",
                milestones=[
                    {"milestone_type": "EOI Submitted", "occurred_on": d(160)},
                    {"milestone_type": "Invitation Received", "occurred_on": d(120)},
                    {"milestone_type": "Visa Lodged", "occurred_on": d(95)},
                ],
            ),
            identity=i2,
            ip_hash="seed-b",
        )

        # 3) Question + a comment
        i3 = await mk_identity("c")
        q = await CommunityService.create_journey(
            db,
            CreateJourneyRequest(
                post_type="question",
                subclass_slug=slug,
                title="How long after medicals did your grant come through?",
                note="Did medicals last week and wondering what to expect next.",
                milestones=[],
            ),
            identity=i3,
            ip_hash="seed-c",
        )
        await CommunityService.create_journey_comment(
            db,
            q.id,
            CreateJourneyCommentRequest(body="For me it was about 6 weeks after medicals."),
            identity=i1,
            ip_hash="seed-a",
        )

        await db.commit()
        print("Seeded 3 journeys (granted timeline, waiting timeline, question + comment).")
        print("A timeline journey id:", i1.id, "->", "check the feed at /community")


if __name__ == "__main__":
    asyncio.run(main())
