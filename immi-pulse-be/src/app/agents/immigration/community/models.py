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
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base

THREAD_STATUSES = ("active", "hidden", "removed")
REPORT_TARGET_TYPES = ("thread", "comment", "journey", "journey_comment")
REPORT_REASONS = ("spam", "harassment", "misleading_advice", "other")
REPORT_STATUSES = ("open", "actioned", "dismissed")

# Community-submitted visa timeline outcomes. "waiting" = lodged, no decision
# yet (the survivorship-bias denominator); "granted"/"refused" are decided.
TIMELINE_OUTCOMES = ("waiting", "granted", "refused")
TIMELINE_STATUSES = ("active", "hidden", "removed")

# --- Community feed v2 (journeys = unified feed posts) -----------------------

# A feed post is either a milestone "timeline" or a free-text "question".
POST_TYPES = ("timeline", "question")

# Server-validated milestone vocabulary, ordered the way an Australian
# application actually flows. "Other" lets people record anything unusual
# without polluting the enum. Icon + colour mapping lives on the frontend.
MILESTONE_TYPES = (
    "Skills Assessment Lodged",
    "Skills Assessment Approved",
    "English Test Completed",
    "EOI Submitted",
    "Invitation Received",
    "Nomination Lodged",
    "Nomination Approved",
    "State Nomination",
    "Visa Lodged",
    "Medical Examination",
    "Police Checks",
    "S56 Request Received",
    "S56 Response Submitted",
    "Visa Granted",
    "Other",
)

# What a journey's votes/comments can hang off.
VOTE_TARGET_TYPES = ("journey", "comment")


class AnonIdentity(Base):
    """One anonymous identity per device — the spine of the guardrail layer.

    The device holds an opaque ``device_token`` (issued at bootstrap, persisted
    client-side) and is shown a generated, unique ``handle`` + ``color``. While
    anonymous, an identity may post a single timeline (``journeys_posted`` is
    capped at 1); after that the Share CTA flips to a sign-in gate. Signing in
    sets ``user_id`` and lifts the cap. No PII is ever stored here.
    """

    __tablename__ = "anon_identities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_token = Column(String, nullable=False, unique=True, index=True)
    handle = Column(String, nullable=False, unique=True, index=True)
    color = Column(String, nullable=False)

    journeys_posted = Column(Integer, nullable=False, default=0)

    # Set when the device is claimed by a real (portal) account → uncaps posting
    # and lets the portal stitch the prior anonymous activity to the account.
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    ip_hash = Column(String, nullable=True, index=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_seen_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class Journey(Base):
    """A single feed post — a shared milestone timeline OR a question.

    Timeline posts carry an ordered list of :class:`JourneyMilestone` rows plus
    a coarse profile (stream/occupation/state/sponsor). Question posts carry a
    title + body. The lodged/decided span is *derived* from the milestones and
    mirrored into ``community_timelines`` so the existing percentile engine
    keeps working untouched. Seeded sample posts (``is_sample``) populate the
    feed but never feed the stats — keeping the wait-check honest.
    """

    __tablename__ = "community_journeys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anon_identities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    post_type = Column(String, nullable=False, default="timeline", index=True)

    # Classification / filtering
    subclass_slug = Column(String, nullable=True, index=True)  # e.g. "186"
    category_slug = Column(String, nullable=True, index=True)  # visa family / space

    # Coarse, non-identifying profile (timeline posts)
    stream = Column(String, nullable=True)        # DE | TRT | Labour Agreement | PT…
    occupation = Column(String, nullable=True)    # free text, optional
    state = Column(String, nullable=True)         # NSW… | Offshore
    area = Column(String, nullable=True)          # metro | regional
    sponsor_type = Column(String, nullable=True)  # accredited | non_accredited | null

    outcome = Column(String, nullable=False, default="waiting", index=True)

    # Content
    title = Column(String, nullable=True)         # question posts
    note = Column(Text, nullable=True)            # caption / question body

    # Display snapshot (stable even if the identity later changes)
    handle = Column(String, nullable=False)
    color = Column(String, nullable=False)

    upvotes = Column(Integer, nullable=False, default=0)
    comment_count = Column(Integer, nullable=False, default=0)
    is_sample = Column(Boolean, nullable=False, default=False, index=True)
    status = Column(String, nullable=False, default="active", index=True)

    # Derived span for the stats engine (recomputed from milestones)
    lodged_on = Column(Date, nullable=True)
    decided_on = Column(Date, nullable=True)
    processing_days = Column(Integer, nullable=True)

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


class JourneyMilestone(Base):
    """One dated step inside a :class:`Journey` (ordered by ``ordinal``)."""

    __tablename__ = "community_journey_milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journeys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    milestone_type = Column(String, nullable=False)
    occurred_on = Column(Date, nullable=False)
    ordinal = Column(Integer, nullable=False, default=0)
    label = Column(String, nullable=True)  # optional custom label for "Other"


class JourneyComment(Base):
    """A flat (one-level) comment on a journey.

    ``parent_comment_id`` always points at a *top-level* message — the service
    flattens any deeper reply onto its top-level ancestor — so the conversation
    is "message → replies", never a branching tree.
    """

    __tablename__ = "community_journey_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journeys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_comment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journey_comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    identity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anon_identities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    handle = Column(String, nullable=False)
    color = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    upvotes = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="active", index=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


class CommunityVote(Base):
    """Dedup table — one row per (identity, target). Re-voting toggles off."""

    __tablename__ = "community_votes"
    __table_args__ = (
        UniqueConstraint(
            "identity_id",
            "target_type",
            "target_id",
            name="uq_community_vote_identity_target",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anon_identities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_type = Column(String, nullable=False)  # journey | comment
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


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

    # When a row is the materialised span of a shared Journey, this links back
    # to it so moderation of the journey can suppress its stats contribution.
    # NULL for legacy / directly-submitted timelines.
    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journeys.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

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
