"""client portal accounts + org portal_slug

Phase 1 — persistent, org-scoped client portal accounts (created at qualify),
replacing the per-action PIN flow as the primary path. Adds:
  - organizations.portal_slug (unique per-agent portal entry point), backfilled
  - client_portal_accounts table with UNIQUE(org_id, email) — NOT globally unique

Revision ID: f7b1c9d2e4a8
Revises: e2f4a8b1c3d5
Create Date: 2026-06-19 10:00:00.000000
"""
import re
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = 'f7b1c9d2e4a8'
down_revision: Union[str, None] = 'e2f4a8b1c3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "firm"


def upgrade() -> None:
    # --- organizations.portal_slug ---
    op.add_column('organizations', sa.Column('portal_slug', sa.String(), nullable=True))
    op.create_index(
        op.f('ix_organizations_portal_slug'), 'organizations', ['portal_slug'], unique=True
    )

    # Backfill a unique slug for existing orgs.
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, name FROM organizations ORDER BY created_at")).fetchall()
    used: set[str] = set()
    for row in rows:
        base = _slugify(row[1])[:40]
        slug = base
        n = 2
        while slug in used:
            slug = f"{base}-{n}"
            n += 1
        used.add(slug)
        bind.execute(
            sa.text("UPDATE organizations SET portal_slug = :slug WHERE id = :id"),
            {"slug": slug, "id": row[0]},
        )

    # --- client_portal_accounts ---
    op.create_table(
        'client_portal_accounts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('temp_password_encrypted', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='invited'),
        sa.Column('must_reset', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('failed_login_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('org_id', 'email', name='uq_portal_account_org_email'),
    )
    op.create_index(
        op.f('ix_client_portal_accounts_org_id'), 'client_portal_accounts', ['org_id']
    )
    op.create_index(
        op.f('ix_client_portal_accounts_client_id'), 'client_portal_accounts', ['client_id']
    )
    op.create_index(
        op.f('ix_client_portal_accounts_email'), 'client_portal_accounts', ['email']
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_client_portal_accounts_email'), table_name='client_portal_accounts')
    op.drop_index(op.f('ix_client_portal_accounts_client_id'), table_name='client_portal_accounts')
    op.drop_index(op.f('ix_client_portal_accounts_org_id'), table_name='client_portal_accounts')
    op.drop_table('client_portal_accounts')
    op.drop_index(op.f('ix_organizations_portal_slug'), table_name='organizations')
    op.drop_column('organizations', 'portal_slug')
