"""community processing: visa_subclasses + community_timelines (+ seed)

Adds the data backbone for the "is my wait normal?" engine:
  * ``visa_subclasses`` — reference data + official DHA percentile bands.
  * ``community_timelines`` — anonymous, community-submitted lodge→decision
    timelines that the percentile/verdict engine aggregates live.

Seeds the eight headline subclasses the frontend already surfaces, plus a
deterministic, realistic spread of community timelines per subclass so the
board and wait-check have data on a fresh database. The timeline seed is
idempotent: it only runs when ``community_timelines`` is empty.

Revision ID: a1c2e3f4d5b6
Revises: f7b1c9d2e4a8
Create Date: 2026-06-27 12:00:00.000000
"""
import random
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "a1c2e3f4d5b6"
down_revision: Union[str, None] = "f7b1c9d2e4a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# slug, code, name, stream, category_slug, official_p50_days, official_p90_days
SUBCLASSES = [
    ("482-core-skills", "482", "Skills in Demand", "Core Skills", "employer-sponsored", 32, 58),
    ("500-higher-ed", "500", "Student Visa", "Higher Education", "student-visas", 35, 120),
    ("485-post-study", "485", "Temporary Graduate", "Post-Study Work", "graduate-post-study", 120, 270),
    ("186-direct-entry", "186", "Employer Nomination Scheme", "Direct Entry", "employer-sponsored", 210, 390),
    ("190-nominated", "190", "Skilled Nominated", "State-nominated", "skilled-migration", 240, 450),
    ("491-regional", "491", "Skilled Work Regional", "Provisional", "skilled-migration", 270, 510),
    ("189-independent", "189", "Skilled Independent", "Points-tested", "skilled-migration", 330, 660),
    ("820-partner", "820", "Partner Visa (Onshore)", "Temporary", "partner-visas", 540, 930),
]

# slug -> (median_days, spread_days, granted_n, pending_n, min_days, max_days)
SEED_SHAPE = {
    "482-core-skills": (26, 12, 80, 24, 4, 130),
    "500-higher-ed": (43, 18, 90, 30, 6, 210),
    "485-post-study": (111, 38, 64, 26, 21, 330),
    "186-direct-entry": (156, 55, 58, 30, 21, 560),
    "190-nominated": (195, 70, 54, 34, 35, 540),
    "491-regional": (237, 80, 46, 28, 42, 620),
    "189-independent": (300, 95, 68, 44, 60, 770),
    "820-partner": (462, 140, 40, 48, 120, 1120),
}

OFFICIAL_UPDATED = "Mar 2026"
COUNTRIES = ["India", "Nepal", "Philippines", "China", "Pakistan", "UK", "Brazil", "Vietnam", None]


