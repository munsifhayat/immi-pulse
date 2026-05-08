"""org business profile

Revision ID: c1f4e8b3d720
Revises: b8d2f4a6c1e3
Create Date: 2026-05-09 11:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'c1f4e8b3d720'
down_revision: Union[str, None] = 'b8d2f4a6c1e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('organizations', sa.Column('website', sa.String(), nullable=True))
    op.add_column('organizations', sa.Column('business_phone', sa.String(), nullable=True))
    op.add_column('organizations', sa.Column('contact_person', sa.String(), nullable=True))
    op.add_column('organizations', sa.Column('business_hours', sa.String(), nullable=True))
    op.add_column('organizations', sa.Column('social_links', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    op.drop_column('organizations', 'social_links')
    op.drop_column('organizations', 'business_hours')
    op.drop_column('organizations', 'contact_person')
    op.drop_column('organizations', 'business_phone')
    op.drop_column('organizations', 'website')
