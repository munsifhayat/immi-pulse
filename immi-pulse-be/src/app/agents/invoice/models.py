"""Invoice detection SQLAlchemy model."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base


class InvoiceDetection(Base):
    __tablename__ = "invoice_detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mailbox = Column(String, nullable=False)
    message_id = Column(String, nullable=False, unique=True)
    thread_id = Column(String, nullable=True)
    from_email = Column(String, nullable=False)
    from_name = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=False)

    # Classification
    is_invoice = Column(Boolean, nullable=False)
    confidence_score = Column(Float, nullable=False)
    ai_reasoning = Column(Text, nullable=True)
    attachment_names = Column(JSONB, default=list)
    detected_invoice_type = Column(String, nullable=True)

    # Action taken
    action = Column(String, nullable=False, default="none")
    moved_to_folder = Column(String, nullable=True)
    moved_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    # Manual override
    manually_reviewed = Column(Boolean, default=False)
    review_action = Column(String, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_invoice_mailbox", "mailbox"),
        Index("idx_invoice_is_invoice", "is_invoice"),
        Index("idx_invoice_received", "received_at"),
    )
