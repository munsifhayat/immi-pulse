"""occupations table, requires_occupation / anzsco_version, journey occupation_code

Revision ID: c4e8a2b6d0f7
Revises: b7d9f1a3c5e2
Create Date: 2026-07-19

Replaces free-text occupation with a coded one.

``community_journeys.occupation`` was an 80-character text box whose placeholder
read "e.g. Nurse, Developer", so "Nurse", "nurse", "RN" and "Registered Nurse
(Medical)" were four different cohorts. Occupation is the strongest predictor of
a skilled-visa wait after the subclass, and uncoded it predicts nothing.

Three changes:

  1. New ``occupations`` table — 714 ANZSCO rows from the department's skilled
     occupation list. **Two** code columns, because Home Affairs runs ANZSCO 2022
     for subclass 186/482 and ANZSCO 2013 for every other skilled subclass; 416
     occupations carry both and 7 of them disagree.
  2. ``visa_subclasses.requires_occupation`` and ``.anzsco_version`` — whether
     this visa has a nominated occupation, and which edition it reads.
  3. ``community_journeys.occupation_code`` — the coded value, added *beside*
     the existing text column rather than replacing it.

**Nothing is backfilled and nothing is dropped.** The existing free-text
occupations stay exactly as they are with a NULL code: "Nurse" cannot be
resolved to one of eleven coded nursing occupations, and guessing would fabricate
data on live rows. Old timelines keep their text; new ones carry both.

Row data is NOT seeded here — it comes from ``scripts/seed_occupations.py``
reading the committed ``scripts/dha_occupations.json`` snapshot, so a quarterly
occupation refresh never requires a migration. ``requires_occupation`` therefore
lands as ``false`` for every row until that seeder runs, which is the safe
direction: a visa is not asked for an occupation until we know it has one.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "c4e8a2b6d0f7"
down_revision = "b7d9f1a3c5e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "occupations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        # Slug, not code, is the natural key: 255 occupations carry only a 2013
        # code and 43 only a 2022 one, so neither code is present on every row.
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("anzsco_2013_code", sa.String(), nullable=True),
        sa.Column("anzsco_2022_code", sa.String(), nullable=True),
        sa.Column("major_group_code", sa.String(), nullable=True),
        sa.Column("major_group_name", sa.String(), nullable=True),
        sa.Column(
            "lists",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "eligible_subclasses",
            postgresql.ARRAY(sa.String()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("assessing_authority", sa.String(), nullable=True),
        sa.Column("authority_url", sa.String(), nullable=True),
        sa.Column(
            "is_active", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_occupations_slug", "occupations", ["slug"], unique=True
    )
    op.create_index("ix_occupations_name", "occupations", ["name"])
    op.create_index(
        "ix_occupations_anzsco_2013_code", "occupations", ["anzsco_2013_code"]
    )
    op.create_index(
        "ix_occupations_anzsco_2022_code", "occupations", ["anzsco_2022_code"]
    )
    op.create_index(
        "ix_occupations_major_group_code", "occupations", ["major_group_code"]
    )
    # The picker's hot path is "every occupation eligible for subclass X" — a
    # containment test over an array, which a btree cannot serve. GIN can.
    op.create_index(
        "ix_occupations_eligible_subclasses",
        "occupations",
        ["eligible_subclasses"],
        postgresql_using="gin",
    )

    op.add_column(
        "visa_subclasses",
        sa.Column(
            "requires_occupation",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.add_column(
        "visa_subclasses", sa.Column("anzsco_version", sa.String(), nullable=True)
    )

    op.add_column(
        "community_journeys",
        sa.Column("occupation_code", sa.String(), nullable=True),
    )
    op.create_index(
        "ix_community_journeys_occupation_code",
        "community_journeys",
        ["occupation_code"],
    )


def downgrade() -> None:
    # Genuinely reversible: everything added here is additive, and the free-text
    # ``community_journeys.occupation`` column this phase demoted was never
    # touched, so dropping the coded column loses only codes written after the
    # upgrade — the member-visible occupation text survives on every row.
    op.drop_index(
        "ix_community_journeys_occupation_code", table_name="community_journeys"
    )
    op.drop_column("community_journeys", "occupation_code")

    op.drop_column("visa_subclasses", "anzsco_version")
    op.drop_column("visa_subclasses", "requires_occupation")

    op.drop_index("ix_occupations_eligible_subclasses", table_name="occupations")
    op.drop_index("ix_occupations_major_group_code", table_name="occupations")
    op.drop_index("ix_occupations_anzsco_2022_code", table_name="occupations")
    op.drop_index("ix_occupations_anzsco_2013_code", table_name="occupations")
    op.drop_index("ix_occupations_name", table_name="occupations")
    op.drop_index("ix_occupations_slug", table_name="occupations")
    op.drop_table("occupations")
