"""Load the Home Affairs skilled occupation snapshot into ``occupations``.

Reads ``scripts/dha_occupations.json`` (produced by
``fetch_dha_occupations.py``) and upserts 714 ANZSCO rows. Also stamps the two
derived flags onto ``visa_subclasses`` — ``requires_occupation`` and
``anzsco_version`` — because both are conclusions about the occupation dataset
and belong wherever that dataset is applied.

Same contract as ``seed_visa_taxonomy.py``: idempotent, matched on ``slug``,
existing rows updated in place, and an occupation that disappears from the
department's list marked ``is_active=False`` rather than deleted — a member's
timeline must not lose its occupation because a list was pruned.

**Run order matters.** This reads ``visa_subclasses``, so run it *after*
``seed_visa_taxonomy.py``; a subclass row that does not exist yet cannot be
flagged, and the flag is what makes the share form ask for an occupation at all.

Run:  PYTHONPATH=src python scripts/seed_occupations.py [--dry-run]
"""

import argparse
import asyncio
import json
import os
import sys
import uuid

from sqlalchemy import select

from app.agents.immigration.community.models import Occupation, VisaSubclass
from app.db.session import get_async_session

DATA_PATH = os.path.join(os.path.dirname(__file__), "dha_occupations.json")


async def run(dry_run: bool) -> int:
    with open(DATA_PATH) as fh:
        snap = json.load(fh)

    requires = set(snap["requires_occupation_subclasses"])
    version_2022 = set(snap["anzsco_2022_subclasses"])

    print(
        f"snapshot: {snap['occupation_count']} occupations"
        f" · fetched {snap['fetched_at'][:10]}"
    )
    print(
        f"requires an occupation: {', '.join(sorted(requires))}"
        f"  ·  reads ANZSCO 2022: {', '.join(sorted(version_2022))}"
    )

    rows = [
        {
            "slug": o["slug"],
            "name": o["name"],
            "anzsco_2013_code": o["anzsco_2013_code"],
            "anzsco_2022_code": o["anzsco_2022_code"],
            "major_group_code": o["major_group_code"],
            "major_group_name": o["major_group_name"],
            "lists": o["lists"],
            "eligible_subclasses": o["eligible_subclasses"],
            "assessing_authority": o["assessing_authority"],
            "authority_url": o["authority_url"],
            "is_active": True,
        }
        for o in snap["occupations"]
    ]

    if dry_run:
        print(f"would upsert {len(rows)} occupations; first 5:")
        for r in rows[:5]:
            print(
                f"  {r['slug']:<44} 2013={r['anzsco_2013_code'] or '—':<8}"
                f" 2022={r['anzsco_2022_code'] or '—':<8}"
                f" {','.join(r['eligible_subclasses'])}"
            )
        return 0

    created = updated = retired = 0
    async with get_async_session() as db:
        existing = {
            o.slug: o for o in (await db.execute(select(Occupation))).scalars().all()
        }
        seen: set[str] = set()

        for r in rows:
            seen.add(r["slug"])
            row = existing.get(r["slug"])
            if row is None:
                db.add(Occupation(id=uuid.uuid4(), **r))
                created += 1
            else:
                for k, v in r.items():
                    setattr(row, k, v)
                updated += 1

        # Retire, never delete.
        for slug, row in existing.items():
            if slug not in seen and row.is_active:
                row.is_active = False
                retired += 1

        # Stamp the flags onto the visa taxonomy. Keyed on ``code`` (the bare
        # subclass number) rather than ``slug``, because the department publishes
        # its occupation lists per subclass while ``visa_subclasses`` is the
        # flattened subclass+stream row — all three of 186's streams need the
        # same answer.
        flagged = 0
        subclasses = (await db.execute(select(VisaSubclass))).scalars().all()
        for sc in subclasses:
            needs = sc.code in requires
            # Lodgement stages (482/870 nomination and sponsorship) are never
            # offered in the picker, so flagging them would put a required field
            # behind a visa nobody can select.
            if sc.is_stage:
                needs = False
            version = None
            if needs:
                version = "2022" if sc.code in version_2022 else "2013"
            if sc.requires_occupation != needs or sc.anzsco_version != version:
                sc.requires_occupation = needs
                sc.anzsco_version = version
                flagged += 1

        await db.commit()

    print(f"created {created} · updated {updated} · retired {retired}")
    print(f"visa_subclasses re-flagged: {flagged}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    if not os.path.exists(DATA_PATH):
        print(
            f"missing {DATA_PATH} — run `python scripts/fetch_dha_occupations.py` first",
            file=sys.stderr,
        )
        return 1
    return asyncio.run(run(args.dry_run))


if __name__ == "__main__":
    raise SystemExit(main())
