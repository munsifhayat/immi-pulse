"""user phone column

Revision ID: a7c9e1f3b2d4
Revises: 052b0304c7eb
Create Date: 2026-05-08 23:14:02.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7c9e1f3b2d4'
down_revision: Union[str, None] = '052b0304c7eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('phone', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'phone')
