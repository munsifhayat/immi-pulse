"""Checkpoint — a consultant-defined payment point on a Case (or PreCase pre-promotion)."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base

CHECKPOINT_TYPES = (
    "consultation_fee",
    "retainer",
    "milestone",
    "lodgement_fee",
    "custom",
)
CHECKPOINT_STATUSES = ("draft", "sent", "paid", "refunded", "waived", "canceled")


class Checkpoint(Base):
    __tablename__ = "checkpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    case_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    pre_case_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pre_cases.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    type = Column(String, nullable=False, default="custom")
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    amount_aud = Column(Numeric(10, 2), nullable=False, default=0)
    blocking = Column(Boolean, nullable=False, default=False)

    status = Column(String, nullable=False, default="draft")
    payment_link_url = Column(String, nullable=True)
    stripe_session_id = Column(String, nullable=True)

    created_by_seat_id = Column(UUID(as_uuid=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
