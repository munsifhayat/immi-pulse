"""Emergent Work SQLAlchemy models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base


class EmergentWorkItem(Base):
    __tablename__ = "emergent_work_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mailbox = Column(String, nullable=False)

    # Source emails
    source_message_ids = Column(JSONB, nullable=False)
    thread_id = Column(String, nullable=True)
    subject = Column(String, nullable=False)

    # Extracted context
    client_name = Column(String, nullable=True)
    contract_reference = Column(String, nullable=True)
    original_scope_summary = Column(Text, nullable=True)
    emergent_work_description = Column(Text, nullable=True)
    supporting_evidence = Column(JSONB, nullable=True)

    # AI analysis
    confidence_score = Column(Float, nullable=False)
    ai_reasoning = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)

    # Attachments processed
    processed_attachments = Column(JSONB, default=list)

    # Status
    status = Column(String, nullable=False, default="detected")
    raised_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        Index("idx_emergent_client", "client_name"),
        Index("idx_emergent_status", "status"),
    )


class EmergentWorkReport(Base):
    __tablename__ = "emergent_work_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_time = Column(DateTime(timezone=True), nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=False)
    period_end = Column(DateTime(timezone=True), nullable=False)

    items_detected = Column(Integer, nullable=True)
    summary_table = Column(JSONB, nullable=False)
    summary_text = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
