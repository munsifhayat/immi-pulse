"""Business logic for the Community feature."""

import hashlib
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community.models import (
    CommunityComment,
    CommunityReport,
    CommunitySpace,
    CommunityThread,
)
from app.agents.immigration.community.schemas import (
    CreateCommentRequest,
    CreateCommunitySpaceRequest,
    CreateThreadRequest,
    ReportRequest,
)

logger = logging.getLogger(__name__)

# --- In-memory IP-hashed rate limiter -----------------------------------------
# Simple per-process counter. Graduates to Redis later if/when the backend
# runs in more than one worker.

_RATE_LIMITS = {
    "thread": (10, timedelta(days=1)),
    "comment": (50, timedelta(days=1)),
    "report": (20, timedelta(days=1)),
}

_rate_state: dict[tuple[str, str], list[datetime]] = defaultdict(list)
_rate_lock = Lock()


class CommunityRateLimitError(Exception):
    """Raised when an IP hash exceeds the per-action daily cap."""


def hash_ip(ip: str | None) -> str:
    if not ip:
        return "unknown"
    return hashlib.sha256(f"immi-pulse.community.{ip}".encode("utf-8")).hexdigest()[:32]


def _consume_rate(action: str, ip_hash: str) -> None:
    cap, window = _RATE_LIMITS[action]
    now = datetime.now(timezone.utc)
    cutoff = now - window
    key = (action, ip_hash)
    with _rate_lock:
        history = [t for t in _rate_state[key] if t >= cutoff]
        if len(history) >= cap:
            raise CommunityRateLimitError(
                f"Daily {action} limit reached ({cap}). Try again tomorrow."
            )
        history.append(now)
        _rate_state[key] = history


