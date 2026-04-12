"""drop property pulse legacy tables

Revision ID: a1b2c3d4e5f6
Revises: 94bb2e42f9f8
Create Date: 2026-04-11 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '94bb2e42f9f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Property-Pulse legacy tables that may exist from the initial schema or
# from earlier dev environments. Dropped with IF EXISTS so this migration is
# idempotent across DBs that never had compliance_* tables created.
LEGACY_TABLES = [
    "invoice_detections",
    "p1_jobs",
    "emergent_work_items",
    "emergent_work_reports",
    "daily_summaries",
    "compliance_detections",
    "compliance_obligations",
    "property_compliance_profiles",
]


def upgrade() -> None:
    for table in LEGACY_TABLES:
        op.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')


def downgrade() -> None:
    raise NotImplementedError(
        "Property-Pulse legacy tables are not recoverable. "
        "If you need them back, restore from a pre-IMMI-PULSE backup."
    )
