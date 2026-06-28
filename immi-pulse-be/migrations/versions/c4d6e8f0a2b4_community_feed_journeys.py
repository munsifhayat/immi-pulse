"""community feed v2 — journeys, milestones, anon identities, votes, comments

Additive. Introduces the unified feed (a "journey" is a timeline OR a question
post), the per-device anonymous identity + guardrail layer (one-timeline cap,
one-vote dedup), flat one-level conversations, and a back-link from the legacy
``community_timelines`` stats rows to the journey they were derived from. No
destructive changes — the existing wait-check / processing engine is untouched.

Revision ID: c4d6e8f0a2b4
Revises: b2d4f6a8c1e3
Create Date: 2026-06-28 14:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c4d6e8f0a2b4"
down_revision: Union[str, None] = "b2d4f6a8c1e3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- anon_identities -----------------------------------------------------
    op.create_table(
        "anon_identities",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("device_token", sa.String(), nullable=False),
        sa.Column("handle", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=False),
        sa.Column("journeys_posted", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("ip_hash", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("device_token", name="uq_anon_identity_device_token"),
        sa.UniqueConstraint("handle", name="uq_anon_identity_handle"),
    )
    op.create_index(
        op.f("ix_anon_identities_device_token"),
        "anon_identities",
        ["device_token"],
    )
    op.create_index(
        op.f("ix_anon_identities_handle"), "anon_identities", ["handle"]
    )
    op.create_index(
        op.f("ix_anon_identities_user_id"), "anon_identities", ["user_id"]
    )
    op.create_index(
        op.f("ix_anon_identities_ip_hash"), "anon_identities", ["ip_hash"]
    )

    # --- community_journeys --------------------------------------------------
    op.create_table(
        "community_journeys",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("identity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("post_type", sa.String(), nullable=False, server_default="timeline"),
        sa.Column("subclass_slug", sa.String(), nullable=True),
        sa.Column("category_slug", sa.String(), nullable=True),
        sa.Column("stream", sa.String(), nullable=True),
        sa.Column("occupation", sa.String(), nullable=True),
        sa.Column("state", sa.String(), nullable=True),
        sa.Column("area", sa.String(), nullable=True),
        sa.Column("sponsor_type", sa.String(), nullable=True),
        sa.Column("outcome", sa.String(), nullable=False, server_default="waiting"),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("handle", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=False),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("comment_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "is_sample", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("lodged_on", sa.Date(), nullable=True),
        sa.Column("decided_on", sa.Date(), nullable=True),
        sa.Column("processing_days", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["identity_id"], ["anon_identities.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_community_journeys_identity_id"),
        "community_journeys",
        ["identity_id"],
    )
    op.create_index(
        op.f("ix_community_journeys_post_type"), "community_journeys", ["post_type"]
    )
    op.create_index(
        op.f("ix_community_journeys_subclass_slug"),
        "community_journeys",
        ["subclass_slug"],
    )
    op.create_index(
        op.f("ix_community_journeys_category_slug"),
        "community_journeys",
        ["category_slug"],
    )
    op.create_index(
        op.f("ix_community_journeys_outcome"), "community_journeys", ["outcome"]
    )
    op.create_index(
        op.f("ix_community_journeys_is_sample"), "community_journeys", ["is_sample"]
    )
    op.create_index(
        op.f("ix_community_journeys_status"), "community_journeys", ["status"]
    )
    op.create_index(
        op.f("ix_community_journeys_created_at"),
        "community_journeys",
        ["created_at"],
    )

    # --- community_journey_milestones ----------------------------------------
    op.create_table(
        "community_journey_milestones",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("journey_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("milestone_type", sa.String(), nullable=False),
        sa.Column("occurred_on", sa.Date(), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("label", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(
            ["journey_id"], ["community_journeys.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_community_journey_milestones_journey_id"),
        "community_journey_milestones",
        ["journey_id"],
    )

    # --- community_journey_comments ------------------------------------------
    op.create_table(
        "community_journey_comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("journey_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "parent_comment_id", postgresql.UUID(as_uuid=True), nullable=True
        ),
        sa.Column("identity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("handle", sa.String(), nullable=False),
        sa.Column("color", sa.String(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("upvotes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["journey_id"], ["community_journeys.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["parent_comment_id"],
            ["community_journey_comments.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["identity_id"], ["anon_identities.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_community_journey_comments_journey_id"),
        "community_journey_comments",
        ["journey_id"],
    )
    op.create_index(
        op.f("ix_community_journey_comments_parent_comment_id"),
        "community_journey_comments",
        ["parent_comment_id"],
    )
    op.create_index(
        op.f("ix_community_journey_comments_identity_id"),
        "community_journey_comments",
        ["identity_id"],
    )
    op.create_index(
        op.f("ix_community_journey_comments_status"),
        "community_journey_comments",
        ["status"],
    )
    op.create_index(
        op.f("ix_community_journey_comments_created_at"),
        "community_journey_comments",
        ["created_at"],
    )

    # --- community_votes -----------------------------------------------------
    op.create_table(
        "community_votes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("identity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("target_type", sa.String(), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["identity_id"], ["anon_identities.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "identity_id",
            "target_type",
            "target_id",
            name="uq_community_vote_identity_target",
        ),
    )
    op.create_index(
        op.f("ix_community_votes_identity_id"), "community_votes", ["identity_id"]
    )
    op.create_index(
        op.f("ix_community_votes_target_id"), "community_votes", ["target_id"]
    )

    # --- community_timelines.journey_id (back-link for stats provenance) ------
    op.add_column(
        "community_timelines",
        sa.Column("journey_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        op.f("ix_community_timelines_journey_id"),
        "community_timelines",
        ["journey_id"],
    )
    op.create_foreign_key(
        "fk_community_timelines_journey_id",
        "community_timelines",
        "community_journeys",
        ["journey_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_community_timelines_journey_id",
        "community_timelines",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_community_timelines_journey_id"), table_name="community_timelines"
    )
    op.drop_column("community_timelines", "journey_id")

    op.drop_table("community_votes")
    op.drop_table("community_journey_comments")
    op.drop_table("community_journey_milestones")
    op.drop_table("community_journeys")
    op.drop_table("anon_identities")
