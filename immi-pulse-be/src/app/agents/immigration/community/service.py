"""Business logic for the Community feature."""

import hashlib
import logging
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from threading import Lock
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community import processing
from app.agents.immigration.community.models import (
    CommunityComment,
    CommunityReport,
    CommunitySpace,
    CommunityThread,
    CommunityTimeline,
    VisaSubclass,
)
from app.agents.immigration.community.schemas import (
    CreateCommentRequest,
    CreateCommunitySpaceRequest,
    CreateThreadRequest,
    ReportRequest,
    SubmitTimelineRequest,
)

logger = logging.getLogger(__name__)

# --- In-memory IP-hashed rate limiter -----------------------------------------
# Simple per-process counter. Graduates to Redis later if/when the backend
# runs in more than one worker.

_RATE_LIMITS = {
    "thread": (10, timedelta(days=1)),
    "comment": (50, timedelta(days=1)),
    "report": (20, timedelta(days=1)),
    "timeline": (20, timedelta(days=1)),
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

    # --- Stats ----------------------------------------------------------------

    @staticmethod
    async def get_stats(db: AsyncSession) -> dict:
        total_spaces = await db.scalar(
            select(func.count()).select_from(CommunitySpace)
        )
        total_threads = await db.scalar(
            select(func.count())
            .select_from(CommunityThread)
            .where(CommunityThread.status == "active")
        )
        total_comments = await db.scalar(
            select(func.count())
            .select_from(CommunityComment)
            .where(CommunityComment.status == "active")
        )
        return {
            "total_spaces": int(total_spaces or 0),
            "total_threads": int(total_threads or 0),
            "total_comments": int(total_comments or 0),
        }

    # --- Recent threads (cross-space) ----------------------------------------

    @staticmethod
    async def list_recent_threads(
        db: AsyncSession, *, limit: int = 10
    ) -> list[CommunityThread]:
        result = await db.execute(
            select(CommunityThread)
            .where(CommunityThread.status == "active")
            .order_by(CommunityThread.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

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

    # --- Visa subclasses & processing timelines ------------------------------

    @staticmethod
    async def list_subclasses(db: AsyncSession) -> list[VisaSubclass]:
        result = await db.execute(
            select(VisaSubclass)
            .where(VisaSubclass.is_active.is_(True))
            .order_by(VisaSubclass.sort_order.asc(), VisaSubclass.code.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_subclass(
        db: AsyncSession, slug: str
    ) -> Optional[VisaSubclass]:
        result = await db.execute(
            select(VisaSubclass).where(VisaSubclass.slug == slug)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def _timeline_durations(
        db: AsyncSession, subclass_slug: str
    ) -> tuple[list[int], int]:
        """Return (decided processing-day durations, pending count) for a slug.

        Only active, granted timelines contribute durations — refusals and
        still-waiting rows are excluded from the percentile maths, but waiting
        rows are tallied as the pending denominator.
        """
        result = await db.execute(
            select(
                CommunityTimeline.lodged_on,
                CommunityTimeline.decided_on,
                CommunityTimeline.outcome,
            ).where(
                CommunityTimeline.subclass_slug == subclass_slug,
                CommunityTimeline.status == "active",
            )
        )
        durations: list[int] = []
        pending = 0
        for lodged_on, decided_on, outcome in result.all():
            if outcome == "granted" and decided_on is not None:
                durations.append((decided_on - lodged_on).days)
            elif outcome == "waiting":
                pending += 1
        return durations, pending

    @staticmethod
    async def _trend_for(db: AsyncSession, subclass_slug: str) -> str:
        """Compare recent grant medians to older ones → faster / slower / steady."""
        result = await db.execute(
            select(
                CommunityTimeline.lodged_on,
                CommunityTimeline.decided_on,
                CommunityTimeline.created_at,
            ).where(
                CommunityTimeline.subclass_slug == subclass_slug,
                CommunityTimeline.status == "active",
                CommunityTimeline.outcome == "granted",
                CommunityTimeline.decided_on.isnot(None),
            )
        )
        rows = result.all()
        if len(rows) < 8:
            return "steady"
        rows = sorted(rows, key=lambda r: r[1])  # by decision date
        mid = len(rows) // 2
        older = [(r[1] - r[0]).days for r in rows[:mid]]
        newer = [(r[1] - r[0]).days for r in rows[mid:]]
        old_med = processing.percentile(older, 50) or 0
        new_med = processing.percentile(newer, 50) or 0
        if old_med == 0:
            return "steady"
        delta = (new_med - old_med) / old_med
        if delta <= -0.1:
            return "faster"
        if delta >= 0.1:
            return "slower"
        return "steady"

    @staticmethod
    async def processing_board(db: AsyncSession) -> list[dict]:
        """Official-vs-community board: one entry per active subclass."""
        subclasses = await CommunityService.list_subclasses(db)
        board: list[dict] = []
        for sc in subclasses:
            durations, pending = await CommunityService._timeline_durations(
                db, sc.slug
            )
            stats = processing.compute_stats(durations, pending=pending)
            trend = (
                await CommunityService._trend_for(db, sc.slug)
                if stats["sample_size"] >= 8
                else "steady"
            )
            board.append(
                {
                    "slug": sc.slug,
                    "code": sc.code,
                    "name": sc.name,
                    "stream": sc.stream,
                    "category_slug": sc.category_slug,
                    "official_p50_days": sc.official_p50_days,
                    "official_p90_days": sc.official_p90_days,
                    "official_updated": sc.official_updated,
                    "community": stats,
                    "trend": trend,
                }
            )
        return board

    @staticmethod
    async def submit_timeline(
        db: AsyncSession,
        payload: SubmitTimelineRequest,
        *,
        ip_hash: str,
    ) -> CommunityTimeline:
        _consume_rate("timeline", ip_hash)

        subclass = await CommunityService.get_subclass(db, payload.subclass_slug)
        if subclass is None:
            raise ValueError(f"Unknown visa subclass '{payload.subclass_slug}'")

        timeline = CommunityTimeline(
            id=uuid.uuid4(),
            subclass_slug=payload.subclass_slug,
            lodged_on=payload.lodged_on,
            decided_on=payload.decided_on,
            outcome=payload.outcome,
            country=(payload.country or None),
            note=(payload.note.strip() if payload.note else None),
            author_ip_hash=ip_hash,
        )
        db.add(timeline)
        await db.flush()
        return timeline

    @staticmethod
    async def wait_check(
        db: AsyncSession,
        *,
        subclass_slug: str,
        lodged_on: date,
    ) -> Optional[dict]:
        """Where an in-progress wait sits in the community distribution."""
        subclass = await CommunityService.get_subclass(db, subclass_slug)
        if subclass is None:
            return None

        label = subclass.code + (f" {subclass.stream}" if subclass.stream else "")
        elapsed_days = max(0, (date.today() - lodged_on).days)
        durations, pending = await CommunityService._timeline_durations(
            db, subclass_slug
        )
        verdict = processing.wait_verdict(
            elapsed_days,
            decided_days=durations,
            pending=pending,
            subclass_label=label,
        )
        # Cold start: until enough real timelines exist, fall back to the
        # official Home Affairs bands rather than show a fabricated community
        # picture. Never invents community data.
        if verdict["tier"] == "unknown":
            verdict = processing.wait_verdict_official(
                elapsed_days,
                official_p50=subclass.official_p50_days,
                official_p90=subclass.official_p90_days,
                subclass_label=label,
            )
        verdict.update(
            {
                "subclass_slug": subclass.slug,
                "subclass_label": label,
                "official_p50_days": subclass.official_p50_days,
                "official_p90_days": subclass.official_p90_days,
                "official_updated": subclass.official_updated,
            }
        )
        return verdict
