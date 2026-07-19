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

# See ``seed_visa_taxonomy.MAX_RETIRE_SHARE``. The occupation list moves with
# legislative instruments — a handful at a time, not a third of it at once.
MAX_RETIRE_SHARE = 0.30


class SeedDriftError(RuntimeError):
    """The snapshot looks wrong enough that applying it would lose good data."""



async def run(dry_run: bool, force: bool = False) -> dict:
    with open(DATA_PATH) as fh:
        snap = json.load(fh)

    if not snap.get("occupations"):
        raise SeedDriftError("refusing to apply: the snapshot contains no occupations")

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
        return {"created": 0, "updated": 0, "retired": 0, "dry_run": True}

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

        # Drift guard — see ``seed_visa_taxonomy``. A truncated snapshot is a
        # valid snapshot, and applying one would retire most of the occupation
        # list, silently disabling the picker on every skilled visa.
        active_before = sum(1 for o in existing.values() if o.is_active)
        would_retire = sum(
            1
            for slug, row in existing.items()
            if slug not in {r["slug"] for r in rows} and row.is_active
        )
        if not force and active_before and would_retire > active_before * MAX_RETIRE_SHARE:
            raise SeedDriftError(
                f"refusing to apply: would retire {would_retire} of "
                f"{active_before} active occupations "
                f"(>{int(MAX_RETIRE_SHARE * 100)}%). Re-run the fetcher and "
                "check its record count. Pass force=True to override."
            )

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
    return {
        "created": created,
        "updated": updated,
        "retired": retired,
        "flagged": flagged,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--force",
        action="store_true",
        help="apply even if the run would retire an implausible share of rows",
    )
    args = ap.parse_args()
    if not os.path.exists(DATA_PATH):
        print(
            f"missing {DATA_PATH} — run `python scripts/fetch_dha_occupations.py` first",
            file=sys.stderr,
        )
        return 1
    try:
        asyncio.run(run(args.dry_run, force=args.force))
    except SeedDriftError as err:
        print(f"drift guard: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
