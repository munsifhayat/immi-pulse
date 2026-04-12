"""immigration domain tables

Adds users, cases, case_documents, case_portal_tokens, case_timeline_events,
agent_profiles, community_spaces, community_threads, community_comments,
community_reports. Runs after the property-pulse legacy drop so the DB is
clean before these arrive.

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-11 13:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=True),
        sa.Column("last_name", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=False, server_default="consultant"),
        sa.Column("tdop_user_id", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_tdop_user_id", "users", ["tdop_user_id"], unique=False)

    # --- cases ---
    op.create_table(
        "cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_name", sa.String(), nullable=False),
        sa.Column("client_email", sa.String(), nullable=True),
        sa.Column("client_phone", sa.String(), nullable=True),
        sa.Column(
            "consultant_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("visa_subclass", sa.String(), nullable=True),
        sa.Column("visa_name", sa.String(), nullable=True),
        sa.Column("stage", sa.String(), nullable=False, server_default="inquiry"),
        sa.Column("priority", sa.String(), nullable=False, server_default="normal"),
        sa.Column("source", sa.String(), nullable=False, server_default="manual"),
        sa.Column("source_message_id", sa.String(), nullable=True),
        sa.Column("source_mailbox", sa.String(), nullable=True),
        sa.Column("lodgement_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decision_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_cases_client_email", "cases", ["client_email"])
    op.create_index("ix_cases_consultant_id", "cases", ["consultant_id"])
    op.create_index("ix_cases_stage", "cases", ["stage"])
    op.create_index("ix_cases_source_message_id", "cases", ["source_message_id"])

    # --- case_documents ---
    op.create_table(
        "case_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("document_type", sa.String(), nullable=True),
        sa.Column("file_name", sa.String(), nullable=False),
        sa.Column("s3_key", sa.String(), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("content_type", sa.String(), nullable=True),
        sa.Column("uploaded_by_type", sa.String(), nullable=False, server_default="client"),
        sa.Column(
            "uploaded_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("ai_analysis", postgresql.JSONB(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "reviewed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("review_notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_case_documents_case_id", "case_documents", ["case_id"])
    op.create_index("ix_case_documents_status", "case_documents", ["status"])

    # --- case_portal_tokens ---
    op.create_table(
        "case_portal_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("pin_hash", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "created_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.create_index("ix_case_portal_tokens_case_id", "case_portal_tokens", ["case_id"])

    # --- case_timeline_events ---
    op.create_table(
        "case_timeline_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("actor_type", sa.String(), nullable=False),
        sa.Column(
            "actor_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("event_payload", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_case_timeline_events_case_id", "case_timeline_events", ["case_id"])
    op.create_index("ix_case_timeline_events_created_at", "case_timeline_events", ["created_at"])

    # --- agent_profiles ---
    op.create_table(
        "agent_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("firm_name", sa.String(), nullable=True),
        sa.Column("omara_number", sa.String(), nullable=False),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("city", sa.String(), nullable=True),
        sa.Column("state", sa.String(), nullable=True),
        sa.Column("specializations", postgresql.JSONB(), nullable=True),
        sa.Column("languages", postgresql.JSONB(), nullable=True),
        sa.Column("years_experience", sa.Integer(), nullable=True),
        sa.Column("consultation_fee", sa.Float(), nullable=True),
        sa.Column("response_time_hours", sa.Integer(), nullable=True),
        sa.Column("tier", sa.String(), nullable=False, server_default="basic"),
        sa.Column("status", sa.String(), nullable=False, server_default="pending_review"),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("avatar_color", sa.String(), nullable=True),
        sa.Column("rating", sa.Float(), nullable=False, server_default="0"),
        sa.Column("review_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "approved_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", name="uq_agent_profiles_user_id"),
    )
    op.create_index("ix_agent_profiles_user_id", "agent_profiles", ["user_id"])
    op.create_index("ix_agent_profiles_omara_number", "agent_profiles", ["omara_number"])
    op.create_index("ix_agent_profiles_city", "agent_profiles", ["city"])
    op.create_index("ix_agent_profiles_state", "agent_profiles", ["state"])
    op.create_index("ix_agent_profiles_tier", "agent_profiles", ["tier"])
    op.create_index("ix_agent_profiles_status", "agent_profiles", ["status"])

    # --- community_spaces ---
    op.create_table(
        "community_spaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("icon", sa.String(), nullable=True),
        sa.Column("member_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("thread_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("slug", name="uq_community_spaces_slug"),
    )
    op.create_index("ix_community_spaces_slug", "community_spaces", ["slug"], unique=True)

    # --- community_threads ---
    op.create_table(
        "community_threads",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "space_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("community_spaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("author_display_name", sa.String(), nullable=True),
        sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("author_ip_hash", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reply_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("view_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_pinned", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_community_threads_space_id", "community_threads", ["space_id"])
    op.create_index("ix_community_threads_author_ip_hash", "community_threads", ["author_ip_hash"])
    op.create_index("ix_community_threads_status", "community_threads", ["status"])
    op.create_index("ix_community_threads_created_at", "community_threads", ["created_at"])

    # --- community_comments ---
    op.create_table(
        "community_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "thread_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("community_threads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_comment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("community_comments.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "author_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("author_display_name", sa.String(), nullable=True),
        sa.Column("is_anonymous", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("author_ip_hash", sa.String(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_community_comments_thread_id", "community_comments", ["thread_id"])
    op.create_index("ix_community_comments_parent_comment_id", "community_comments", ["parent_comment_id"])
    op.create_index("ix_community_comments_author_ip_hash", "community_comments", ["author_ip_hash"])
    op.create_index("ix_community_comments_status", "community_comments", ["status"])
    op.create_index("ix_community_comments_created_at", "community_comments", ["created_at"])

    # --- community_reports ---
    op.create_table(
        "community_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("target_type", sa.String(), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "reporter_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reporter_ip_hash", sa.String(), nullable=True),
        sa.Column("reason", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "resolved_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("resolution_note", sa.Text(), nullable=True),
    )
    op.create_index("ix_community_reports_target_id", "community_reports", ["target_id"])
    op.create_index("ix_community_reports_status", "community_reports", ["status"])


def downgrade() -> None:
    op.drop_index("ix_community_reports_status", table_name="community_reports")
    op.drop_index("ix_community_reports_target_id", table_name="community_reports")
    op.drop_table("community_reports")

    op.drop_index("ix_community_comments_created_at", table_name="community_comments")
    op.drop_index("ix_community_comments_status", table_name="community_comments")
    op.drop_index("ix_community_comments_author_ip_hash", table_name="community_comments")
    op.drop_index("ix_community_comments_parent_comment_id", table_name="community_comments")
    op.drop_index("ix_community_comments_thread_id", table_name="community_comments")
    op.drop_table("community_comments")

    op.drop_index("ix_community_threads_created_at", table_name="community_threads")
    op.drop_index("ix_community_threads_status", table_name="community_threads")
    op.drop_index("ix_community_threads_author_ip_hash", table_name="community_threads")
    op.drop_index("ix_community_threads_space_id", table_name="community_threads")
    op.drop_table("community_threads")

    op.drop_index("ix_community_spaces_slug", table_name="community_spaces")
    op.drop_table("community_spaces")

    op.drop_index("ix_agent_profiles_status", table_name="agent_profiles")
    op.drop_index("ix_agent_profiles_tier", table_name="agent_profiles")
    op.drop_index("ix_agent_profiles_state", table_name="agent_profiles")
    op.drop_index("ix_agent_profiles_city", table_name="agent_profiles")
    op.drop_index("ix_agent_profiles_omara_number", table_name="agent_profiles")
    op.drop_index("ix_agent_profiles_user_id", table_name="agent_profiles")
    op.drop_table("agent_profiles")

    op.drop_index("ix_case_timeline_events_created_at", table_name="case_timeline_events")
    op.drop_index("ix_case_timeline_events_case_id", table_name="case_timeline_events")
    op.drop_table("case_timeline_events")

    op.drop_index("ix_case_portal_tokens_case_id", table_name="case_portal_tokens")
    op.drop_table("case_portal_tokens")

    op.drop_index("ix_case_documents_status", table_name="case_documents")
    op.drop_index("ix_case_documents_case_id", table_name="case_documents")
    op.drop_table("case_documents")

    op.drop_index("ix_cases_source_message_id", table_name="cases")
    op.drop_index("ix_cases_stage", table_name="cases")
    op.drop_index("ix_cases_consultant_id", table_name="cases")
    op.drop_index("ix_cases_client_email", table_name="cases")
    op.drop_table("cases")

    op.drop_index("ix_users_tdop_user_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
