"""community journeys — internal provenance columns (source_url, source_site)

Additive. Adds two nullable, INTERNAL-ONLY columns to ``community_journeys`` used
for aggregated sample posts (anonymised + paraphrased timelines gathered from
public community discussions). They are never surfaced in the public API; they
exist so we can honour takedown requests, audit sourcing, and tell aggregated
sample rows apart from hand-seeded ones. Always NULL for genuine first-party
member submissions, so the wait-check / processing engine is untouched.

Revision ID: e5f7a9c1b3d5
Revises: c4d6e8f0a2b4
Create Date: 2026-06-28 16:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f7a9c1b3d5"
# Extends the community-feed branch (which owns community_journeys). The
# separate marketplace head (d4e5f6a7b8c9) is intentionally left untouched.
down_revision: Union[str, None] = "c4d6e8f0a2b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "community_journeys",
        sa.Column("source_url", sa.String(), nullable=True),
    )
    op.add_column(
        "community_journeys",
        sa.Column("source_site", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("community_journeys", "source_site")
    op.drop_column("community_journeys", "source_url")
