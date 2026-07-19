"""Load the Home Affairs visa taxonomy snapshot into ``visa_subclasses``.

Reads ``scripts/dha_taxonomy.json`` (produced by ``fetch_dha_taxonomy.py``) and
upserts 76 subclass+stream rows with the department's live percentiles.

Idempotent and safe to re-run: rows are matched on ``slug``, existing rows are
updated in place, and a subclass that disappears from the department's feed is
marked ``is_active=False`` rather than deleted — a member's timeline must not
lose its visa because Home Affairs retired a stream.

Run:  PYTHONPATH=src python scripts/seed_visa_taxonomy.py [--dry-run]
"""

import argparse
import asyncio
import json
import os
import sys
import uuid

from sqlalchemy import select

from app.agents.immigration.community.models import VisaSubclass
from app.db.session import get_async_session

DATA_PATH = os.path.join(os.path.dirname(__file__), "dha_taxonomy.json")

# Order the picker follows: the visas our members actually hold come first,
# then the long tail alphabetically. Anything unlisted sorts after these.
CATEGORY_ORDER = [
    "skilled-migration",
    "employer-sponsored",
    "graduate-post-study",
    "student-visas",
    "partner-visas",
    "family-parent",
    "visitor-tourist",
    "working-holiday",
    "citizenship-pr",
    "general",
]


# Which questions each visa actually needs answering — the data behind the
# adaptive form. Keyed on the bare subclass number so every stream of a
# programme inherits the same answer.
#
# These are policy facts, not figures, so they live here rather than in the
# fetcher: no Home Affairs endpoint publishes "190 requires a nominating
# state". Each set is deliberately small — the default is *not to ask*, because
# a field shown to someone it does not apply to collects a guess, and a guess
# pools their timeline into a cohort it does not belong to.

# A state or territory is part of the story: the points-tested nomination
# visas, plus employer-sponsored visas where the question means "which state is
# the job in".
STATE_NOMINATION = {"190", "491", "186", "187", "482", "494"}

# Metro vs regional only means something on the regional visas. It is the whole
# point of 491 and 494, and it is noise everywhere else.
REGION_RELEVANT = {"190", "491", "494"}

# Accredited sponsorship is a priority-processing arrangement that exists only
# on these two. Asking anyone else produces an answer with no referent.
SPONSOR_TYPE_RELEVANT = {"482", "186"}


def cohort_key_for(subclass: dict, stream: dict) -> str:
    """Which statistics cohort this row contributes to.

    Split by stream only where the stream predicts a materially different wait
    (``cohort_split_by_stream``, computed from the live spread at fetch time).
    Otherwise every stream of the subclass pools on the bare subclass number —
    186's three streams sit within 10% of each other, and splitting a sample
    that small for no signal costs more than it buys.
    """
    if subclass["cohort_split_by_stream"]:
        return stream["slug"]
    return subclass["subclass_number"]


async def run(dry_run: bool) -> int:
    with open(DATA_PATH) as fh:
        snap = json.load(fh)

    print(
        f"snapshot: {snap['subclass_count']} subclasses / {snap['stream_count']} streams"
        f" · official as at {snap['official_updated']} (to {snap['official_end_date']})"
    )

    rows: list[dict] = []
    for sub in snap["subclasses"]:
        num = sub["subclass_number"]
        cat = sub.get("category_slug") or "general"
        cat_rank = (
            CATEGORY_ORDER.index(cat) if cat in CATEGORY_ORDER else len(CATEGORY_ORDER)
        )
        for idx, st in enumerate(sub["streams"]):
            rows.append(
                {
                    "slug": st["slug"],
                    "code": sub["subclass_number"],
                    "name": sub["name"],
                    "stream": st["display_name"] or None,
                    "category_slug": cat,
                    "cohort_key": cohort_key_for(sub, st),
                    # Persist the premise beside the conclusion. Without it the
                    # cohort key is an unexplainable string and the pooling
                    # decision can only be changed by re-fetching from Home
                    # Affairs.
                    "cohort_split_by_stream": bool(sub["cohort_split_by_stream"]),
                    "dha_subclass_code": sub["subclass_code"],
                    "dha_stream_code": st["dha_stream_code"] or None,
                    "is_stage": bool(st["is_stage"]),
                    "official_p25_days": st["official_p25_days"],
                    "official_p50_days": st["official_p50_days"],
                    "official_p75_days": st["official_p75_days"],
                    "official_p90_days": st["official_p90_days"],
                    "official_updated": st["official_updated"],
                    "official_end_date": st["official_end_date"],
                    "requires_state_nomination": num in STATE_NOMINATION,
                    "requires_region": num in REGION_RELEVANT,
                    "requires_sponsor_type": num in SPONSOR_TYPE_RELEVANT,
                    "sort_order": cat_rank * 1000
                    + int(sub["subclass_number"]) % 1000
                    + idx,
                    "is_active": True,
                }
            )

    if dry_run:
        print(f"would upsert {len(rows)} rows; first 5:")
        for r in rows[:5]:
            print(f"  {r['slug']:<44} cohort={r['cohort_key']:<28} p50={r['official_p50_days']}")
        return 0

    created = updated = retired = 0
    async with get_async_session() as db:
        existing = {
            s.slug: s for s in (await db.execute(select(VisaSubclass))).scalars().all()
        }
        seen: set[str] = set()

        for r in rows:
            seen.add(r["slug"])
            row = existing.get(r["slug"])
            if row is None:
                db.add(VisaSubclass(id=uuid.uuid4(), **r))
                created += 1
            else:
                for k, v in r.items():
                    setattr(row, k, v)
                updated += 1

        # Retire, never delete — a journey must keep its visa even if the
        # department stops publishing that stream.
        for slug, row in existing.items():
            if slug not in seen and row.is_active:
                row.is_active = False
                retired += 1

        await db.commit()

    print(f"created {created} · updated {updated} · retired {retired}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not os.path.exists(DATA_PATH):
        print(
            f"missing {DATA_PATH} — run `python scripts/fetch_dha_taxonomy.py` first",
            file=sys.stderr,
        )
        return 1
    return asyncio.run(run(args.dry_run))


if __name__ == "__main__":
    raise SystemExit(main())
