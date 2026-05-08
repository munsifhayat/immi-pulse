"""newsletter subscribers

Revision ID: 052b0304c7eb
Revises: f6a7b8c9d0e1
Create Date: 2026-05-08 22:28:21.562769
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '052b0304c7eb'
down_revision: Union[str, None] = 'f6a7b8c9d0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'newsletter_subscribers',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('source', sa.String(), nullable=False),
        sa.Column('user_agent', sa.String(), nullable=True),
        sa.Column('referrer', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_newsletter_subscribers_email'),
        'newsletter_subscribers',
        ['email'],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_newsletter_subscribers_email'), table_name='newsletter_subscribers')
    op.drop_table('newsletter_subscribers')
