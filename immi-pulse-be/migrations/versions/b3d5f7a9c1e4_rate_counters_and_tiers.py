"""rate_counters + trust-tier columns

Two changes, one purpose: make the anti-abuse layer real before the room is
public.

1. ``rate_counters`` — write allowances move out of a module-level dict and
   into Postgres. The dict was wrong in a way that only appears in production:
   counters vanished on every dyno restart, and each dyno kept its own tally,
   so the effective limit was the configured one multiplied by the dyno count.

   Keyed on ``(scope_type, scope_key, action, window_start)`` with a ``count``.
   ``window_start`` is UTC midnight, so buckets are fixed days rather than a
   rolling window — that is what lets an increment be a single
   ``INSERT … ON CONFLICT DO UPDATE … RETURNING``, which two concurrent
   requests cannot interleave. The unique constraint is not a nicety here; the
   upsert names it directly.

   Rows are disposable. Old windows may be swept, and an operator may delete a
   scope's rows outright to clear a shared campus/CGNAT address that tripped
   the ceiling honestly — which is what makes it a ceiling and not a ban.

2. Trust-tier columns on ``anon_identities``. The ladder is T0 Visitor · T1 New
   · T2 Established · T3 Trusted · T4 Registered professional. ``trust_tier``
   defaults to 1 (T1) because it only means anything once a password exists; a
   row with no password is read as T0 regardless of what is stored. Promotion
   itself — what earns T2 or T3, and the nightly job that decides it — is a
   later phase. These columns are where that job will write its conclusion.

Revision ID: b3d5f7a9c1e4
Revises: f1a3c5e7b9d2
Create Date: 2026-07-18 14:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "b3d5f7a9c1e4"
down_revision: Union[str, None] = "f1a3c5e7b9d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "rate_counters",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("scope_type", sa.String(), nullable=False),  # account | ip
        sa.Column("scope_key", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),  # post | reply | report
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        # Named explicitly: the ON CONFLICT clause in service.consume_rate
        # targets this constraint by name, so renaming it breaks the limiter.
        sa.UniqueConstraint(
            "scope_type",
            "scope_key",
            "action",
            "window_start",
            name="uq_rate_counter_scope_action_window",
        ),
    )
    op.create_index(
        "ix_rate_counters_scope_type", "rate_counters", ["scope_type"], unique=False
    )
    op.create_index(
        "ix_rate_counters_scope_key", "rate_counters", ["scope_key"], unique=False
    )
    # Sweeping expired buckets is a range scan on this column.
    op.create_index(
        "ix_rate_counters_window_start",
        "rate_counters",
        ["window_start"],
        unique=False,
    )

    op.add_column(
        "anon_identities",
        sa.Column("trust_tier", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "anon_identities",
        sa.Column("tier_computed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "anon_identities",
        sa.Column("upheld_reports", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "anon_identities",
        sa.Column(
            "shadow_limited", sa.Boolean(), nullable=False, server_default="false"
        ),
    )


def downgrade() -> None:
    op.drop_column("anon_identities", "shadow_limited")
    op.drop_column("anon_identities", "upheld_reports")
    op.drop_column("anon_identities", "tier_computed_at")
    op.drop_column("anon_identities", "trust_tier")
    op.drop_index("ix_rate_counters_window_start", table_name="rate_counters")
    op.drop_index("ix_rate_counters_scope_key", table_name="rate_counters")
    op.drop_index("ix_rate_counters_scope_type", table_name="rate_counters")
    op.drop_table("rate_counters")
