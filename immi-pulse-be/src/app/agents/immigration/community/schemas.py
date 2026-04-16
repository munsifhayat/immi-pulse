"""Pydantic schemas for the Community feature."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.agents.immigration.community.models import (
    REPORT_REASONS,
    REPORT_STATUSES,
    REPORT_TARGET_TYPES,
    THREAD_STATUSES,
)

ThreadStatusLiteral = Literal["active", "hidden", "removed"]
ReportTargetLiteral = Literal["thread", "comment"]
ReportReasonLiteral = Literal["spam", "harassment", "misleading_advice", "other"]
ReportStatusLiteral = Literal["open", "actioned", "dismissed"]
ThreadSortLiteral = Literal["new", "top", "trending"]

assert set(THREAD_STATUSES) == set(ThreadStatusLiteral.__args__)
assert set(REPORT_TARGET_TYPES) == set(ReportTargetLiteral.__args__)
assert set(REPORT_REASONS) == set(ReportReasonLiteral.__args__)
assert set(REPORT_STATUSES) == set(ReportStatusLiteral.__args__)


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


ThreadWithCommentsOut.model_rebuild()
