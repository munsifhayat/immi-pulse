"""Community models — Spaces, Threads, Comments, Reports, Processing timelines."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base

THREAD_STATUSES = ("active", "hidden", "removed")
REPORT_TARGET_TYPES = ("thread", "comment")
REPORT_REASONS = ("spam", "harassment", "misleading_advice", "other")
REPORT_STATUSES = ("open", "actioned", "dismissed")

# Community-submitted visa timeline outcomes. "waiting" = lodged, no decision
# yet (the survivorship-bias denominator); "granted"/"refused" are decided.
TIMELINE_OUTCOMES = ("waiting", "granted", "refused")
TIMELINE_STATUSES = ("active", "hidden", "removed")


class CommunitySpace(Base):
    """A visa-category topic space (e.g., 'Skilled Migration', 'Partner Visas')."""

    __tablename__ = "community_spaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    member_count = Column(Integer, nullable=False, default=0)
    thread_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CommunityThread(Base):
    __tablename__ = "community_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_spaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Author. Community posting is fully anonymous: author_user_id is always
    # NULL, and author_display_name holds whatever name the poster supplied
    # (or "Anonymous" when is_anonymous=True).
    author_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    author_display_name = Column(String, nullable=True)
    is_anonymous = Column(Boolean, nullable=False, default=True)
    author_ip_hash = Column(String, nullable=True, index=True)  # For rate limiting / abuse triage only

    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)

    upvotes = Column(Integer, nullable=False, default=0)
    reply_count = Column(Integer, nullable=False, default=0)
    view_count = Column(Integer, nullable=False, default=0)

    is_pinned = Column(Boolean, nullable=False, default=False)
    status = Column(String, nullable=False, default="active", index=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_comment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    author_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    author_display_name = Column(String, nullable=True)
    is_anonymous = Column(Boolean, nullable=False, default=True)
    author_ip_hash = Column(String, nullable=True, index=True)

    body = Column(Text, nullable=False)
    upvotes = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="active", index=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


class CommunityReport(Base):
    """A user-submitted report on a thread or comment."""

    __tablename__ = "community_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_type = Column(String, nullable=False)  # thread | comment
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    reporter_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reporter_ip_hash = Column(String, nullable=True)

    reason = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="open", index=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolution_note = Column(Text, nullable=True)


class VisaSubclass(Base):
    """Reference data for a visa subclass (+ stream), with official DHA bands.

    Official percentile days come from the Department of Home Affairs global
    processing-times publication (75th/90th percentile, updated monthly). They
    are reference figures only; the community medians are computed live from
    ``CommunityTimeline`` rows.
    """

    __tablename__ = "visa_subclasses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Stable identifier used in URLs/queries, e.g. "189" or "482-core-skills".
    slug = Column(String, nullable=False, unique=True, index=True)
    code = Column(String, nullable=False, index=True)  # e.g. "189", "482"
    name = Column(String, nullable=False)
    stream = Column(String, nullable=True)
    # Links a subclass to its discussion space (community_spaces.slug).
    category_slug = Column(String, nullable=True, index=True)

    official_p50_days = Column(Integer, nullable=True)
    official_p90_days = Column(Integer, nullable=True)
    official_updated = Column(String, nullable=True)  # human label, e.g. "Mar 2026"

    sort_order = Column(Integer, nullable=False, default=100)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class CommunityTimeline(Base):
    """An anonymous, community-submitted visa processing timeline.

    The spine of the "is my wait normal?" engine. ``granted_on``/``refused`` set
    ``outcome`` to a decided state and yield a processing duration; a NULL
    decision date means the applicant is still waiting (counted as the pending
    denominator so stats don't suffer survivorship bias).
    """

    __tablename__ = "community_timelines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subclass_slug = Column(String, nullable=False, index=True)

    lodged_on = Column(Date, nullable=False)
    decided_on = Column(Date, nullable=True)  # grant/refusal date; NULL = waiting
    outcome = Column(String, nullable=False, default="waiting", index=True)

    country = Column(String, nullable=True)  # applicant country (optional, coarse)
    note = Column(String, nullable=True)  # short, optional free text

    author_ip_hash = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="active", index=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
