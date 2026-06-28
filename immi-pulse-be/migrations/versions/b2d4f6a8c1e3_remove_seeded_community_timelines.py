"""remove seeded (demo) community timelines — keep only real submissions

The initial community-processing migration (a1c2e3f4d5b6) seeded a realistic
spread of demo timelines so the board/wait-check had data on a fresh database.
For the real production launch we don't want fabricated numbers presented as
community data, so this deletes the seed.

Seeded rows are identifiable because they were inserted without an
``author_ip_hash`` (NULL). Genuine submissions always carry a non-null hash
(``CommunityService.submit_timeline`` sets it), so this preserves any real
timelines while removing every seeded one. Idempotent and safe to re-run.

Revision ID: b2d4f6a8c1e3
Revises: a1c2e3f4d5b6
Create Date: 2026-06-28 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b2d4f6a8c1e3"
down_revision: Union[str, None] = "a1c2e3f4d5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DELETE FROM community_timelines WHERE author_ip_hash IS NULL"
    )


def downgrade() -> None:
    # The demo seed is intentionally not restored.
    pass
