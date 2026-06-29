"""Seed community-feed journeys AGGREGATED from public community discussions.

These rows are anonymised + paraphrased visa timelines gathered (via Firecrawl)
from public, indexable forums (expatforum.com, discussions.myimmitracker.com).
They give the feed life and browsable "people like me" cohorts on day one — but,
exactly like the hand-curated samples, they are flagged ``is_sample=True`` and
NEVER create ``community_timelines`` rows, so they do NOT feed the
"is my wait normal?" percentile engine. The wait-check numbers stay computed from
genuine first-party member submissions only — keeping the honest-sourcing stance.

Privacy / best-practice posture baked into the pipeline that produced the data:
  * facts only (subclass + dated milestones + coarse profile), never verbatim text
  * no usernames, names, employers, agents, reference numbers, or sub-state geo
  * every note/comment is paraphrased; dates normalised to month/day precision
  * ``source_url`` is stored per row for AUDIT + TAKEDOWN only — it is INTERNAL,
    never surfaced in the public API (see schemas.py — not serialised).

Input:  scripts/scraped_journeys.json  (array of records; see README/handoff)
Run:    PYTHONPATH=src python scripts/seed_community_scraped.py [--force]
        --force deletes previously-aggregated rows (source_url IS NOT NULL) first.
"""

import asyncio
import json
import os
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import delete, func, select

from app.agents.immigration.community import processing
from app.agents.immigration.community.identity import ADJECTIVES, COLORS, NOUNS
from app.agents.immigration.community.models import (
    Journey,
    JourneyComment,
    JourneyMilestone,
)
from app.db.session import get_async_session

NOW = datetime.now(timezone.utc)
DATA_PATH = os.path.join(os.path.dirname(__file__), "scraped_journeys.json")

# Spread aggregated posts across the recent past so the feed reads as "alive"
# rather than everything landing at once. Deterministic per-record (seeded by
# index) so re-running --force reproduces the same feel.
SPREAD_DAYS = 45


def _d(s: str) -> date:
    return date.fromisoformat(s)


def _handle(rng: random.Random) -> str:
    return f"{rng.choice(ADJECTIVES)}{rng.choice(NOUNS)}{1000 + rng.randrange(9000)}"


def _color(rng: random.Random) -> str:
    return rng.choice(COLORS)


def _created_at(rng: random.Random) -> datetime:
    """A deterministic, recent-biased timestamp within the last SPREAD_DAYS."""
    # square the uniform draw -> biases toward smaller offsets (more recent)
    frac = rng.random() ** 2
    minutes_ago = int(frac * SPREAD_DAYS * 24 * 60) + rng.randrange(5, 120)
    return NOW - timedelta(minutes=minutes_ago)


async def seed(force: bool = False) -> None:
    if not os.path.exists(DATA_PATH):
        print(f"No data file at {DATA_PATH}. Nothing to seed.")
        return
    records = json.load(open(DATA_PATH))
    print(f"Loaded {len(records)} aggregated records from {os.path.basename(DATA_PATH)}.")

    async with get_async_session() as db:
        existing = await db.scalar(
            select(func.count())
            .select_from(Journey)
            .where(Journey.source_url.isnot(None))
        )
        if existing and not force:
            print(
                f"Already seeded ({existing} aggregated journeys). "
                "Use --force to clear and reseed."
            )
            return
        if force and existing:
            ids = (
                await db.execute(
                    select(Journey.id).where(Journey.source_url.isnot(None))
                )
            ).scalars().all()
            if ids:
                await db.execute(
                    delete(JourneyComment).where(JourneyComment.journey_id.in_(ids))
                )
                await db.execute(
                    delete(JourneyMilestone).where(JourneyMilestone.journey_id.in_(ids))
                )
                await db.execute(delete(Journey).where(Journey.id.in_(ids)))
            print(f"Cleared {len(ids)} previously-aggregated journeys.")

        created = 0
        for idx, r in enumerate(records):
            rng = random.Random(20260628 + idx)  # deterministic per record
            jid = uuid.uuid4()
            handle = _handle(rng)
            color = _color(rng)
            created_at = _created_at(rng)

            ms_tuples = [
                (m["type"], _d(m["date"]))
                for m in (r.get("milestones") or [])
                if m.get("type") and m.get("date")
            ]
            ms_tuples.sort(key=lambda x: x[1])
            outcome = r.get("outcome", "waiting")
            lodged, decided, days = processing.derive_span(ms_tuples, outcome)

            journey = Journey(
                    id=jid,
                    identity_id=None,
                    post_type=r.get("post_type", "timeline"),
                    subclass_slug=r.get("subclass_slug"),
                    category_slug=r.get("category_slug"),
                    stream=r.get("stream"),
                    occupation=r.get("occupation"),
                    state=r.get("state"),
                    area=r.get("area"),
                    sponsor_type=r.get("sponsor_type"),
                    outcome=outcome,
                    title=r.get("title"),
                    note=r.get("note"),
                    handle=handle,
                    color=color,
                    is_sample=True,  # keeps it OUT of the wait-check stats
                    status="active",
                    lodged_on=lodged,
                    decided_on=decided,
                    processing_days=days,
                    source_url=r.get("source_url"),
                    source_site=r.get("source_site"),
                    created_at=created_at,
            )
            db.add(journey)
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
            for c in (r.get("comments") or []):
                body = (c.get("body") or "").strip()
                if not body:
                    continue
                cid = uuid.uuid4()
                # comments land shortly after the post, never in the future
                c_created = min(
                    NOW - timedelta(minutes=1),
                    created_at + timedelta(minutes=rng.randrange(20, 1200)),
                )
                db.add(
                    JourneyComment(
                        id=cid,
                        journey_id=jid,
                        parent_comment_id=None,
                        identity_id=None,
                        handle=_handle(rng),
                        color=_color(rng),
                        body=body,
                        created_at=c_created,
                    )
                )
                comment_count += 1
                for rep in (c.get("replies") or []):
                    rbody = (rep.get("body") or "").strip()
                    if not rbody:
                        continue
                    r_created = min(
                        NOW - timedelta(minutes=1),
                        c_created + timedelta(minutes=rng.randrange(10, 600)),
                    )
                    db.add(
                        JourneyComment(
                            id=uuid.uuid4(),
                            journey_id=jid,
                            parent_comment_id=cid,
                            identity_id=None,
                            handle=_handle(rng),
                            color=_color(rng),
                            body=rbody,
                            created_at=r_created,
                        )
                    )
                    comment_count += 1

            journey.comment_count = comment_count
            created += 1

        await db.commit()
        print(f"Seeded {created} aggregated journeys (is_sample=True, stats-isolated).")


if __name__ == "__main__":
    asyncio.run(seed(force="--force" in sys.argv))
