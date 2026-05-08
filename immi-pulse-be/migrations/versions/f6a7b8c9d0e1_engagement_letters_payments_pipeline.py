"""engagement letters + payments + extended precase lifecycle

Adds:
- Pre-case lifecycle columns (qualified_at, letter_sent_at, letter_signed_at,
  paid_at, converted_at, skipped_letter, skipped_payment).
- Org bank/ABN/Stripe-Connect fields (abn, bsb, bank_*, payid, bpay_biller_code,
  stripe_connect_account_id, stripe_payouts_enabled).
- engagement_letter_templates, engagement_letters, signature_events.
- payment_records, org_receipt_counters.

All changes are additive — no destructive migrations, no data backfill needed.
Existing pre_cases.status values (pending/in_review/promoted/archived) keep
working; new statuses (qualified/letter_sent/letter_signed/paid/converted)
just become valid options.

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-05-01 09:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Extend pre_cases with lifecycle timestamps + manual-override audit ---
    op.add_column("pre_cases", sa.Column("qualified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("pre_cases", sa.Column("letter_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("pre_cases", sa.Column("letter_signed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("pre_cases", sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("pre_cases", sa.Column("converted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("pre_cases", sa.Column("skipped_letter", sa.String(), nullable=True))
    op.add_column("pre_cases", sa.Column("skipped_payment", sa.String(), nullable=True))

    # --- Extend organizations with payment details ---
    op.add_column("organizations", sa.Column("abn", sa.String(), nullable=True))
    op.add_column("organizations", sa.Column("bsb", sa.String(), nullable=True))
    op.add_column("organizations", sa.Column("bank_account_number", sa.String(), nullable=True))
    op.add_column("organizations", sa.Column("bank_account_name", sa.String(), nullable=True))
    op.add_column("organizations", sa.Column("payid", sa.String(), nullable=True))
    op.add_column("organizations", sa.Column("bpay_biller_code", sa.String(), nullable=True))
    op.add_column("organizations", sa.Column("stripe_connect_account_id", sa.String(), nullable=True))
    op.add_column(
        "organizations",
        sa.Column("stripe_payouts_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    # --- engagement_letter_templates ---
    op.create_table(
        "engagement_letter_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(), nullable=False, server_default="Standard engagement letter"),
        sa.Column("body_md", sa.Text(), nullable=False),
        sa.Column("fee_defaults", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_by_seat_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_engagement_letter_templates_org_id",
        "engagement_letter_templates",
        ["org_id"],
    )

    # --- engagement_letters ---
    op.create_table(
        "engagement_letters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "pre_case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pre_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "template_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("engagement_letter_templates.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("rendered_body_md", sa.Text(), nullable=False),
        sa.Column("rendered_html", sa.Text(), nullable=True),
        sa.Column("fee_lines", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="draft"),
        sa.Column("sign_token", sa.String(), nullable=True, unique=True),
        sa.Column("sign_pin_hash", sa.String(), nullable=True),
        sa.Column("sign_attempt_count", sa.Numeric(3, 0), nullable=False, server_default="0"),
        sa.Column("sign_link_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signed_pdf_s3", sa.String(), nullable=True),
        sa.Column("audit_cert_s3", sa.String(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("voided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_seat_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_engagement_letters_org_id", "engagement_letters", ["org_id"])
    op.create_index("ix_engagement_letters_pre_case_id", "engagement_letters", ["pre_case_id"])
    op.create_index("ix_engagement_letters_sign_token", "engagement_letters", ["sign_token"])

    # --- signature_events ---
    op.create_table(
        "signature_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "letter_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("engagement_letters.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("signer_name", sa.String(), nullable=False),
        sa.Column("signature_image_s3", sa.String(), nullable=True),
        sa.Column("body_hash_sha256", sa.String(), nullable=False),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("consent_text", sa.Text(), nullable=False),
        sa.Column("consent_given", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recorded_by_seat_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("manual_reason", sa.Text(), nullable=True),
    )
    op.create_index("ix_signature_events_letter_id", "signature_events", ["letter_id"])

    # --- payment_records ---
    op.create_table(
        "payment_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "checkpoint_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("checkpoints.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "pre_case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pre_cases.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "case_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("cases.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("method", sa.String(), nullable=False),
        sa.Column("amount_aud", sa.Numeric(10, 2), nullable=False),
        sa.Column("reference", sa.String(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("receipt_number", sa.String(), nullable=True),
        sa.Column("receipt_pdf_s3", sa.String(), nullable=True),
        sa.Column("recorded_by_seat_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_payment_records_org_id", "payment_records", ["org_id"])
    op.create_index("ix_payment_records_checkpoint_id", "payment_records", ["checkpoint_id"])
    op.create_index("ix_payment_records_pre_case_id", "payment_records", ["pre_case_id"])
    op.create_index("ix_payment_records_case_id", "payment_records", ["case_id"])
    op.create_index("ix_payment_records_receipt_number", "payment_records", ["receipt_number"])

    # --- org_receipt_counters ---
    op.create_table(
        "org_receipt_counters",
        sa.Column(
            "org_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("next_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("org_receipt_counters")

    op.drop_index("ix_payment_records_receipt_number", table_name="payment_records")
    op.drop_index("ix_payment_records_case_id", table_name="payment_records")
    op.drop_index("ix_payment_records_pre_case_id", table_name="payment_records")
    op.drop_index("ix_payment_records_checkpoint_id", table_name="payment_records")
    op.drop_index("ix_payment_records_org_id", table_name="payment_records")
    op.drop_table("payment_records")

    op.drop_index("ix_signature_events_letter_id", table_name="signature_events")
    op.drop_table("signature_events")

    op.drop_index("ix_engagement_letters_sign_token", table_name="engagement_letters")
    op.drop_index("ix_engagement_letters_pre_case_id", table_name="engagement_letters")
    op.drop_index("ix_engagement_letters_org_id", table_name="engagement_letters")
    op.drop_table("engagement_letters")

    op.drop_index("ix_engagement_letter_templates_org_id", table_name="engagement_letter_templates")
    op.drop_table("engagement_letter_templates")

    op.drop_column("organizations", "stripe_payouts_enabled")
    op.drop_column("organizations", "stripe_connect_account_id")
    op.drop_column("organizations", "bpay_biller_code")
    op.drop_column("organizations", "payid")
    op.drop_column("organizations", "bank_account_name")
    op.drop_column("organizations", "bank_account_number")
    op.drop_column("organizations", "bsb")
    op.drop_column("organizations", "abn")

    op.drop_column("pre_cases", "skipped_payment")
    op.drop_column("pre_cases", "skipped_letter")
    op.drop_column("pre_cases", "converted_at")
    op.drop_column("pre_cases", "paid_at")
    op.drop_column("pre_cases", "letter_signed_at")
    op.drop_column("pre_cases", "letter_sent_at")
    op.drop_column("pre_cases", "qualified_at")
