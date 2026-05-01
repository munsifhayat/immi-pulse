"""PreCase — created from a questionnaire submission, lives in the consultant inbox."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base

PRECASE_STATUSES = ("pending", "in_review", "promoted", "archived")
AI_STATUSES = ("pending", "running", "succeeded", "failed", "skipped")
AI_OUTCOMES = ("likely_fit", "needs_info", "paid_consult", "unlikely_fit")


class PreCase(Base):
    __tablename__ = "pre_cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    response_id = Column(
        UUID(as_uuid=True),
        ForeignKey("questionnaire_responses.id", ondelete="SET NULL"),
        nullable=True,
    )
    source = Column(String, nullable=False, default="questionnaire")
    status = Column(String, nullable=False, default="pending", index=True)

    # AI triage results — null when not yet run, or when AI failed
    ai_summary = Column(Text, nullable=True)
    ai_suggested_outcome = Column(String, nullable=True)
    ai_extracted = Column(JSONB, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ai_status = Column(String, nullable=False, default="pending")

    assigned_seat_id = Column(UUID(as_uuid=True), nullable=True)
    promoted_case_id = Column(UUID(as_uuid=True), nullable=True)

    read_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
