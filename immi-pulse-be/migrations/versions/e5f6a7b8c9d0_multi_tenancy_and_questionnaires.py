"""multi-tenancy + questionnaires + precases + checkpoints

Adds the multi-tenant foundation (organizations, seats, subscriptions,
credit_wallets, pilot_programs) plus the new domain entities (clients,
client_org_links, questionnaires, questionnaire_versions,
questionnaire_responses, pre_cases, checkpoints, seat_invites).

Extends users with password_hash + email_verified for local auth.
Extends cases with org_id, client_id, pre_case_id (all nullable) so
existing rows survive without backfill.

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-27 12:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Extend users for local auth ---
    op.add_column("users", sa.Column("password_hash", sa.String(), nullable=True))
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.true()))

    # --- organizations ---
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("niche", sa.Text(), nullable=True),
        sa.Column("omara_number", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=False, server_default="AU"),
        sa.Column("stripe_customer_id", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_organizations_name", "organizations", ["name"])

    # --- subscriptions ---
    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tier", sa.String(), nullable=False, server_default="starter"),
        sa.Column("status", sa.String(), nullable=False, server_default="trial"),
        sa.Column("seat_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("entitlements", postgresql.JSONB(), nullable=True),
        sa.Column("pilot_program_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("stripe_subscription_id", sa.String(), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_subscriptions_org_id", "subscriptions", ["org_id"])

    # --- credit_wallets ---
    op.create_table(
        "credit_wallets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("balance", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("monthly_grant", sa.Integer(), nullable=False, server_default="1000"),
        sa.Column("grant_resets_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("low_balance_alerted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    # --- pilot_programs ---
    op.create_table(
        "pilot_programs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(), nullable=False, unique=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("credit_grant", sa.Integer(), nullable=False, server_default="5000"),
        sa.Column("tier_override", sa.String(), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_redemptions", sa.Integer(), nullable=True),
        sa.Column("redemptions_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_pilot_programs_code", "pilot_programs", ["code"], unique=True)

    # --- seats ---
    op.create_table(
        "seats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("invited_email", sa.String(), nullable=True),
        sa.Column("role", sa.String(), nullable=False, server_default="consultant"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("omara_number", sa.String(), nullable=True),
        sa.Column("invited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("org_id", "user_id", name="uq_seats_org_user"),
    )
    op.create_index("ix_seats_org_id", "seats", ["org_id"])
    op.create_index("ix_seats_user_id", "seats", ["user_id"])

    # --- seat_invites ---
    op.create_table(
        "seat_invites",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="consultant"),
        sa.Column("token", sa.String(), nullable=False, unique=True),
        sa.Column("invited_by_seat_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_seat_invites_token", "seat_invites", ["token"], unique=True)
    op.create_index("ix_seat_invites_email", "seat_invites", ["email"])

    # --- clients ---
    op.create_table(
        "clients",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("primary_email", sa.String(), nullable=False, unique=True),
        sa.Column("name", sa.String(), nullable=True),
        sa.Column("phone", sa.String(), nullable=True),
        sa.Column("country", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_clients_primary_email", "clients", ["primary_email"], unique=True)

    # --- client_org_links ---
    op.create_table(
        "client_org_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("primary_seat_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("first_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("client_id", "org_id", name="uq_client_org"),
    )
    op.create_index("ix_client_org_links_org_id", "client_org_links", ["org_id"])
    op.create_index("ix_client_org_links_client_id", "client_org_links", ["client_id"])

    # --- questionnaires ---
    op.create_table(
        "questionnaires",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("slug", sa.String(), nullable=False, unique=True),
        sa.Column("audience", sa.String(), nullable=False, server_default="general"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("current_version_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_by_seat_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_questionnaires_slug", "questionnaires", ["slug"], unique=True)
    op.create_index("ix_questionnaires_org_id", "questionnaires", ["org_id"])

    # --- questionnaire_versions ---
    op.create_table(
        "questionnaire_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("questionnaire_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("questionnaires.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("schema", postgresql.JSONB(), nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_questionnaire_versions_q_id", "questionnaire_versions", ["questionnaire_id"])

    # --- questionnaire_responses ---
    op.create_table(
        "questionnaire_responses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("questionnaire_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("questionnaires.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("questionnaire_versions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
        sa.Column("answers", postgresql.JSONB(), nullable=False),
        sa.Column("submitter_email", sa.String(), nullable=False),
        sa.Column("submitter_name", sa.String(), nullable=True),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_q_responses_org_id", "questionnaire_responses", ["org_id"])
    op.create_index("ix_q_responses_client_id", "questionnaire_responses", ["client_id"])

    # --- pre_cases ---
    op.create_table(
        "pre_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("client_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("clients.id", ondelete="SET NULL"), nullable=True),
        sa.Column("response_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("questionnaire_responses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source", sa.String(), nullable=False, server_default="questionnaire"),
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("ai_suggested_outcome", sa.String(), nullable=True),
        sa.Column("ai_extracted", postgresql.JSONB(), nullable=True),
        sa.Column("ai_confidence", sa.Float(), nullable=True),
        sa.Column("ai_status", sa.String(), nullable=False, server_default="pending"),
        sa.Column("assigned_seat_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("promoted_case_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_pre_cases_org_id", "pre_cases", ["org_id"])
    op.create_index("ix_pre_cases_status", "pre_cases", ["status"])
    op.create_index("ix_pre_cases_client_id", "pre_cases", ["client_id"])

    # --- checkpoints ---
    op.create_table(
        "checkpoints",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="CASCADE"), nullable=True),
        sa.Column("pre_case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("pre_cases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("type", sa.String(), nullable=False, server_default="custom"),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount_aud", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("blocking", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("payment_link_url", sa.String(), nullable=True),
        sa.Column("stripe_session_id", sa.String(), nullable=True),
        sa.Column("created_by_seat_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_checkpoints_org_id", "checkpoints", ["org_id"])
    op.create_index("ix_checkpoints_case_id", "checkpoints", ["case_id"])
    op.create_index("ix_checkpoints_pre_case_id", "checkpoints", ["pre_case_id"])

    # --- Extend cases table ---
    op.add_column("cases", sa.Column("org_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("cases", sa.Column("client_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("cases", sa.Column("pre_case_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_cases_org_id", "cases", "organizations", ["org_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_cases_client_id", "cases", "clients", ["client_id"], ["id"], ondelete="SET NULL")
    op.create_foreign_key("fk_cases_pre_case_id", "cases", "pre_cases", ["pre_case_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_cases_org_id", "cases", ["org_id"])
    op.create_index("ix_cases_client_id", "cases", ["client_id"])


def downgrade() -> None:
    op.drop_index("ix_cases_client_id", table_name="cases")
    op.drop_index("ix_cases_org_id", table_name="cases")
    op.drop_constraint("fk_cases_pre_case_id", "cases", type_="foreignkey")
    op.drop_constraint("fk_cases_client_id", "cases", type_="foreignkey")
    op.drop_constraint("fk_cases_org_id", "cases", type_="foreignkey")
    op.drop_column("cases", "pre_case_id")
    op.drop_column("cases", "client_id")
    op.drop_column("cases", "org_id")

    op.drop_table("checkpoints")
    op.drop_table("pre_cases")
    op.drop_table("questionnaire_responses")
    op.drop_table("questionnaire_versions")
    op.drop_table("questionnaires")
    op.drop_table("client_org_links")
    op.drop_table("clients")
    op.drop_table("seat_invites")
    op.drop_table("seats")
    op.drop_table("pilot_programs")
    op.drop_table("credit_wallets")
    op.drop_table("subscriptions")
    op.drop_table("organizations")

    op.drop_column("users", "email_verified")
    op.drop_column("users", "password_hash")
