"""community_notifications + reply-email preference

The inbox. Until now the backend had no notification model at all, which meant
the core loop of a Q&A room was broken: you asked something, nothing told you
anyone had answered, and you never came back.

``community_notifications`` holds one row per "someone replied to you". The
recipient is an ``anon_identities`` row rather than an account specifically,
because that table is both — so a reply to a visitor who has not set a password
yet is waiting for them the moment they claim the account, with no backfill.

Both source FKs cascade on delete: an inbox entry pointing at a post that no
longer exists is worse than no entry. ``status`` is how moderation removes an
entry without deleting the audit trail, and ``email_sent_at`` is the batching
key — at most one email per (recipient, thread, UTC day), so a question that
catches fire sends one email rather than twenty.

``anon_identities.notify_replies_email`` defaults to true because supplying an
email at signup is itself the opt-in: the field is offered with "so we can tell
you when someone replies" attached. It exists so there is a real off-switch to
hang an unsubscribe on. With no address on file the column is inert.

Revision ID: c5e7a9b1d3f6
Revises: b3d5f7a9c1e4
Create Date: 2026-07-18 17:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "c5e7a9b1d3f6"
down_revision: Union[str, None] = "b3d5f7a9c1e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "community_notifications",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "recipient_identity_id",
            UUID(as_uuid=True),
            sa.ForeignKey("anon_identities.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # reply_to_post | reply_to_comment
        sa.Column("type", sa.String(), nullable=False),
        sa.Column(
            "journey_id",
            UUID(as_uuid=True),
            sa.ForeignKey("community_journeys.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "comment_id",
            UUID(as_uuid=True),
            sa.ForeignKey("community_journey_comments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_comment_id",
            UUID(as_uuid=True),
            sa.ForeignKey("community_journey_comments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "actor_identity_id",
            UUID(as_uuid=True),
            sa.ForeignKey("anon_identities.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("actor_handle", sa.String(), nullable=False),
        sa.Column("actor_color", sa.String(), nullable=False),
        sa.Column("preview", sa.String(), nullable=True),
        sa.Column("context_title", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("email_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )

    # The inbox query is always "this recipient, newest first"; the badge adds
    # "and unread". Both ride this index.
    op.create_index(
        "ix_community_notifications_recipient_identity_id",
        "community_notifications",
        ["recipient_identity_id"],
        unique=False,
    )
    op.create_index(
        "ix_community_notifications_created_at",
        "community_notifications",
        ["created_at"],
        unique=False,
    )
    op.create_index(
        "ix_community_notifications_status",
        "community_notifications",
        ["status"],
        unique=False,
    )
    # Moderation hides by source row, and the batching check looks up by thread.
    op.create_index(
        "ix_community_notifications_journey_id",
        "community_notifications",
        ["journey_id"],
        unique=False,
    )
    op.create_index(
        "ix_community_notifications_comment_id",
        "community_notifications",
        ["comment_id"],
        unique=False,
    )
    op.create_index(
        "ix_community_notifications_actor_identity_id",
        "community_notifications",
        ["actor_identity_id"],
        unique=False,
    )

    op.add_column(
        "anon_identities",
        sa.Column(
            "notify_replies_email",
            sa.Boolean(),
            nullable=False,
            server_default="true",
        ),
    )


def downgrade() -> None:
    op.drop_column("anon_identities", "notify_replies_email")
    op.drop_index(
        "ix_community_notifications_actor_identity_id",
        table_name="community_notifications",
    )
    op.drop_index(
        "ix_community_notifications_comment_id", table_name="community_notifications"
    )
    op.drop_index(
        "ix_community_notifications_journey_id", table_name="community_notifications"
    )
    op.drop_index(
        "ix_community_notifications_status", table_name="community_notifications"
    )
    op.drop_index(
        "ix_community_notifications_created_at", table_name="community_notifications"
    )
    op.drop_index(
        "ix_community_notifications_recipient_identity_id",
        table_name="community_notifications",
    )
    op.drop_table("community_notifications")
