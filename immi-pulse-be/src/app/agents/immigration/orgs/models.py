"""Multi-tenant core: Organization, Subscription, CreditWallet, Seat, SeatInvite, PilotProgram."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base

SUBSCRIPTION_TIERS = ("starter", "pro", "enterprise")
SUBSCRIPTION_STATUSES = ("trial", "active", "past_due", "canceled", "frozen", "archived")
SEAT_ROLES = ("owner", "admin", "consultant", "staff")
SEAT_STATUSES = ("active", "invited", "disabled")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    niche = Column(Text, nullable=True)
    omara_number = Column(String, nullable=True)
    country = Column(String, nullable=False, default="AU")
    stripe_customer_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tier = Column(String, nullable=False, default="starter")
    status = Column(String, nullable=False, default="trial")
    seat_count = Column(Integer, nullable=False, default=1)
    entitlements = Column(JSONB, nullable=True)
    pilot_program_id = Column(UUID(as_uuid=True), nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class CreditWallet(Base):
    __tablename__ = "credit_wallets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    balance = Column(Integer, nullable=False, default=0)
    monthly_grant = Column(Integer, nullable=False, default=1000)
    grant_resets_at = Column(DateTime(timezone=True), nullable=True)
    low_balance_alerted = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class PilotProgram(Base):
    __tablename__ = "pilot_programs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    credit_grant = Column(Integer, nullable=False, default=5000)
    tier_override = Column(String, nullable=True)
    starts_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_redemptions = Column(Integer, nullable=True)
    redemptions_used = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Seat(Base):
    __tablename__ = "seats"
    __table_args__ = (UniqueConstraint("org_id", "user_id", name="uq_seats_org_user"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    invited_email = Column(String, nullable=True)
    role = Column(String, nullable=False, default="consultant")
    status = Column(String, nullable=False, default="active")
    omara_number = Column(String, nullable=True)
    invited_at = Column(DateTime(timezone=True), nullable=True)
    joined_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class SeatInvite(Base):
    __tablename__ = "seat_invites"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
    )
    email = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False, default="consultant")
    token = Column(String, nullable=False, unique=True, index=True)
    invited_by_seat_id = Column(UUID(as_uuid=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    accepted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
