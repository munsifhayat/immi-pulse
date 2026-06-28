"""Pydantic schemas for the Community feature."""

from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator

from app.agents.immigration.community.models import (
    MILESTONE_TYPES,
    POST_TYPES,
    REPORT_REASONS,
    REPORT_STATUSES,
    REPORT_TARGET_TYPES,
    THREAD_STATUSES,
    TIMELINE_OUTCOMES,
)

ThreadStatusLiteral = Literal["active", "hidden", "removed"]
ReportTargetLiteral = Literal["thread", "comment", "journey", "journey_comment"]
ReportReasonLiteral = Literal["spam", "harassment", "misleading_advice", "other"]
ReportStatusLiteral = Literal["open", "actioned", "dismissed"]
ThreadSortLiteral = Literal["new", "top", "trending"]
TimelineOutcomeLiteral = Literal["waiting", "granted", "refused"]
TrendLiteral = Literal["faster", "slower", "steady"]
WaitTierLiteral = Literal["on_track", "normal", "longer", "outlier", "unknown"]
WaitBasisLiteral = Literal["community", "official", "none"]
PostTypeLiteral = Literal["timeline", "question"]

assert set(THREAD_STATUSES) == set(ThreadStatusLiteral.__args__)
assert set(REPORT_TARGET_TYPES) == set(ReportTargetLiteral.__args__)
assert set(REPORT_REASONS) == set(ReportReasonLiteral.__args__)
assert set(REPORT_STATUSES) == set(ReportStatusLiteral.__args__)
assert set(TIMELINE_OUTCOMES) == set(TimelineOutcomeLiteral.__args__)
assert set(POST_TYPES) == set(PostTypeLiteral.__args__)


# --- Spaces ------------------------------------------------------------------


class CommunitySpaceOut(BaseModel):
    id: UUID
    slug: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    member_count: int
    thread_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateCommunitySpaceRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9\-]+$")
    name: str = Field(min_length=2, max_length=120)
    description: Optional[str] = None
    icon: Optional[str] = None


# --- Threads -----------------------------------------------------------------


class CreateThreadRequest(BaseModel):
    space_slug: str
    title: str = Field(min_length=4, max_length=200)
    body: str = Field(min_length=1, max_length=10000)
    is_anonymous: bool = True
    author_display_name: Optional[str] = Field(default=None, max_length=60)


class ThreadOut(BaseModel):
    id: UUID
    space_id: UUID
    space_slug: Optional[str] = None
    space_name: Optional[str] = None
    author_display_name: Optional[str] = None
    is_anonymous: bool
    title: str
    body: str
    upvotes: int
    reply_count: int
    view_count: int
    is_pinned: bool
    status: ThreadStatusLiteral
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ThreadWithCommentsOut(ThreadOut):
    comments: list["CommentOut"] = []


# --- Comments ----------------------------------------------------------------


class CreateCommentRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    parent_comment_id: Optional[UUID] = None
    is_anonymous: bool = True
    author_display_name: Optional[str] = Field(default=None, max_length=60)


class CommentOut(BaseModel):
    id: UUID
    thread_id: UUID
    parent_comment_id: Optional[UUID] = None
    author_display_name: Optional[str] = None
    is_anonymous: bool
    body: str
    upvotes: int
    status: ThreadStatusLiteral
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Reports -----------------------------------------------------------------


class ReportRequest(BaseModel):
    reason: ReportReasonLiteral
    description: Optional[str] = Field(default=None, max_length=1000)


class ReportOut(BaseModel):
    id: UUID
    target_type: ReportTargetLiteral
    target_id: UUID
    reason: ReportReasonLiteral
    description: Optional[str] = None
    status: ReportStatusLiteral
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None

    model_config = {"from_attributes": True}


class ModerationActionRequest(BaseModel):
    action: Literal["hide", "remove", "dismiss"]
    note: Optional[str] = Field(default=None, max_length=1000)


# --- Stats -------------------------------------------------------------------


