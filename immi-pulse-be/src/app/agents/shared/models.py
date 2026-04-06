"""Shared models: AI usage tracking, activity log, and processed email dedup."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base


class ProcessedEmail(Base):
    """Deduplication table — tracks emails already processed by webhook or poll."""
    __tablename__ = "processed_emails"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(String, nullable=False, unique=True, index=True)
    mailbox = Column(String, nullable=False)
    source = Column(String, nullable=False, default="webhook")  # "webhook" or "poll"
    processed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AIUsageLog(Base):
    __tablename__ = "ai_usage_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_name = Column(String, nullable=False)
    operation = Column(String, nullable=False)
    model_id = Column(String, nullable=False)
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class AgentActivityLog(Base):
    __tablename__ = "agent_activity_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_name = Column(String, nullable=False)
    action = Column(String, nullable=False)
    mailbox = Column(String, nullable=True)
    message_id = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    details = Column(JSONB, nullable=True)
    confidence_score = Column(Float, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="success")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
