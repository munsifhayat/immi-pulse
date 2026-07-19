"""community accounts — evolve anon_identities into the account table

Additive, and deliberately so. Rather than adding a parallel ``community_accounts``
table, the existing ``anon_identities`` row grows the columns that make it an
account: a password, an optional email, and the login bookkeeping around them.

Every ``community_journeys`` / ``community_journey_comments`` / ``community_votes``
row already FKs to ``anon_identities.id``, so an existing anonymous identity
becomes a claimable account with **zero content migration** — the member keeps
their handle and every post they made before signing up.

``email`` is nullable and unique-when-present: optional by design (it exists only
for password recovery and reply notifications), but no two accounts may share one.
Postgres treats NULLs as distinct in a unique index, so any number of
email-less accounts coexist happily under the same constraint.

Revision ID: f1a3c5e7b9d2
Revises: e5f7a9c1b3d5
Create Date: 2026-07-18 10:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f1a3c5e7b9d2"
down_revision: Union[str, None] = "e5f7a9c1b3d5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "anon_identities", sa.Column("password_hash", sa.String(), nullable=True)
    )
    op.add_column("anon_identities", sa.Column("email", sa.String(), nullable=True))
    op.add_column(
        "anon_identities",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "anon_identities",
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "anon_identities",
        sa.Column(
            "failed_login_count", sa.Integer(), nullable=False, server_default="0"
        ),
    )
    op.add_column(
        "anon_identities",
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "anon_identities", sa.Column("recovery_token_hash", sa.String(), nullable=True)
    )
    op.add_column(
        "anon_identities",
        sa.Column("recovery_expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Unique-when-present: NULLs are distinct in Postgres, so email-less
    # accounts (the common case) never collide with each other.
    op.create_index(
        "ix_anon_identities_email", "anon_identities", ["email"], unique=True
    )
    op.create_index(
        "ix_anon_identities_recovery_token_hash",
        "anon_identities",
        ["recovery_token_hash"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_anon_identities_recovery_token_hash", table_name="anon_identities")
    op.drop_index("ix_anon_identities_email", table_name="anon_identities")
    op.drop_column("anon_identities", "recovery_expires_at")
    op.drop_column("anon_identities", "recovery_token_hash")
    op.drop_column("anon_identities", "locked_until")
    op.drop_column("anon_identities", "failed_login_count")
    op.drop_column("anon_identities", "last_login_at")
    op.drop_column("anon_identities", "email_verified_at")
    op.drop_column("anon_identities", "email")
    op.drop_column("anon_identities", "password_hash")
