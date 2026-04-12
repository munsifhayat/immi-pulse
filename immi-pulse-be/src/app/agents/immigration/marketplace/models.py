"""Marketplace model — AgentProfile for OMARA-registered migration agents."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base

AGENT_PROFILE_STATUSES = ("pending_review", "approved", "rejected", "suspended")
AGENT_PROFILE_TIERS = ("basic", "platinum")


class AgentProfile(Base):
    """
    Public-facing marketplace profile for a migration agent.

    Created when a consultant submits the /find-consultants/apply form.
    Goes through an admin approval workflow before appearing in the public
    directory. Tier (basic vs platinum) is set manually by admin for MVP.
    """

    __tablename__ = "agent_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Identity
    firm_name = Column(String, nullable=True)
    omara_number = Column(String, nullable=False, index=True)
    bio = Column(Text, nullable=True)

    # Location
    city = Column(String, nullable=True, index=True)
    state = Column(String, nullable=True, index=True)

    # Offering
    specializations = Column(JSONB, nullable=True)  # list of visa subclass codes
    languages = Column(JSONB, nullable=True)
    years_experience = Column(Integer, nullable=True)
    consultation_fee = Column(Float, nullable=True)
    response_time_hours = Column(Integer, nullable=True)

    # Tier & status
    tier = Column(String, nullable=False, default="basic", index=True)
    status = Column(String, nullable=False, default="pending_review", index=True)
    featured = Column(Boolean, nullable=False, default=False)
    avatar_color = Column(String, nullable=True)

    # Ratings (populated later when reviews ship)
    rating = Column(Float, nullable=False, default=0.0)
    review_count = Column(Integer, nullable=False, default=0)

    # Audit
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    rejection_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
