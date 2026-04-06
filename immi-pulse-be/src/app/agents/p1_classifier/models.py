"""P1 Classifier SQLAlchemy models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, Float, Index, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base


class P1Job(Base):
    __tablename__ = "p1_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mailbox = Column(String, nullable=False)
    message_id = Column(String, nullable=False, unique=True)
    thread_id = Column(String, nullable=True)
    from_email = Column(String, nullable=False)
    from_name = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=False)

    # Classification
    priority = Column(String, nullable=False)  # p1, p2, p3, p4
    is_urgent = Column(Boolean, nullable=False, default=False)
    confidence_score = Column(Float, nullable=False)
    ai_reasoning = Column(Text, nullable=True)
    category = Column(String, nullable=True)

    # Extracted details
    client_name = Column(String, nullable=True)
    contract_location = Column(String, nullable=True)
    job_description = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)

    # SLA tracking
    response_deadline = Column(DateTime(timezone=True), nullable=True)
    first_response_at = Column(DateTime(timezone=True), nullable=True)
    is_responded = Column(Boolean, default=False)
    is_overdue = Column(Boolean, default=False)

    # Status
    status = Column(String, nullable=False, default="open")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_p1_priority", "priority"),
        Index("idx_p1_urgent", "is_urgent"),
        Index("idx_p1_overdue", "is_overdue"),
        Index("idx_p1_status", "status"),
    )


class DailySummary(Base):
    __tablename__ = "daily_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    summary_date = Column(Date, nullable=False)
    summary_time = Column(Time, nullable=False)
    summary_type = Column(String, nullable=False)  # p1_daily, emergent_work

    total_p1_jobs = Column(Integer, nullable=True)
    responded_count = Column(Integer, nullable=True)
    overdue_count = Column(Integer, nullable=True)
    summary_table = Column(JSONB, nullable=False)
    summary_text = Column(Text, nullable=False)
    raw_data = Column(JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_summary_date", "summary_date"),
        Index("idx_summary_type", "summary_type"),
    )
