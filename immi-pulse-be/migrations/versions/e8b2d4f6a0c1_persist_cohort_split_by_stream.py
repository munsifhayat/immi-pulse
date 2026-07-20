"""persist cohort_split_by_stream on visa_subclasses

Revision ID: e8b2d4f6a0c1
Revises: d6f0b4c8e2a9
Create Date: 2026-07-19

``cohort_split_by_stream`` decides whether a programme's streams are counted
separately or pooled — it is the reason behind every ``cohort_key``. It has
lived only inside ``scripts/fetch_dha_taxonomy.py``: computed at fetch time,
consumed once by the seeder, then discarded. The conclusion survived in the
data; the premise did not.

That had two costs. The pooling could not be explained to a member ("why is my
500 Higher Education counted apart from 500 Non-Award?"), and it could not be
changed or audited without a network round-trip to Home Affairs.

Backfilled from the shape of ``cohort_key`` rather than from the snapshot file,
so the column agrees with the data already in the table even if the JSON on disk
has since moved on: a row is split exactly when its cohort key is its own slug
rather than the bare subclass number.
"""

from alembic import op
import sqlalchemy as sa


revision = "e8b2d4f6a0c1"
down_revision = "d6f0b4c8e2a9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "visa_subclasses",
        sa.Column(
            "cohort_split_by_stream",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    # Derive from what the table already believes, not from the snapshot on
    # disk. A split row pools on its own slug; a pooled row pools on the bare
    # subclass number shared with its siblings.
    op.execute(
        "UPDATE visa_subclasses "
        "SET cohort_split_by_stream = (cohort_key IS NOT NULL AND cohort_key = slug)"
    )


def downgrade() -> None:
    op.drop_column("visa_subclasses", "cohort_split_by_stream")
