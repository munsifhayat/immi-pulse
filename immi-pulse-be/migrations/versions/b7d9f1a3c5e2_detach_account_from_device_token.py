"""detach community accounts from the browser's device token

Revision ID: b7d9f1a3c5e2
Revises: a3c5e7b9d1f4
Create Date: 2026-07-19

``anon_identities`` was simultaneously the browser row and the account row,
welded together by ``device_token NOT NULL UNIQUE``. That single column caused
four separate bugs, all the same bug: a browser and an account could not be
told apart.

  - Signing up on a browser that already had an account returned 409 "This
    device already has an account" — a dead end on any shared computer.
  - After logging out, the browser still resolved to the previous account, so
    an anonymous write was stamped with a stranger's pseudonym, their posts
    rendered as ``is_mine``, and their rate-limit bucket was charged.
  - Two browsers logging into one account converged on one ``device_token``.

The fix is structural: the column becomes nullable and every account row gives
its token up, so a device token can only ever address an *anonymous* row. An
account is reached by handle + password (a session), never by a browser.

The backfill is the load-bearing half of this migration. Without it, existing
rows keep their old binding and every consequence above survives the deploy.
"""

from alembic import op
import sqlalchemy as sa


revision = "b7d9f1a3c5e2"
down_revision = "a3c5e7b9d1f4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "anon_identities",
        "device_token",
        existing_type=sa.String(),
        nullable=True,
    )
    # Release every account row from the browser that claimed it. The token is
    # not reassigned: the browser that held it re-bootstraps a fresh anonymous
    # identity on its next call (an unknown token mints a new row), which is
    # exactly the "log out and you are a stranger again" behaviour we want.
    op.execute(
        "UPDATE anon_identities SET device_token = NULL WHERE password_hash IS NOT NULL"
    )


def downgrade() -> None:
    # NOT NULL cannot come back over the NULLs we just wrote, so synthesise a
    # token per row. Derived from the primary key so it is unique by
    # construction and the unique constraint re-applies cleanly. These tokens
    # are held by no browser, which is the point — downgrading cannot undo the
    # release, only restore the shape of the column.
    op.execute(
        "UPDATE anon_identities "
        "SET device_token = 'detached-' || replace(id::text, '-', '') "
        "WHERE device_token IS NULL"
    )
    op.alter_column(
        "anon_identities",
        "device_token",
        existing_type=sa.String(),
        nullable=False,
    )
