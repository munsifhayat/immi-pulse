"""visa taxonomy: full DHA subclass+stream set, cohort_key, live percentiles

Revision ID: f2a4c6e8b0d3
Revises: e9b1d3f5a7c2
Create Date: 2026-07-19

Widens ``visa_subclasses`` from 8 hand-seeded rows to the department's full
published taxonomy (43 subclasses / 76 subclass+stream rows), and separates
"what the member picked" (``slug``) from "what the statistics pool on"
(``cohort_key``).

The 8 original slugs were invented before we had the real taxonomy and each one
conflated a subclass with a stream — ``189-independent`` is Home Affairs'
"189 / Points-Tested", ``485-post-study`` is a stream name that Home Affairs
retired in 2024. They are remapped here, and the remap has to reach three
tables: the reference rows themselves, ``community_journeys.subclass_slug``
(what members picked) and ``community_timelines.subclass_slug`` (the statistics
spine, which now holds the *cohort key* rather than the picked slug).

Row data is NOT seeded here — it comes from ``scripts/seed_visa_taxonomy.py``
reading the committed ``scripts/dha_taxonomy.json`` snapshot, so refreshing the
official figures never requires a migration.
"""

from alembic import op
import sqlalchemy as sa


revision = "f2a4c6e8b0d3"
down_revision = "e9b1d3f5a7c2"
branch_labels = None
depends_on = None


# old slug -> (new slug, new cohort key)
#
# The cohort-key rule, applied identically here and in
# ``scripts/seed_visa_taxonomy.py``: a subclass whose streams predict different
# waits keys on the **stream slug**; one whose streams do not keys on the bare
# **subclass number**, pooling them.
#
#   split   189 (9.5x spread)  491 (3.4x)  482 (11.6x)  500 (35x)
#   pooled  186 (1.1x)  485 (1.0x)  190 & 820 (no streams at all)
SLUG_REMAP = {
    "189-independent": ("189-points-tested", "189-points-tested"),
    "190-nominated": ("190-skilled-nominated-visa", "190"),
    "491-regional": ("491-state-or-territory-nominated", "491-state-or-territory-nominated"),
    "186-direct-entry": ("186-direct-entry", "186"),
    "482-core-skills": ("482-core-skills", "482-core-skills"),
    "485-post-study": ("485-post-higher-education-work", "485"),
    "500-higher-ed": ("500-higher-education-sector", "500-higher-education-sector"),
    "820-partner": ("820-partner-visa", "820"),
}


def upgrade() -> None:
    op.add_column("visa_subclasses", sa.Column("cohort_key", sa.String(), nullable=True))
    op.create_index(
        "ix_visa_subclasses_cohort_key", "visa_subclasses", ["cohort_key"]
    )
    op.add_column(
        "visa_subclasses", sa.Column("dha_subclass_code", sa.String(), nullable=True)
    )
    op.create_index(
        "ix_visa_subclasses_dha_subclass_code",
        "visa_subclasses",
        ["dha_subclass_code"],
    )
    op.add_column(
        "visa_subclasses", sa.Column("dha_stream_code", sa.String(), nullable=True)
    )
    op.add_column(
        "visa_subclasses",
        sa.Column(
            "is_stage",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "visa_subclasses", sa.Column("official_p25_days", sa.Integer(), nullable=True)
    )
    op.add_column(
        "visa_subclasses", sa.Column("official_p75_days", sa.Integer(), nullable=True)
    )
    op.add_column(
        "visa_subclasses", sa.Column("official_end_date", sa.String(), nullable=True)
    )

    conn = op.get_bind()

    # Backfill cohort_key for anything already present, so the column is never
    # NULL for a live row even if the seeder has not run yet.
    conn.execute(
        sa.text("UPDATE visa_subclasses SET cohort_key = slug WHERE cohort_key IS NULL")
    )

    # Remap the eight legacy slugs. Order matters: reference rows last, so a
    # partially-applied migration cannot orphan member data behind a renamed key.
    for old, (new_slug, new_cohort) in SLUG_REMAP.items():
        conn.execute(
            sa.text(
                "UPDATE community_journeys SET subclass_slug = :new "
                "WHERE subclass_slug = :old"
            ),
            {"new": new_slug, "old": old},
        )
        # The statistics spine now carries the cohort key, not the picked slug.
        conn.execute(
            sa.text(
                "UPDATE community_timelines SET subclass_slug = :new "
                "WHERE subclass_slug = :old"
            ),
            {"new": new_cohort, "old": old},
        )
        conn.execute(
            sa.text(
                "UPDATE visa_subclasses SET slug = :new, cohort_key = :cohort "
                "WHERE slug = :old"
            ),
            {"new": new_slug, "cohort": new_cohort, "old": old},
        )


def downgrade() -> None:
    conn = op.get_bind()
    for old, (new_slug, new_cohort) in SLUG_REMAP.items():
        conn.execute(
            sa.text(
                "UPDATE visa_subclasses SET slug = :old WHERE slug = :new"
            ),
            {"old": old, "new": new_slug},
        )
        conn.execute(
            sa.text(
                "UPDATE community_journeys SET subclass_slug = :old "
                "WHERE subclass_slug = :new"
            ),
            {"old": old, "new": new_slug},
        )
        conn.execute(
            sa.text(
                "UPDATE community_timelines SET subclass_slug = :old "
                "WHERE subclass_slug = :new"
            ),
            {"old": old, "new": new_cohort},
        )

    op.drop_column("visa_subclasses", "official_end_date")
    op.drop_column("visa_subclasses", "official_p75_days")
    op.drop_column("visa_subclasses", "official_p25_days")
    op.drop_column("visa_subclasses", "is_stage")
    op.drop_column("visa_subclasses", "dha_stream_code")
    op.drop_index("ix_visa_subclasses_dha_subclass_code", table_name="visa_subclasses")
    op.drop_column("visa_subclasses", "dha_subclass_code")
    op.drop_index("ix_visa_subclasses_cohort_key", table_name="visa_subclasses")
    op.drop_column("visa_subclasses", "cohort_key")
