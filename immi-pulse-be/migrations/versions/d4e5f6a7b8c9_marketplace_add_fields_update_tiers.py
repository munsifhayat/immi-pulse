"""marketplace: add website, phone, role, listing_type fields and update tier values

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns.
    op.add_column("agent_profiles", sa.Column("listing_type", sa.String(), nullable=True))
    op.add_column("agent_profiles", sa.Column("website", sa.String(), nullable=True))
    op.add_column("agent_profiles", sa.Column("phone", sa.String(), nullable=True))
    op.add_column("agent_profiles", sa.Column("role", sa.String(), nullable=True))

    # Backfill listing_type for existing rows, then set NOT NULL.
    op.execute("UPDATE agent_profiles SET listing_type = 'individual' WHERE listing_type IS NULL")
    op.alter_column("agent_profiles", "listing_type", nullable=False, server_default="individual")

    # Migrate tier values: basic -> verified, platinum -> highly_recommended.
    op.execute("UPDATE agent_profiles SET tier = 'verified' WHERE tier = 'basic'")
    op.execute("UPDATE agent_profiles SET tier = 'highly_recommended' WHERE tier = 'platinum'")


def downgrade() -> None:
    # Revert tier values.
    op.execute("UPDATE agent_profiles SET tier = 'basic' WHERE tier = 'verified'")
    op.execute("UPDATE agent_profiles SET tier = 'recommended' WHERE tier = 'recommended'")
    op.execute("UPDATE agent_profiles SET tier = 'highly_recommended' WHERE tier = 'platinum'")

    op.drop_column("agent_profiles", "role")
    op.drop_column("agent_profiles", "phone")
    op.drop_column("agent_profiles", "website")
    op.drop_column("agent_profiles", "listing_type")
