"""split anon_identities.email into email_pending / email_verified

Revision ID: a3c5e7b9d1f4
Revises: f2a4c6e8b0d3
Create Date: 2026-07-19

Email is about to become **required** at signup and is still not verified, so
the single unique ``email`` column becomes an availability hole: anyone could
sign up with a stranger's address and permanently occupy it, leaving the real
owner unable to ever attach their own. That is account pre-hijacking
(Sudhodanan & Paverd, USENIX Security 2022 — present in 35 of 75 popular
services), and required-but-unverified email is precisely the condition that
makes it exploitable.

The fix is structural rather than procedural: an unverified claim goes in
``email_pending``, which carries **no** unique constraint and therefore cannot
deny anyone anything. Only proven ownership reaches ``email_verified``, which
keeps the unique constraint.

Every existing address moves to ``email_pending``: no verification flow has ever
existed in this codebase (``email_verified_at`` is written by nothing), so
treating any of them as verified would be a lie the schema then enforces.
"""

from alembic import op
import sqlalchemy as sa


revision = "a3c5e7b9d1f4"
down_revision = "f2a4c6e8b0d3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "anon_identities", sa.Column("email_pending", sa.String(), nullable=True)
    )
    op.add_column(
        "anon_identities", sa.Column("email_verified", sa.String(), nullable=True)
    )
    op.create_index(
        "ix_anon_identities_email_pending", "anon_identities", ["email_pending"]
    )
    op.create_index(
        "ix_anon_identities_email_verified",
        "anon_identities",
        ["email_verified"],
        unique=True,
    )

    # Nothing has ever been verified, so everything is pending.
    op.execute("UPDATE anon_identities SET email_pending = email WHERE email IS NOT NULL")

    op.drop_index("ix_anon_identities_email", table_name="anon_identities")
    op.drop_column("anon_identities", "email")


def downgrade() -> None:
    op.add_column("anon_identities", sa.Column("email", sa.String(), nullable=True))
    op.execute(
        "UPDATE anon_identities SET email = COALESCE(email_verified, email_pending)"
    )
    op.create_index(
        "ix_anon_identities_email", "anon_identities", ["email"], unique=True
    )
    op.drop_index("ix_anon_identities_email_verified", table_name="anon_identities")
    op.drop_index("ix_anon_identities_email_pending", table_name="anon_identities")
    op.drop_column("anon_identities", "email_verified")
    op.drop_column("anon_identities", "email_pending")
