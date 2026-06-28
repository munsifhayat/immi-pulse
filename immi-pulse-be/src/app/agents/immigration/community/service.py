"""Business logic for the Community feature."""

import hashlib
import logging
import secrets
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from threading import Lock
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community import identity as identity_gen
from app.agents.immigration.community import processing
from app.agents.immigration.community.models import (
    AnonIdentity,
    CommunityComment,
    CommunityReport,
    CommunitySpace,
    CommunityThread,
    CommunityTimeline,
    CommunityVote,
    Journey,
    JourneyComment,
    JourneyMilestone,
    VisaSubclass,
)
from app.agents.immigration.community.schemas import (
    CreateCommentRequest,
    CreateCommunitySpaceRequest,
    CreateJourneyCommentRequest,
    CreateJourneyRequest,
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
    "journey": (20, timedelta(days=1)),
    "question": (15, timedelta(days=1)),
}

_rate_state: dict[tuple[str, str], list[datetime]] = defaultdict(list)
_rate_lock = Lock()


class CommunityRateLimitError(Exception):
    """Raised when an IP hash exceeds the per-action daily cap."""


class JourneyCapError(Exception):
    """Raised when an anonymous identity tries to post a second timeline.

    The router maps this to HTTP 409 so the frontend can show the sign-in gate.
    """


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

    # --- Anonymous identity --------------------------------------------------

    @staticmethod
    async def get_identity_by_token(
        db: AsyncSession, token: Optional[str]
    ) -> Optional[AnonIdentity]:
        if not token:
            return None
        result = await db.execute(
            select(AnonIdentity).where(AnonIdentity.device_token == token)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def _unique_handle(db: AsyncSession) -> str:
        for _ in range(12):
            handle = identity_gen.generate_handle()
            taken = await db.scalar(
                select(AnonIdentity.id).where(AnonIdentity.handle == handle)
            )
            if not taken:
                return handle
        return identity_gen.generate_handle() + secrets.token_hex(2)

    @staticmethod
    async def get_or_create_identity(
        db: AsyncSession, *, token: Optional[str], ip_hash: Optional[str] = None
    ) -> AnonIdentity:
        """Resolve the device's identity, creating one on first contact.

        Accepts a client-supplied ``token`` (the device id) — unknown tokens
        mint a fresh identity bound to that token, so a write never fails just
        because the bootstrap call was skipped.
        """
        identity = await CommunityService.get_identity_by_token(db, token)
        if identity is not None:
            identity.last_seen_at = datetime.now(timezone.utc)
            if ip_hash and not identity.ip_hash:
                identity.ip_hash = ip_hash
            await db.flush()
            return identity

        identity = AnonIdentity(
            id=uuid.uuid4(),
            device_token=token or identity_gen.generate_device_token(),
            handle=await CommunityService._unique_handle(db),
            color=identity_gen.generate_color(),
            ip_hash=ip_hash,
        )
        db.add(identity)
        await db.flush()
        return identity

    @staticmethod
    async def reroll_identity(
        db: AsyncSession, identity: AnonIdentity
    ) -> AnonIdentity:
        if identity.user_id is not None or (identity.journeys_posted or 0) > 0:
            raise ValueError("Your handle locks once you've shared a timeline.")
        identity.handle = await CommunityService._unique_handle(db)
        identity.color = identity_gen.generate_color()
        await db.flush()
        return identity

    @staticmethod
    async def claim_identity(
        db: AsyncSession, *, token: str, user_id: UUID
    ) -> Optional[AnonIdentity]:
        """Link a device's anonymous identity to a real account.

        Called when the visitor later creates a portal account — it lifts the
        one-timeline cap and lets the portal stitch prior anonymous activity to
        the account. Idempotent.
        """
        identity = await CommunityService.get_identity_by_token(db, token)
        if identity is None:
            return None
        identity.user_id = user_id
        await db.flush()
        return identity

    @staticmethod
    def identity_out(identity: AnonIdentity, *, include_token: bool = False) -> dict:
        is_claimed = identity.user_id is not None
        return {
            "handle": identity.handle,
            "color": identity.color,
            "initials": identity_gen.initials_of(identity.handle),
            "journeys_posted": identity.journeys_posted or 0,
            "is_claimed": is_claimed,
            "can_post_timeline": is_claimed or (identity.journeys_posted or 0) < 1,
            "device_token": identity.device_token if include_token else None,
        }

    # --- Journeys (unified feed posts) --------------------------------------

    @staticmethod
    async def _subclass_map(db: AsyncSession) -> dict[str, VisaSubclass]:
        result = await db.execute(select(VisaSubclass))
        return {s.slug: s for s in result.scalars().all()}

    @staticmethod
    async def _space_map(db: AsyncSession) -> dict[str, CommunitySpace]:
        result = await db.execute(select(CommunitySpace))
        return {s.slug: s for s in result.scalars().all()}

    @staticmethod
    async def create_journey(
        db: AsyncSession,
        payload: CreateJourneyRequest,
        *,
        identity: AnonIdentity,
        ip_hash: str,
    ) -> Journey:
        is_timeline = payload.post_type == "timeline"
        _consume_rate("journey" if is_timeline else "question", ip_hash)

        if (
            is_timeline
            and identity.user_id is None
            and (identity.journeys_posted or 0) >= 1
        ):
            raise JourneyCapError(
                "You've already shared a timeline. Sign in to add or edit more."
            )

        category_slug = payload.category_slug
        if payload.subclass_slug:
            subclass = await CommunityService.get_subclass(db, payload.subclass_slug)
            if subclass is None:
                raise ValueError(
                    f"Unknown visa subclass '{payload.subclass_slug}'"
                )
            if not category_slug:
                category_slug = subclass.category_slug

        journey = Journey(
            id=uuid.uuid4(),
            identity_id=identity.id,
            post_type=payload.post_type,
            subclass_slug=payload.subclass_slug,
            category_slug=category_slug,
            stream=payload.stream,
            occupation=(payload.occupation.strip() if payload.occupation else None),
            state=payload.state,
            area=payload.area,
            sponsor_type=payload.sponsor_type,
            outcome=payload.outcome,
            title=(payload.title.strip() if payload.title else None),
            note=(payload.note.strip() if payload.note else None),
            handle=identity.handle,
            color=identity.color,
        )
        db.add(journey)
        await db.flush()  # assign journey.id for FK rows

        if is_timeline:
            ordered = sorted(payload.milestones, key=lambda m: m.occurred_on)
            ms_tuples: list[tuple[str, date]] = []
            for i, m in enumerate(ordered):
                db.add(
                    JourneyMilestone(
                        id=uuid.uuid4(),
                        journey_id=journey.id,
                        milestone_type=m.milestone_type,
                        occurred_on=m.occurred_on,
                        ordinal=i,
                        label=(m.label.strip() if m.label else None),
                    )
                )
                ms_tuples.append((m.milestone_type, m.occurred_on))

            lodged, decided, days = processing.derive_span(ms_tuples, payload.outcome)
            journey.lodged_on = lodged
            journey.decided_on = decided
            journey.processing_days = days

            # Mirror real shares into the stats table so the wait-check reflects
            # them immediately. Sample posts never feed the stats.
            if not journey.is_sample and lodged is not None and payload.subclass_slug:
                db.add(
                    CommunityTimeline(
                        id=uuid.uuid4(),
                        subclass_slug=payload.subclass_slug,
                        journey_id=journey.id,
                        lodged_on=lodged,
                        decided_on=decided,
                        outcome=payload.outcome,
                        note=(journey.note[:280] if journey.note else None),
                        author_ip_hash=ip_hash,
                    )
                )

            identity.journeys_posted = (identity.journeys_posted or 0) + 1

        await db.flush()
        return journey

    @staticmethod
    async def list_journeys(
        db: AsyncSession,
        *,
        post_type: Optional[str] = None,
        category: Optional[str] = None,
        subclass: Optional[str] = None,
        status_filter: Optional[str] = None,
        sort: str = "new",
        limit: int = 30,
        offset: int = 0,
    ) -> list[Journey]:
        q = select(Journey).where(Journey.status == "active")
        if post_type:
            q = q.where(Journey.post_type == post_type)
        if category:
            q = q.where(Journey.category_slug == category)
        if subclass:
            q = q.where(Journey.subclass_slug == subclass)
        if status_filter == "waiting":
            q = q.where(
                Journey.post_type == "timeline", Journey.outcome == "waiting"
            )
        elif status_filter == "granted":
            q = q.where(
                Journey.post_type == "timeline", Journey.outcome == "granted"
            )

        if sort == "top":
            q = q.order_by(Journey.upvotes.desc(), Journey.created_at.desc())
        elif sort == "trending":
            q = q.order_by(
                (Journey.upvotes + Journey.comment_count).desc(),
                Journey.created_at.desc(),
            )
        else:
            q = q.order_by(Journey.created_at.desc())

        result = await db.execute(q.limit(limit).offset(offset))
        return list(result.scalars().all())

    @staticmethod
    async def get_journey(
        db: AsyncSession, journey_id: UUID
    ) -> Optional[Journey]:
        journey = await db.get(Journey, journey_id)
        if journey is None or journey.status != "active":
            return None
        return journey

    @staticmethod
    async def _milestones_for(
        db: AsyncSession, journey_ids: list[UUID]
    ) -> dict[UUID, list[JourneyMilestone]]:
        if not journey_ids:
            return {}
        result = await db.execute(
            select(JourneyMilestone)
            .where(JourneyMilestone.journey_id.in_(journey_ids))
            .order_by(JourneyMilestone.ordinal.asc())
        )
        out: dict[UUID, list[JourneyMilestone]] = defaultdict(list)
        for m in result.scalars().all():
            out[m.journey_id].append(m)
        return out

    @staticmethod
    async def _voted_target_ids(
        db: AsyncSession,
        identity: Optional[AnonIdentity],
        target_type: str,
        target_ids: list[UUID],
    ) -> set[UUID]:
        if not identity or not target_ids:
            return set()
        result = await db.execute(
            select(CommunityVote.target_id).where(
                CommunityVote.identity_id == identity.id,
                CommunityVote.target_type == target_type,
                CommunityVote.target_id.in_(target_ids),
            )
        )
        return {r[0] for r in result.all()}

    @staticmethod
    def _journey_out_dict(
        j: Journey,
        milestones: list[JourneyMilestone],
        sc_map: dict,
        sp_map: dict,
        voted_ids: set,
        identity: Optional[AnonIdentity],
        today: date,
    ) -> dict:
        sc = sc_map.get(j.subclass_slug) if j.subclass_slug else None
        sp = sp_map.get(j.category_slug) if j.category_slug else None
        elapsed = (today - j.lodged_on).days if j.lodged_on else None
        return {
            "id": j.id,
            "post_type": j.post_type,
            "subclass_slug": j.subclass_slug,
            "category_slug": j.category_slug,
            "subclass_code": sc.code if sc else None,
            "subclass_name": sc.name if sc else None,
            "category_name": sp.name if sp else None,
            "stream": j.stream,
            "occupation": j.occupation,
            "state": j.state,
            "area": j.area,
            "sponsor_type": j.sponsor_type,
            "outcome": j.outcome,
            "title": j.title,
            "note": j.note,
            "handle": j.handle,
            "color": j.color,
            "initials": identity_gen.initials_of(j.handle),
            "upvotes": j.upvotes or 0,
            "comment_count": j.comment_count or 0,
            "is_sample": j.is_sample,
            "is_mine": bool(identity and j.identity_id == identity.id),
            "viewer_voted": j.id in voted_ids,
            "processing_days": j.processing_days,
            "elapsed_days": elapsed,
            "milestones": [
                {
                    "id": m.id,
                    "milestone_type": m.milestone_type,
                    "occurred_on": m.occurred_on,
                    "ordinal": m.ordinal,
                    "label": m.label,
                }
                for m in milestones
            ],
            "created_at": j.created_at,
        }

    @staticmethod
    async def build_journey_outs(
        db: AsyncSession,
        journeys: list[Journey],
        *,
        identity: Optional[AnonIdentity] = None,
        sc_map: Optional[dict] = None,
        sp_map: Optional[dict] = None,
    ) -> list[dict]:
        if sc_map is None:
            sc_map = await CommunityService._subclass_map(db)
        if sp_map is None:
            sp_map = await CommunityService._space_map(db)
        ids = [j.id for j in journeys]
        ms = await CommunityService._milestones_for(db, ids)
        voted = await CommunityService._voted_target_ids(db, identity, "journey", ids)
        today = date.today()
        return [
            CommunityService._journey_out_dict(
                j, ms.get(j.id, []), sc_map, sp_map, voted, identity, today
            )
            for j in journeys
        ]

    @staticmethod
    async def _messages_for(
        db: AsyncSession, journey: Journey, *, identity: Optional[AnonIdentity]
    ) -> list[dict]:
        result = await db.execute(
            select(JourneyComment)
            .where(
                JourneyComment.journey_id == journey.id,
                JourneyComment.status == "active",
            )
            .order_by(JourneyComment.created_at.asc())
        )
        comments = list(result.scalars().all())
        ids = [c.id for c in comments]
        voted = await CommunityService._voted_target_ids(db, identity, "comment", ids)

        op_handle = journey.handle if journey.handle != "Anonymous" else None
        replies_by_parent: dict[UUID, list[JourneyComment]] = defaultdict(list)
        for c in comments:
            if c.parent_comment_id is not None:
                replies_by_parent[c.parent_comment_id].append(c)

        def base(c: JourneyComment) -> dict:
            return {
                "id": c.id,
                "handle": c.handle,
                "color": c.color,
                "initials": identity_gen.initials_of(c.handle),
                "body": c.body,
                "upvotes": c.upvotes or 0,
                "is_op": op_handle is not None and c.handle == op_handle,
                "viewer_voted": c.id in voted,
                "created_at": c.created_at,
            }

        out: list[dict] = []
        for c in comments:
            if c.parent_comment_id is not None:
                continue
            msg = base(c)
            replies = []
            for r in replies_by_parent.get(c.id, []):
                rb = base(r)
                rb["reply_to"] = None
                replies.append(rb)
            msg["replies"] = replies
            out.append(msg)
        return out

    @staticmethod
    async def get_journey_detail(
        db: AsyncSession, journey: Journey, *, identity: Optional[AnonIdentity]
    ) -> dict:
        sc_map = await CommunityService._subclass_map(db)
        sp_map = await CommunityService._space_map(db)
        base = (
            await CommunityService.build_journey_outs(
                db, [journey], identity=identity, sc_map=sc_map, sp_map=sp_map
            )
        )[0]
        base["messages"] = await CommunityService._messages_for(
            db, journey, identity=identity
        )
        return base

    @staticmethod
    async def create_journey_comment(
        db: AsyncSession,
        journey_id: UUID,
        payload: CreateJourneyCommentRequest,
        *,
        identity: AnonIdentity,
        ip_hash: str,
    ) -> JourneyComment:
        _consume_rate("comment", ip_hash)
        journey = await CommunityService.get_journey(db, journey_id)
        if journey is None:
            raise ValueError("Post not found")

        parent_id = payload.parent_comment_id
        if parent_id is not None:
            parent = await db.get(JourneyComment, parent_id)
            if (
                parent is None
                or parent.journey_id != journey_id
                or parent.status != "active"
            ):
                parent_id = None
            elif parent.parent_comment_id is not None:
                # Flatten: a reply to a reply attaches to the top-level message.
                parent_id = parent.parent_comment_id

        comment = JourneyComment(
            id=uuid.uuid4(),
            journey_id=journey_id,
            parent_comment_id=parent_id,
            identity_id=identity.id,
            handle=identity.handle,
            color=identity.color,
            body=payload.body.strip(),
        )
        db.add(comment)
        journey.comment_count = (journey.comment_count or 0) + 1
        await db.flush()
        return comment

    @staticmethod
    async def toggle_vote(
        db: AsyncSession,
        *,
        target_type: str,
        target_id: UUID,
        identity: AnonIdentity,
    ) -> Optional[dict]:
        if target_type == "journey":
            target = await db.get(Journey, target_id)
        else:
            target = await db.get(JourneyComment, target_id)
        if target is None or target.status != "active":
            return None

        existing = await db.execute(
            select(CommunityVote).where(
                CommunityVote.identity_id == identity.id,
                CommunityVote.target_type == target_type,
                CommunityVote.target_id == target_id,
            )
        )
        vote = existing.scalar_one_or_none()
        if vote is not None:
            await db.delete(vote)
            target.upvotes = max(0, (target.upvotes or 0) - 1)
            voted = False
        else:
            db.add(
                CommunityVote(
                    id=uuid.uuid4(),
                    identity_id=identity.id,
                    target_type=target_type,
                    target_id=target_id,
                )
            )
            target.upvotes = (target.upvotes or 0) + 1
            voted = True

        await db.flush()
        return {
            "target_type": target_type,
            "target_id": target_id,
            "upvotes": target.upvotes,
            "voted": voted,
        }

    @staticmethod
    async def feed_summary(db: AsyncSession) -> dict:
        active = Journey.status == "active"
        total = await db.scalar(
            select(func.count()).select_from(Journey).where(active)
        )
        questions = await db.scalar(
            select(func.count())
            .select_from(Journey)
            .where(active, Journey.post_type == "question")
        )
        timelines = await db.scalar(
            select(func.count())
            .select_from(Journey)
            .where(active, Journey.post_type == "timeline")
        )
        waiting = await db.scalar(
            select(func.count())
            .select_from(Journey)
            .where(active, Journey.post_type == "timeline", Journey.outcome == "waiting")
        )
        granted = await db.scalar(
            select(func.count())
            .select_from(Journey)
            .where(active, Journey.post_type == "timeline", Journey.outcome == "granted")
        )
        cat_rows = await db.execute(
            select(Journey.category_slug, func.count())
            .where(active, Journey.category_slug.isnot(None))
            .group_by(Journey.category_slug)
        )
        by_category = {slug: int(cnt) for slug, cnt in cat_rows.all()}
        return {
            "all": int(total or 0),
            "questions": int(questions or 0),
            "timelines": int(timelines or 0),
            "waiting": int(waiting or 0),
            "granted": int(granted or 0),
            "by_category": by_category,
        }
