"""Manual payment ledger — records every payment received against a Checkpoint.

Stripe rail will integrate by also creating PaymentRecord rows on webhook,
but for v1 the consultant manually records the payment after receiving it
via bank transfer / PayID / BPAY / cash.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base

PAYMENT_METHODS = (
    "stripe_card",       # auto-confirmed via Stripe webhook (future)
    "stripe_becs",       # auto-confirmed via Stripe BECS (future)
    "bank_transfer",     # manual: EFT into firm's bank account
    "payid",             # manual: PayID transfer
    "bpay",              # manual: BPAY
    "cash",              # manual: in person
    "cheque",            # manual: cheque deposited
    "waived",            # manually waived (e.g., relative case, pro-bono)
    "other",
)


class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    checkpoint_id = Column(
        UUID(as_uuid=True),
        ForeignKey("checkpoints.id", ondelete="CASCADE"),
        nullable=True,  # nullable for ad-hoc payments not tied to a checkpoint
        index=True,
    )
    pre_case_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pre_cases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    case_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    method = Column(String, nullable=False)
    amount_aud = Column(Numeric(10, 2), nullable=False)
    reference = Column(String, nullable=True)  # bank ref / cheque no / Stripe charge id
    received_at = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)

    # Sequential per-org receipt number (e.g. 0001, 0002...) — generated at insert time
    receipt_number = Column(String, nullable=True, index=True)
    receipt_pdf_s3 = Column(String, nullable=True)

    recorded_by_seat_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class OrgReceiptCounter(Base):
    """Tracks the next receipt number per org. One row per org. Bumped atomically."""

    __tablename__ = "org_receipt_counters"

    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        primary_key=True,
    )
    next_number = Column(Integer, nullable=False, default=1)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
