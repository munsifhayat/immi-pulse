"""add sign_pin_encrypted to engagement_letters

Revision ID: db6ad7c7470d
Revises: c1f4e8b3d720
Create Date: 2026-05-09 01:34:18.665728
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'db6ad7c7470d'
down_revision: Union[str, None] = 'c1f4e8b3d720'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'engagement_letters',
        sa.Column('sign_pin_encrypted', sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('engagement_letters', 'sign_pin_encrypted')