class CommunityStatsOut(BaseModel):
    total_spaces: int
    total_threads: int
    total_comments: int


# --- Processing times & timelines -------------------------------------------


class VisaSubclassOut(BaseModel):
    """Lightweight subclass reference for selectors."""

    slug: str
    code: str
    name: str
    stream: Optional[str] = None
    category_slug: Optional[str] = None

    model_config = {"from_attributes": True}


class CommunityDurationStats(BaseModel):
    """Percentile bands computed live from community timelines (all in days)."""

    sample_size: int
    pending: int
    p25: Optional[int] = None
    p50: Optional[int] = None
    p75: Optional[int] = None
    p90: Optional[int] = None
    fastest: Optional[int] = None
    slowest: Optional[int] = None


class ProcessingStatOut(BaseModel):
    """One row of the official-vs-community processing-times board."""

    slug: str
    code: str
    name: str
    stream: Optional[str] = None
    category_slug: Optional[str] = None

    official_p50_days: Optional[int] = None
    official_p90_days: Optional[int] = None
    official_updated: Optional[str] = None

    community: CommunityDurationStats
    trend: TrendLiteral = "steady"


class SubmitTimelineRequest(BaseModel):
    subclass_slug: str
    lodged_on: date
    outcome: TimelineOutcomeLiteral = "waiting"
    decided_on: Optional[date] = None
    country: Optional[str] = Field(default=None, max_length=60)
    note: Optional[str] = Field(default=None, max_length=280)

    @model_validator(mode="after")
    def _check_dates(self) -> "SubmitTimelineRequest":
        today = date.today()
        if self.lodged_on > today:
            raise ValueError("Lodgement date cannot be in the future.")
        if self.outcome == "waiting":
            # A still-waiting timeline never carries a decision date.
            self.decided_on = None
        else:
            if self.decided_on is None:
                raise ValueError("A decided outcome requires a decision date.")
            if self.decided_on < self.lodged_on:
                raise ValueError("Decision date cannot precede lodgement.")
            if self.decided_on > today:
                raise ValueError("Decision date cannot be in the future.")
        return self


class TimelineOut(BaseModel):
    id: UUID
    subclass_slug: str
    lodged_on: date
    decided_on: Optional[date] = None
    outcome: TimelineOutcomeLiteral
    processing_days: Optional[int] = None
    country: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WaitCheckOut(BaseModel):
    """Result of the "is my wait normal?" check for an in-progress application."""

    subclass_slug: str
    subclass_label: str
    elapsed_days: int

    tier: WaitTierLiteral
    basis: WaitBasisLiteral = "community"
    headline: str
    detail: str
    share_decided_within: Optional[int] = None

    sample_size: int
    pending: int
    p25: Optional[int] = None
    p50: Optional[int] = None
    p75: Optional[int] = None
    p90: Optional[int] = None
    fastest: Optional[int] = None
    slowest: Optional[int] = None

    official_p50_days: Optional[int] = None
    official_p90_days: Optional[int] = None
    official_updated: Optional[str] = None


# --- Community feed v2: identity, journeys, milestones, comments, votes ------


class IdentityOut(BaseModel):
    """The device's anonymous identity. ``device_token`` is returned only on
    bootstrap/reroll so the client can persist it; reads omit it."""

    handle: str
    color: str
    initials: str
    journeys_posted: int
    is_claimed: bool  # True once linked to a real account → posting uncapped
    can_post_timeline: bool
    device_token: Optional[str] = None


class MilestoneIn(BaseModel):
    milestone_type: str
    occurred_on: date
    label: Optional[str] = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def _check(self) -> "MilestoneIn":
        if self.milestone_type not in MILESTONE_TYPES:
            raise ValueError(f"Unknown milestone type '{self.milestone_type}'.")
        if self.occurred_on > date.today():
            raise ValueError("Milestone date cannot be in the future.")
        return self


class MilestoneOut(BaseModel):
    id: UUID
    milestone_type: str
    occurred_on: date
    ordinal: int
    label: Optional[str] = None

    model_config = {"from_attributes": True}