def upgrade() -> None:
    # --- visa_subclasses ---
    op.create_table(
        "visa_subclasses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("stream", sa.String(), nullable=True),
        sa.Column("category_slug", sa.String(), nullable=True),
        sa.Column("official_p50_days", sa.Integer(), nullable=True),
        sa.Column("official_p90_days", sa.Integer(), nullable=True),
        sa.Column("official_updated", sa.String(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("slug", name="uq_visa_subclasses_slug"),
    )
    op.create_index("ix_visa_subclasses_slug", "visa_subclasses", ["slug"], unique=True)
    op.create_index("ix_visa_subclasses_code", "visa_subclasses", ["code"])
    op.create_index("ix_visa_subclasses_category_slug", "visa_subclasses", ["category_slug"])

    # --- community_timelines ---
    op.create_table(
        "community_timelines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("subclass_slug", sa.String(), nullable=False),
        sa.Column("lodged_on", sa.Date(), nullable=False),
        sa.Column("decided_on", sa.Date(), nullable=True),
        sa.Column("outcome", sa.String(), nullable=False, server_default="waiting"),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("note", sa.String(), nullable=True),
        sa.Column("author_ip_hash", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_community_timelines_subclass_slug", "community_timelines", ["subclass_slug"])
    op.create_index("ix_community_timelines_outcome", "community_timelines", ["outcome"])
    op.create_index("ix_community_timelines_status", "community_timelines", ["status"])
    op.create_index("ix_community_timelines_author_ip_hash", "community_timelines", ["author_ip_hash"])
    op.create_index("ix_community_timelines_created_at", "community_timelines", ["created_at"])

    now = datetime.now(timezone.utc)

    # --- seed subclasses (idempotent) ---
    subclass_tbl = sa.table(
        "visa_subclasses",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("slug", sa.String),
        sa.column("code", sa.String),
        sa.column("name", sa.String),
        sa.column("stream", sa.String),
        sa.column("category_slug", sa.String),
        sa.column("official_p50_days", sa.Integer),
        sa.column("official_p90_days", sa.Integer),
        sa.column("official_updated", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("is_active", sa.Boolean),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        subclass_tbl,
        [
            {
                "id": uuid.uuid4(),
                "slug": slug,
                "code": code,
                "name": name,
                "stream": stream,
                "category_slug": cat,
                "official_p50_days": p50,
                "official_p90_days": p90,
                "official_updated": OFFICIAL_UPDATED,
                "sort_order": idx * 10,
                "is_active": True,
                "created_at": now,
            }
            for idx, (slug, code, name, stream, cat, p50, p90) in enumerate(SUBCLASSES)
        ],
    )

    # --- seed community timelines (only on an empty table) ---
    conn = op.get_bind()
    existing = conn.execute(sa.text("SELECT COUNT(*) FROM community_timelines")).scalar()
    if existing:
        return

    today = date.today()
    timeline_tbl = sa.table(
        "community_timelines",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("subclass_slug", sa.String),
        sa.column("lodged_on", sa.Date),
        sa.column("decided_on", sa.Date),
        sa.column("outcome", sa.String),
        sa.column("country", sa.String),
        sa.column("status", sa.String),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )

    rows = []
    for s_idx, (slug, code, name, stream, cat, p50, p90) in enumerate(SUBCLASSES):
        median, spread, granted_n, pending_n, lo, hi = SEED_SHAPE[slug]
        rng = random.Random(1000 + s_idx)  # deterministic per subclass

        # Granted timelines, decisions spread over the past ~14 months.
        for _ in range(granted_n):
            duration = int(rng.gauss(median, spread))
            duration = max(lo, min(hi, duration))
            decided_offset = rng.randint(0, 420)
            decided_on = today - timedelta(days=decided_offset)
            lodged_on = decided_on - timedelta(days=duration)
            rows.append(
                {
                    "id": uuid.uuid4(),
                    "subclass_slug": slug,
                    "lodged_on": lodged_on,
                    "decided_on": decided_on,
                    "outcome": "granted",
                    "country": rng.choice(COUNTRIES),
                    "status": "active",
                    "created_at": now,
                }
            )

        # Still-waiting timelines — the honest pending denominator.
        for _ in range(pending_n):
            elapsed = int(abs(rng.gauss(median * 0.6, spread)))
            elapsed = max(3, min(hi, elapsed))
            rows.append(
                {
                    "id": uuid.uuid4(),
                    "subclass_slug": slug,
                    "lodged_on": today - timedelta(days=elapsed),
                    "decided_on": None,
                    "outcome": "waiting",
                    "country": rng.choice(COUNTRIES),
                    "status": "active",
                    "created_at": now,
                }
            )

    op.bulk_insert(timeline_tbl, rows)


def downgrade() -> None:
    op.drop_index("ix_community_timelines_created_at", table_name="community_timelines")
    op.drop_index("ix_community_timelines_author_ip_hash", table_name="community_timelines")
    op.drop_index("ix_community_timelines_status", table_name="community_timelines")
    op.drop_index("ix_community_timelines_outcome", table_name="community_timelines")
    op.drop_index("ix_community_timelines_subclass_slug", table_name="community_timelines")
    op.drop_table("community_timelines")

    op.drop_index("ix_visa_subclasses_category_slug", table_name="visa_subclasses")
    op.drop_index("ix_visa_subclasses_code", table_name="visa_subclasses")
    op.drop_index("ix_visa_subclasses_slug", table_name="visa_subclasses")
    op.drop_table("visa_subclasses")
