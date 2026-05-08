"""seed founder + consultant pilot codes

Adds two redeemable pilot codes used during the early-access cohort:
  - MUNSIF-FOUNDER  : founder testing access (Pro tier override + 50k credits)
  - GIDEON-CONSULT  : pilot consultant access (Pro tier override + 50k credits)

Idempotent — checks for existing rows before inserting so re-running the
migration in environments where these codes already exist is safe.

Revision ID: b8d2f4a6c1e3
Revises: a7c9e1f3b2d4
Create Date: 2026-05-08 23:55:00.000000
"""
from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = 'b8d2f4a6c1e3'
down_revision: Union[str, None] = 'a7c9e1f3b2d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


PILOT_CODES = [
    {
        "code": "MUNSIF-FOUNDER",
        "name": "Founder Pilot — Munsif",
        "credit_grant": 50000,
        "tier_override": "pro",
    },
    {
        "code": "GIDEON-CONSULT",
        "name": "Consultant Pilot — Gideon",
        "credit_grant": 50000,
        "tier_override": "pro",
    },
]


def _pilot_table() -> sa.Table:
    """Lightweight ad-hoc table reflection — driver-agnostic, used only here."""
    return sa.table(
        "pilot_programs",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("code", sa.String()),
        sa.column("name", sa.String()),
        sa.column("credit_grant", sa.Integer()),
        sa.column("tier_override", sa.String()),
        sa.column("redemptions_used", sa.Integer()),
        sa.column("created_at", sa.DateTime(timezone=True)),
    )


def upgrade() -> None:
    bind = op.get_bind()
    pilots = _pilot_table()

    # Filter out codes that already exist so this is safe to re-run.
    existing = {
        row[0]
        for row in bind.execute(
            sa.select(pilots.c.code).where(
                pilots.c.code.in_([pc["code"] for pc in PILOT_CODES])
            )
        )
    }

    rows_to_insert = [
        {
            "id": uuid.uuid4(),
            "code": pc["code"],
            "name": pc["name"],
            "credit_grant": pc["credit_grant"],
            "tier_override": pc["tier_override"],
            "redemptions_used": 0,
            "created_at": datetime.now(timezone.utc),
        }
        for pc in PILOT_CODES
        if pc["code"] not in existing
    ]

    if rows_to_insert:
        op.bulk_insert(pilots, rows_to_insert)


def downgrade() -> None:
    pilots = _pilot_table()
    op.execute(
        pilots.delete().where(
            pilots.c.code.in_([pc["code"] for pc in PILOT_CODES])
        )
    )