class CreateJourneyRequest(BaseModel):
    post_type: PostTypeLiteral = "timeline"

    subclass_slug: Optional[str] = Field(default=None, max_length=64)
    category_slug: Optional[str] = Field(default=None, max_length=64)

    # Coarse profile (timeline posts)
    stream: Optional[str] = Field(default=None, max_length=60)
    occupation: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=40)
    area: Optional[str] = Field(default=None, max_length=20)
    sponsor_type: Optional[str] = Field(default=None, max_length=40)

    outcome: TimelineOutcomeLiteral = "waiting"

    title: Optional[str] = Field(default=None, max_length=200)
    note: Optional[str] = Field(default=None, max_length=2000)

    milestones: list[MilestoneIn] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check(self) -> "CreateJourneyRequest":
        if self.post_type == "question":
            if not (self.title and self.title.strip()):
                raise ValueError("A question needs a title.")
            if not (self.note and self.note.strip()):
                raise ValueError("A question needs a body.")
            self.milestones = []
            self.outcome = "waiting"
        else:  # timeline
            if not self.subclass_slug:
                raise ValueError("Pick the visa subclass for your timeline.")
            if not self.milestones:
                raise ValueError("Add at least one milestone to your timeline.")
            if self.outcome == "granted" and not any(
                m.milestone_type == "Visa Granted" for m in self.milestones
            ):
                # Tolerant: the derived span uses the last milestone as the
                # decision date if no explicit "Visa Granted" was added.
                pass
        return self


class JourneyOut(BaseModel):
    """A feed card (timeline or question)."""

    id: UUID
    post_type: PostTypeLiteral
    subclass_slug: Optional[str] = None
    category_slug: Optional[str] = None
    subclass_code: Optional[str] = None
    subclass_name: Optional[str] = None
    category_name: Optional[str] = None

    stream: Optional[str] = None
    occupation: Optional[str] = None
    state: Optional[str] = None
    area: Optional[str] = None
    sponsor_type: Optional[str] = None
    outcome: TimelineOutcomeLiteral

    title: Optional[str] = None
    note: Optional[str] = None

    handle: str
    color: str
    initials: str

    upvotes: int
    comment_count: int
    is_sample: bool
    is_mine: bool = False
    viewer_voted: bool = False

    processing_days: Optional[int] = None
    elapsed_days: Optional[int] = None  # lodged → today, for "still waiting"

    milestones: list[MilestoneOut] = []
    created_at: datetime


class JourneyReplyOut(BaseModel):
    id: UUID
    handle: str
    color: str
    initials: str
    body: str
    upvotes: int
    is_op: bool
    viewer_voted: bool = False
    reply_to: Optional[str] = None  # handle being replied to
    created_at: datetime


class JourneyMessageOut(BaseModel):
    """A top-level conversation message + its flat replies (one level)."""

    id: UUID
    handle: str
    color: str
    initials: str
    body: str
    upvotes: int
    is_op: bool
    viewer_voted: bool = False
    created_at: datetime
    replies: list[JourneyReplyOut] = []


class JourneyDetailOut(JourneyOut):
    messages: list[JourneyMessageOut] = []


class CreateJourneyCommentRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    parent_comment_id: Optional[UUID] = None


class JourneyCommentOut(BaseModel):
    id: UUID
    journey_id: UUID
    parent_comment_id: Optional[UUID] = None
    handle: str
    color: str
    initials: str
    body: str
    upvotes: int
    created_at: datetime

    model_config = {"from_attributes": True}


class VoteResultOut(BaseModel):
    target_type: Literal["journey", "comment"]
    target_id: UUID
    upvotes: int
    voted: bool


class FeedSummaryOut(BaseModel):
    """Live counts for the left filter rail."""

    all: int
    questions: int
    timelines: int
    waiting: int
    granted: int
    by_category: dict[str, int]


ThreadWithCommentsOut.model_rebuild()
