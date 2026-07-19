"""Audit the statistics spine: are any rows pooling on a cohort nobody serves?

Run:  PYTHONPATH=src python scripts/check_cohort_integrity.py [--fix]

**Why this exists.** ``community_timelines.subclass_slug`` does not hold a slug
despite its name — it holds a *cohort key*, written by
``CommunityService._sync_timeline_mirror``. Migration ``f2a4c6e8b0d3`` rewrote
those keys for eight legacy slugs when the taxonomy was reshaped, using a
hardcoded ``SLUG_REMAP`` whose docstring names four split subclasses: 189, 491,
482 and 500.

The committed snapshot splits **nine** — it has since grown to include 188, 403,
408, 600 and 888. A one-shot migration cannot cover a set that moves, and
re-running the seeder rewrites ``visa_subclasses`` without touching the mirror.
So a cohort key can be left pointing at a pooling that no live row serves, and
the symptom is silent: the wait check finds no community data and quietly falls
back to the official figures. Nobody sees an error; the number just gets worse.

This is the check nobody had. It is read-only unless ``--fix`` is passed.
"""

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from sqlalchemy import func, select  # noqa: E402

from app.agents.immigration.community.models import (  # noqa: E402
    CommunityTimeline,
    Journey,
    VisaSubclass,
)
from app.db.session import get_async_session  # noqa: E402


async def run(fix: bool) -> int:
    async with get_async_session() as db:
        subclasses = (await db.execute(select(VisaSubclass))).scalars().all()

        live_cohorts = {s.cohort_key or s.slug for s in subclasses}
        by_slug = {s.slug: s for s in subclasses}
        split = sum(1 for s in subclasses if s.cohort_split_by_stream)

        print(
            f"taxonomy: {len(subclasses)} rows · {len(live_cohorts)} cohorts · "
            f"{split} rows split by stream"
        )

        # --- the mirror ------------------------------------------------------
        rows = (
            await db.execute(
                select(
                    CommunityTimeline.subclass_slug, func.count()
                ).group_by(CommunityTimeline.subclass_slug)
            )
        ).all()

        stranded = [(key, n) for key, n in rows if key not in live_cohorts]
        total_stranded = sum(n for _, n in stranded)

        if not stranded:
            print(f"mirror: {sum(n for _, n in rows)} rows, all on live cohorts ✓")
        else:
            print(
                f"mirror: {total_stranded} row(s) on {len(stranded)} cohort(s) "
                "that no visa serves:"
            )
            for key, n in sorted(stranded, key=lambda kv: -kv[1]):
                # A stranded key is usually a *slug* that should have been
                # rewritten to its pooled subclass number, so say what it should
                # have been where we can work it out.
                sc = by_slug.get(key)
                suggestion = (
                    f" → should pool on '{sc.cohort_key}'"
                    if sc is not None and sc.cohort_key
                    else " → no matching visa row; needs a human"
                )
                print(f"  {n:5}  {key}{suggestion}")

        # --- journeys --------------------------------------------------------
        jrows = (
            await db.execute(
                select(Journey.subclass_slug, func.count())
                .where(Journey.subclass_slug.isnot(None))
                .group_by(Journey.subclass_slug)
            )
        ).all()
        # Journeys store a real slug, not a cohort key — different namespace.
        orphan_journeys = [(s, n) for s, n in jrows if s not in by_slug]
        if orphan_journeys:
            print(
                f"journeys: {sum(n for _, n in orphan_journeys)} row(s) on "
                f"{len(orphan_journeys)} slug(s) with no visa row:"
            )
            for slug, n in sorted(orphan_journeys, key=lambda kv: -kv[1]):
                print(f"  {n:5}  {slug}")
        else:
            print(f"journeys: {sum(n for _, n in jrows)} rows, all on live visas ✓")

        if not fix:
            if stranded or orphan_journeys:
                print("\nre-run with --fix to repoint the repairable mirror rows")
                return 1
            return 0

        # --- repair ----------------------------------------------------------
        repaired = 0
        for key, _ in stranded:
            sc = by_slug.get(key)
            if sc is None or not sc.cohort_key:
                continue  # not ours to guess at
            result = await db.execute(
                CommunityTimeline.__table__.update()
                .where(CommunityTimeline.subclass_slug == key)
                .values(subclass_slug=sc.cohort_key)
            )
            repaired += result.rowcount or 0
        await db.commit()
        print(f"\nrepointed {repaired} mirror row(s)")
        return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--fix",
        action="store_true",
        help="repoint stranded mirror rows onto their visa's live cohort key",
    )
    return asyncio.run(run(ap.parse_args().fix))


if __name__ == "__main__":
    raise SystemExit(main())