class CommunityService:
    """Spaces, threads, comments, reports, and moderation."""

    # --- Spaces -------------------------------------------------------------

    @staticmethod
    async def list_spaces(db: AsyncSession) -> list[CommunitySpace]:
        result = await db.execute(
            select(CommunitySpace).order_by(CommunitySpace.thread_count.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_space_by_slug(
        db: AsyncSession, slug: str
    ) -> Optional[CommunitySpace]:
        result = await db.execute(
            select(CommunitySpace).where(CommunitySpace.slug == slug)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_space(
        db: AsyncSession, payload: CreateCommunitySpaceRequest
    ) -> CommunitySpace:
        existing = await CommunityService.get_space_by_slug(db, payload.slug)
        if existing is not None:
            return existing
        space = CommunitySpace(
            id=uuid.uuid4(),
            slug=payload.slug,
            name=payload.name,
            description=payload.description,
            icon=payload.icon,
        )
        db.add(space)
        await db.flush()
        return space

    # --- Threads ------------------------------------------------------------

    @staticmethod
    async def list_threads(
        db: AsyncSession,
        *,
        space_id: Optional[UUID] = None,
        sort: str = "new",
        limit: int = 50,
        offset: int = 0,
    ) -> list[CommunityThread]:
        query = select(CommunityThread).where(CommunityThread.status == "active")
        if space_id is not None:
            query = query.where(CommunityThread.space_id == space_id)

        pinned_first = CommunityThread.is_pinned.desc()
        if sort == "top":
            query = query.order_by(pinned_first, CommunityThread.upvotes.desc())
        elif sort == "trending":
            query = query.order_by(
                pinned_first,
                (CommunityThread.upvotes + CommunityThread.reply_count).desc(),
                CommunityThread.created_at.desc(),
            )
        else:
            query = query.order_by(pinned_first, CommunityThread.created_at.desc())

        query = query.limit(limit).offset(offset)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_thread(
        db: AsyncSession, thread_id: UUID
    ) -> Optional[CommunityThread]:
        thread = await db.get(CommunityThread, thread_id)
        if thread is None or thread.status != "active":
            return None
        return thread

    @staticmethod
    async def create_thread(
        db: AsyncSession,
        payload: CreateThreadRequest,
        *,
        ip_hash: str,
    ) -> CommunityThread:
        _consume_rate("thread", ip_hash)

        space = await CommunityService.get_space_by_slug(db, payload.space_slug)
        if space is None:
            raise ValueError(f"Unknown space '{payload.space_slug}'")

        thread = CommunityThread(
            id=uuid.uuid4(),
            space_id=space.id,
            is_anonymous=payload.is_anonymous,
            author_display_name=payload.author_display_name
            if not payload.is_anonymous
            else "Anonymous",
            author_ip_hash=ip_hash,
            title=payload.title.strip(),
            body=payload.body.strip(),
        )
        db.add(thread)
        space.thread_count = (space.thread_count or 0) + 1
        await db.flush()
        return thread

    @staticmethod
    async def upvote_thread(db: AsyncSession, thread_id: UUID) -> Optional[CommunityThread]:
        thread = await CommunityService.get_thread(db, thread_id)
        if thread is None:
            return None
        thread.upvotes = (thread.upvotes or 0) + 1
        await db.flush()
        return thread

    @staticmethod
    async def increment_view_count(db: AsyncSession, thread_id: UUID) -> None:
        thread = await db.get(CommunityThread, thread_id)
        if thread is not None:
            thread.view_count = (thread.view_count or 0) + 1

    # --- Comments -----------------------------------------------------------

    @staticmethod
    async def list_comments(
        db: AsyncSession, thread_id: UUID
    ) -> list[CommunityComment]:
        result = await db.execute(
            select(CommunityComment)
            .where(
                CommunityComment.thread_id == thread_id,
                CommunityComment.status == "active",
            )
            .order_by(CommunityComment.created_at.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_comment(
        db: AsyncSession,
        thread_id: UUID,
        payload: CreateCommentRequest,
        *,
        ip_hash: str,
    ) -> CommunityComment:
        _consume_rate("comment", ip_hash)

        thread = await CommunityService.get_thread(db, thread_id)
        if thread is None:
            raise ValueError("Thread not found")

        comment = CommunityComment(
            id=uuid.uuid4(),
            thread_id=thread_id,
            parent_comment_id=payload.parent_comment_id,
            is_anonymous=payload.is_anonymous,
            author_display_name=payload.author_display_name
            if not payload.is_anonymous
            else "Anonymous",
            author_ip_hash=ip_hash,
            body=payload.body.strip(),
        )
        db.add(comment)
        thread.reply_count = (thread.reply_count or 0) + 1
        await db.flush()
        return comment

    @staticmethod
    async def upvote_comment(
        db: AsyncSession, comment_id: UUID
    ) -> Optional[CommunityComment]:
        comment = await db.get(CommunityComment, comment_id)
        if comment is None or comment.status != "active":
            return None
        comment.upvotes = (comment.upvotes or 0) + 1
        await db.flush()
        return comment

    # --- Reports ------------------------------------------------------------

    @staticmethod
    async def report_target(
        db: AsyncSession,
        *,
        target_type: str,
        target_id: UUID,
        payload: ReportRequest,
        ip_hash: str,
    ) -> CommunityReport:
        _consume_rate("report", ip_hash)

        report = CommunityReport(
            id=uuid.uuid4(),
            target_type=target_type,
            target_id=target_id,
            reporter_ip_hash=ip_hash,
            reason=payload.reason,
            description=payload.description,
        )
        db.add(report)
        await db.flush()
        return report

    @staticmethod
    async def list_open_reports(db: AsyncSession) -> list[CommunityReport]:
        result = await db.execute(
            select(CommunityReport)
            .where(CommunityReport.status == "open")
            .order_by(CommunityReport.created_at.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def resolve_report(
        db: AsyncSession,
        report_id: UUID,
        *,
        action: str,
        note: Optional[str] = None,
        resolver_user_id: Optional[UUID] = None,
    ) -> Optional[CommunityReport]:
        report = await db.get(CommunityReport, report_id)
        if report is None:
            return None

        # Mutate the target if needed.
        if action == "hide":
            target = await CommunityService._load_target(db, report)
            if target is not None:
                target.status = "hidden"
        elif action == "remove":
            target = await CommunityService._load_target(db, report)
            if target is not None:
                target.status = "removed"

        report.status = "dismissed" if action == "dismiss" else "actioned"
        report.resolved_at = datetime.now(timezone.utc)
        report.resolved_by = resolver_user_id
        report.resolution_note = note
        await db.flush()
        return report

    @staticmethod
    async def _load_target(db: AsyncSession, report: CommunityReport):
        if report.target_type == "thread":
            return await db.get(CommunityThread, report.target_id)
        if report.target_type == "comment":
            return await db.get(CommunityComment, report.target_id)
        return None

    # --- Thread count reconciliation ---------------------------------------

    @staticmethod
    async def recount_space_threads(db: AsyncSession, space_id: UUID) -> int:
        total = await db.scalar(
            select(func.count())
            .select_from(CommunityThread)
            .where(
                CommunityThread.space_id == space_id,
                CommunityThread.status == "active",
            )
        )
        return int(total or 0)
