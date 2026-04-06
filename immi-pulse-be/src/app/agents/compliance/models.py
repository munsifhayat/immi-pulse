"""Compliance detection and obligation tracking SQLAlchemy models."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class ComplianceDetection(Base):
    __tablename__ = "compliance_detections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mailbox = Column(String, nullable=False)
    message_id = Column(String, nullable=False, unique=True)
    thread_id = Column(String, nullable=True)
    from_email = Column(String, nullable=False)
    from_name = Column(String, nullable=True)
    subject = Column(String, nullable=False)
    received_at = Column(DateTime(timezone=True), nullable=False)

    # Classification
    compliance_type = Column(String, nullable=False)
    jurisdiction = Column(String, nullable=True)
    property_address = Column(String, nullable=True)
    status = Column(String, nullable=False, default="information")
    deadline = Column(DateTime(timezone=True), nullable=True)
    required_action = Column(Text, nullable=True)
    certificate_reference = Column(String, nullable=True)
    urgency = Column(String, nullable=False, default="medium")
    confidence_score = Column(Float, nullable=False)
    ai_reasoning = Column(Text, nullable=True)

    # Action taken
    action = Column(String, nullable=False, default="detected")
    manually_reviewed = Column(Boolean, default=False)
    review_action = Column(String, nullable=True)
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    __table_args__ = (
        Index("idx_compliance_mailbox", "mailbox"),
        Index("idx_compliance_type", "compliance_type"),
        Index("idx_compliance_status", "status"),
        Index("idx_compliance_urgency", "urgency"),
        Index("idx_compliance_deadline", "deadline"),
    )


class PropertyComplianceProfile(Base):
    __tablename__ = "property_compliance_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mailbox = Column(String, nullable=False, unique=True)
    display_name = Column(String, nullable=True)
    property_address = Column(String, nullable=True)
    jurisdiction = Column(String, nullable=True)
    property_age_years = Column(Integer, nullable=True)
    has_pool = Column(Boolean, default=False)
    has_gas = Column(Boolean, default=False)
    has_fire_system = Column(Boolean, default=False)
    property_type = Column(String, nullable=True)
    notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        Index("idx_profile_mailbox", "mailbox"),
        Index("idx_profile_jurisdiction", "jurisdiction"),
    )


class ComplianceObligation(Base):
    __tablename__ = "compliance_obligations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    mailbox = Column(String, nullable=False)
    compliance_type = Column(String, nullable=False)
    jurisdiction = Column(String, nullable=False, default="unknown")
    status = Column(String, nullable=False, default="unknown")
    last_checked = Column(DateTime(timezone=True), nullable=True)
    next_due = Column(DateTime(timezone=True), nullable=True)
    certificate_reference = Column(String, nullable=True)
    source_email_id = Column(String, nullable=True)
    source_detection_id = Column(UUID(as_uuid=True), nullable=True)
    notes = Column(Text, nullable=True)
    severity_weight = Column(Float, nullable=False, default=1.0)

    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("mailbox", "compliance_type", name="uq_obligation_mailbox_type"),
        Index("idx_obligation_mailbox", "mailbox"),
        Index("idx_obligation_type", "compliance_type"),
        Index("idx_obligation_status", "status"),
        Index("idx_obligation_next_due", "next_due"),
    )
