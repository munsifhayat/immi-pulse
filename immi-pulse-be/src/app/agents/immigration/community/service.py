"""Business logic for the Community feature."""

import hashlib
import logging
import secrets
import uuid
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community import identity as identity_gen
from app.agents.immigration.community import notifications, processing, tiers
from app.agents.immigration.community.models import (
    TIMELINE_SOURCE_FORUM,
    TIMELINE_SOURCE_MEMBER,
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
    RateCounter,
    VisaSubclass,
)
from app.agents.immigration.community.schemas import (
    CreateCommentRequest,
    CreateCommunitySpaceRequest,
    CreateJourneyCommentRequest,
    CreateJourneyRequest,
    CreateThreadRequest,
    MilestoneIn,
    ReportRequest,
    SubmitTimelineRequest,
)
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# --- Durable rate limiting ----------------------------------------------------
#
# Counters live in Postgres (``rate_counters``), not in this process. The old
# module-level dict looked fine locally and was wrong everywhere else: a dyno
# restart wiped every tally, and each dyno kept its own, so the real limit was
# the configured one multiplied by the dyno count. A limit that means different
# things on different machines is not a limit.
#
# Two scopes are consumed on every write, in this order:
#
#   1. the **account** (or the device identity standing in for one), capped by
#      its trust tier — see ``tiers.caps_for``;
#   2. the **IP**, capped by ``tiers.IP_CEILING`` — the backstop that keeps free
#      account creation from making (1) meaningless.
#
# Both increments happen inside the caller's transaction, so a write that fails
# for any later reason (a cap error, a validation error, a 409) rolls its own
# consumption back. Allowance is therefore spent on writes that actually
# landed, which is the behaviour a member would expect if you explained it to
# them. The cost is that rejected *attempts* are not themselves counted; p6's
# velocity detection is the right place for that, not this counter.

# Server-side backstop for the "one anonymous timeline" rule. The per-identity
# cap keys off the device token, so clearing storage mints a fresh identity and
# resets it; the ip_hash survives that. Re-exported from ``tiers`` so every
# allowance number in the product is declared in one file.
_ANON_IP_TIMELINE_CAP = tiers.ANON_IP_TIMELINE_CAP


class CommunityRateLimitError(Exception):
    """Raised when a write would exceed a daily allowance (→ HTTP 429).

    Carries which scope refused it, because the two mean different things to
    the member: ``account`` is "you personally have written a lot today",
    ``ip`` is "this network has", and only the latter has "sign in" as a
    remedy.
    """

    def __init__(self, message: str, *, scope: str = "account"):
        super().__init__(message)
        self.scope = scope


class JourneyCapError(Exception):
    """Raised when an anonymous identity tries to post a second timeline.

    The router maps this to HTTP 409 so the frontend can show the sign-in gate.
    """


def hash_ip(ip: str | None) -> str:
    if not ip:
        return "unknown"
    return hashlib.sha256(f"immi-pulse.community.{ip}".encode("utf-8")).hexdigest()[:32]


async def _bump_counter(
    db: AsyncSession,
    *,
    scope_type: str,
    scope_key: str,
    family: str,
    window_start: datetime,
) -> int:
    """Atomically increment one bucket and return its new value.

    A single ``INSERT … ON CONFLICT DO UPDATE … RETURNING`` — the read and the
    write are one statement, so two concurrent requests from the same member
    cannot both see "4 used" and both proceed. Doing this as SELECT-then-UPDATE
    would be a textbook lost update, and the whole point of moving off the dict
    was to stop the limit being approximate.
    """
    now = datetime.now(timezone.utc)
    stmt = (
        pg_insert(RateCounter)
        .values(
            id=uuid.uuid4(),
            scope_type=scope_type,
            scope_key=scope_key,
            action=family,
            window_start=window_start,
            count=1,
            updated_at=now,
        )
        .on_conflict_do_update(
            constraint="uq_rate_counter_scope_action_window",
            set_={
                "count": RateCounter.__table__.c.count + 1,
                "updated_at": now,
            },
        )
        .returning(RateCounter.__table__.c.count)
    )
    return int(await db.scalar(stmt))


# Member-facing copy. Never states the number: a cap you can see is a cap you
# can plan around, and "you have 2 posts left" reads as an accusation to the
# many more people who will see it innocently than abusively.
_ACCOUNT_LIMIT_MESSAGES = {
    tiers.POST: "You've posted a lot today. Try again tomorrow.",
    tiers.REPLY: "You've replied a lot today. Try again tomorrow.",
    tiers.REPORT: "You've reported a lot today. Try again tomorrow.",
}

# The IP ceiling's remedy is signing in, so it says so. It is never a ban: the
# bucket resets at UTC midnight and an operator can clear it outright
# (:func:`reset_rate_counters`) for a shared address that trips it honestly.
_IP_LIMIT_MESSAGES = {
    tiers.POST: (
        "A lot has been posted from this network today. "
        "Sign in to keep going, or try again tomorrow."
    ),
    tiers.REPLY: (
        "A lot has been posted from this network today. "
        "Sign in to keep going, or try again tomorrow."
    ),
    tiers.REPORT: (
        "A lot has been reported from this network today. Try again tomorrow."
    ),
}


async def consume_rate(
    db: AsyncSession,
    action: str,
    *,
    ip_hash: str,
    identity: Optional[AnonIdentity] = None,
) -> None:
    """Spend one unit of ``action`` allowance, or raise.

    ``identity`` is optional because a few legacy write paths (the old thread
    endpoints, timeline submission, reporting) never resolve one — those are
    held to the IP ceiling alone, exactly as they were before this existed.
    """
    family = tiers.family_for(action)
    window_start = tiers.day_window_start()

    if identity is not None:
        tier = tiers.effective_tier(
            has_account=bool(identity.password_hash),
            stored_tier=identity.trust_tier,
        )
        cap = tiers.caps_for(tier).for_action(family)
        used = await _bump_counter(
            db,
            scope_type="account",
            scope_key=str(identity.id),
            family=family,
            window_start=window_start,
        )
        if used > cap:
            logger.info(
                "community rate limit hit scope=account action=%s tier=%s cap=%s",
                family,
                tier,
                cap,
            )
            raise CommunityRateLimitError(
                _ACCOUNT_LIMIT_MESSAGES[family], scope="account"
            )

    ip_cap = tiers.IP_CEILING.for_action(family)
    ip_used = await _bump_counter(
        db,
        scope_type="ip",
        scope_key=ip_hash,
        family=family,
        window_start=window_start,
    )
    if ip_used > ip_cap:
        # Logged at warning because this is the number the plan says to tune
        # from real traffic, and because a shared campus or CGNAT address
        # hitting it is a false positive we want to see, not a win.
        logger.warning(
            "community rate limit hit scope=ip action=%s cap=%s signed_in=%s",
            family,
            ip_cap,
            bool(identity is not None and identity.password_hash),
        )
        raise CommunityRateLimitError(_IP_LIMIT_MESSAGES[family], scope="ip")


async def remaining_allowance(
    db: AsyncSession,
    *,
    ip_hash: str,
    identity: Optional[AnonIdentity] = None,
) -> dict:
    """What is left today, without spending any of it.

    Exists so a composer can show the sign-in prompt *before* a write is
    attempted rather than surfacing a 429 after the fact — being told "no" once
    you have finished typing is a far worse experience than being told up front.
    Read-only: touches no counter.
    """
    window_start = tiers.day_window_start()
    tier = tiers.effective_tier(
        has_account=bool(identity is not None and identity.password_hash),
        stored_tier=identity.trust_tier if identity is not None else None,
    )
    caps = tiers.caps_for(tier)

    scope_filter = RateCounter.scope_type == "ip"
    scope_filter = scope_filter & (RateCounter.scope_key == ip_hash)
    if identity is not None:
        scope_filter = scope_filter | (
            (RateCounter.scope_type == "account")
            & (RateCounter.scope_key == str(identity.id))
        )

    rows = await db.execute(
        select(
            RateCounter.scope_type,
            RateCounter.action,
            RateCounter.count,
        ).where(RateCounter.window_start == window_start, scope_filter)
    )
    used: dict[tuple[str, str], int] = {
        (scope_type, act): int(cnt or 0) for scope_type, act, cnt in rows.all()
    }

    out = {"tier": tier, "tier_name": tiers.tier_name(tier), "actions": {}}
    for family in tiers.FAMILIES:
        account_left = (
            max(0, caps.for_action(family) - used.get(("account", family), 0))
            if identity is not None
            else caps.for_action(family)
        )
        ip_left = max(
            0, tiers.IP_CEILING.for_action(family) - used.get(("ip", family), 0)
        )
        out["actions"][family] = {
            "remaining": min(account_left, ip_left),
            "limited_by": "ip" if ip_left < account_left else "account",
        }
    return out


async def reset_rate_counters(
    db: AsyncSession,
    *,
    scope_type: str,
    scope_key: str,
    action: Optional[str] = None,
) -> int:
    """Clear a scope's counters. Returns how many buckets were removed.

    An operator escape hatch, and the reason the IP ceiling can be described as
    "never a ban": a lecture theatre, a share house or a carrier CGNAT range
    that trips the ceiling honestly can be cleared on the spot rather than told
    to wait out the day. Test harnesses use it for the same reason — they all
    write from 127.0.0.1, so without it a few runs would exhaust the day.
    """
    stmt = delete(RateCounter).where(
        RateCounter.scope_type == scope_type,
        RateCounter.scope_key == scope_key,
    )
    if action is not None:
        stmt = stmt.where(RateCounter.action == tiers.family_for(action))
    result = await db.execute(stmt)
    return int(result.rowcount or 0)


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
        await consume_rate(db, "thread", ip_hash=ip_hash)

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
        await consume_rate(db, "comment", ip_hash=ip_hash)

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
        await consume_rate(db, "report", ip_hash=ip_hash)

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
            .order_by(CommunityReport.created_at.desc())
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

        # Mutate the target if the action changes its visibility. "hide" keeps
        # the record but drops it from the public feed; "remove" tombstones it.
        if action in ("hide", "remove"):
            new_status = "hidden" if action == "hide" else "removed"
            target = await CommunityService._load_target(db, report)
            if target is not None:
                target.status = new_status
                # A hidden/removed journey must also stop feeding the stats:
                # suppress the materialised timeline row(s) it produced so the
                # wait-check percentile maths no longer counts it.
                if report.target_type == "journey":
                    await db.execute(
                        update(CommunityTimeline)
                        .where(CommunityTimeline.journey_id == report.target_id)
                        .values(status=new_status)
                    )
                # ...and it must stop sitting in anyone's inbox. Moderating
                # abuse away while leaving "AbusiveHandle replied to you" in the
                # victim's notifications would defeat the point of moderating it.
                await notifications.hide_for_target(
                    db,
                    target_type=report.target_type,
                    target_id=report.target_id,
                )

        report.status = "dismissed" if action == "dismiss" else "actioned"
        report.resolved_at = datetime.now(timezone.utc)
        report.resolved_by = resolver_user_id
        report.resolution_note = note
        await db.flush()
        return report

    @staticmethod
    async def _load_target(db: AsyncSession, report: CommunityReport):
        """Resolve a report to the row it targets, across the live feed
        (journeys + journey comments) and the legacy forum (threads +
        comments). Returns None for an unknown type or a missing row."""
        target_type = report.target_type
        if target_type == "journey":
            return await db.get(Journey, report.target_id)
        if target_type == "journey_comment":
            return await db.get(JourneyComment, report.target_id)
        if target_type == "thread":
            return await db.get(CommunityThread, report.target_id)
        if target_type == "comment":
            return await db.get(CommunityComment, report.target_id)
        return None

    @staticmethod
    async def _report_context(
        db: AsyncSession, report: CommunityReport
    ) -> tuple[Optional[str], Optional[str], Optional[str]]:
        """A short preview + current status + author handle for the reported
        row, so the moderation queue can show *what* was reported, not just an
        opaque id. Returns (preview, target_status, target_handle)."""
        target = await CommunityService._load_target(db, report)
        if target is None:
            return None, None, None

        target_status = getattr(target, "status", None)
        if report.target_type == "journey":
            preview = target.title or target.note
            handle = target.handle
        elif report.target_type == "journey_comment":
            preview = target.body
            handle = target.handle
        elif report.target_type == "thread":
            preview = target.title or target.body
            handle = target.author_display_name
        else:  # legacy comment
            preview = target.body
            handle = target.author_display_name

        if preview and len(preview) > 200:
            preview = preview[:200].rstrip() + "…"
        return preview, target_status, handle

    @staticmethod
    async def list_open_reports_enriched(db: AsyncSession) -> list[dict]:
        """Open reports with the reported content's preview/status/handle
        attached — the shape the moderation queue actually needs."""
        reports = await CommunityService.list_open_reports(db)
        out: list[dict] = []
        for r in reports:
            preview, tstatus, handle = await CommunityService._report_context(db, r)
            out.append(
                {
                    "id": r.id,
                    "target_type": r.target_type,
                    "target_id": r.target_id,
                    "reason": r.reason,
                    "description": r.description,
                    "status": r.status,
                    "created_at": r.created_at,
                    "resolved_at": r.resolved_at,
                    "resolution_note": r.resolution_note,
                    "target_preview": preview,
                    "target_status": tstatus,
                    "target_handle": handle,
                }
            )
        return out

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
    async def _cohort_sample(db: AsyncSession, subclass_slug: str) -> dict:
        """The publishable cohort for one visa: durations, pending, provenance.

        Four filters decide what counts, and each one exists because leaving it
        out would publish something untrue:

        1. **Active only.** Moderated-away rows stop counting the moment they
           are hidden.
        2. **Published only.** A saved-but-unpublished wait check is its owner's
           private note. It has not been offered to the room and must not move
           the room's numbers — that is the whole meaning of the second consent.
           Timeline rows with no journey behind them are legacy direct
           submissions and are always in scope.
        3. **Last N months of lodgements.** Processing regimes move with policy
           and caseload; a grant from three years ago is not evidence about a
           wait starting today.
        4. **Provenance flag.** Forum-collected rows count only while
           ``community_stats_include_forum`` is on — the one switch that
           reverses that decision.

        Returns the counts split by provenance so every figure built from this
        can state what it is made of.
        """
        settings = get_settings()
        window_start = date.today() - timedelta(
            days=int(settings.community_stats_window_months * 30.44)
        )

        q = (
            select(
                CommunityTimeline.lodged_on,
                CommunityTimeline.decided_on,
                CommunityTimeline.outcome,
                CommunityTimeline.source,
            )
            .outerjoin(Journey, Journey.id == CommunityTimeline.journey_id)
            .where(
                CommunityTimeline.subclass_slug == subclass_slug,
                CommunityTimeline.status == "active",
                CommunityTimeline.lodged_on >= window_start,
                # NULL journey_id = a legacy direct submission with no feed post
                # behind it; those have no publication state to respect.
                or_(
                    CommunityTimeline.journey_id.is_(None),
                    and_(
                        Journey.is_published.is_(True),
                        Journey.status == "active",
                    ),
                ),
            )
        )
        if not settings.community_stats_include_forum:
            q = q.where(CommunityTimeline.source == TIMELINE_SOURCE_MEMBER)

        result = await db.execute(q)

        durations: list[int] = []
        pending = 0
        member_reported = 0
        forum_collected = 0
        for lodged_on, decided_on, outcome, source in result.all():
            if source == TIMELINE_SOURCE_FORUM:
                forum_collected += 1
            else:
                member_reported += 1
            if outcome == "granted" and decided_on is not None:
                durations.append((decided_on - lodged_on).days)
            elif outcome == "waiting":
                pending += 1

        return {
            "decided_days": durations,
            "pending": pending,
            "member_reported": member_reported,
            "forum_collected": forum_collected,
        }

    @staticmethod
    async def _timeline_durations(
        db: AsyncSession, subclass_slug: str
    ) -> tuple[list[int], int]:
        """Back-compat shim: (durations, pending) without the provenance split."""
        cohort = await CommunityService._cohort_sample(db, subclass_slug)
        return cohort["decided_days"], cohort["pending"]

    @staticmethod
    def _stats_from_cohort(cohort: dict) -> dict:
        """Percentile bands + provenance for one cohort, settings applied."""
        settings = get_settings()
        return processing.compute_stats(
            cohort["decided_days"],
            pending=cohort["pending"],
            member_reported=cohort["member_reported"],
            forum_collected=cohort["forum_collected"],
            min_sample=settings.community_stats_min_sample,
            window_months=settings.community_stats_window_months,
        )

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
    def _official_block(sc: VisaSubclass) -> dict:
        """The department's published bands, always with their as-at date.

        ``as_at`` is hand-seeded (``VisaSubclass.official_updated``) — nothing in
        this product ingests Home Affairs figures on a schedule, so nothing in it
        may imply it does. Shipping the date beside the number is what keeps the
        claim honest: a reader can see for themselves how stale it is.
        """
        return {
            "p50_days": sc.official_p50_days,
            "p90_days": sc.official_p90_days,
            "as_at": sc.official_updated,
            "source": "Department of Home Affairs",
            "is_live": False,
        }

    @staticmethod
    async def processing_board(db: AsyncSession) -> list[dict]:
        """Official-vs-community board: one entry per active subclass."""
        subclasses = await CommunityService.list_subclasses(db)
        board: list[dict] = []
        for sc in subclasses:
            cohort = await CommunityService._cohort_sample(db, sc.slug)
            stats = CommunityService._stats_from_cohort(cohort)
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
                    # Flat legacy fields — kept so existing clients keep working.
                    "official_p50_days": sc.official_p50_days,
                    "official_p90_days": sc.official_p90_days,
                    "official_updated": sc.official_updated,
                    # The two blocks the UI is required to render together.
                    "official": CommunityService._official_block(sc),
                    "room": stats,
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
        await consume_rate(db, "timeline", ip_hash=ip_hash)

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

        settings = get_settings()
        label = subclass.code + (f" {subclass.stream}" if subclass.stream else "")
        elapsed_days = max(0, (date.today() - lodged_on).days)
        cohort = await CommunityService._cohort_sample(db, subclass_slug)
        room = CommunityService._stats_from_cohort(cohort)

        verdict = processing.wait_verdict(
            elapsed_days,
            decided_days=cohort["decided_days"],
            pending=cohort["pending"],
            subclass_label=label,
            member_reported=cohort["member_reported"],
            forum_collected=cohort["forum_collected"],
            min_sample=settings.community_stats_min_sample,
            window_months=settings.community_stats_window_months,
        )
        # Cohort fallback: below the sample floor we do not publish a community
        # median at all — we answer from the official Home Affairs bands, which
        # are thin but real and attributable. The room's own counts still travel
        # in the ``room`` block, so the answer can say "and here is how close we
        # are to being able to tell you ourselves" without pretending it already
        # can. Never invents community data.
        if verdict["tier"] == "unknown":
            verdict = processing.wait_verdict_official(
                elapsed_days,
                official_p50=subclass.official_p50_days,
                official_p90=subclass.official_p90_days,
                subclass_label=label,
                member_reported=cohort["member_reported"],
                forum_collected=cohort["forum_collected"],
                min_sample=settings.community_stats_min_sample,
                window_months=settings.community_stats_window_months,
            )
        verdict.update(
            {
                "subclass_slug": subclass.slug,
                "subclass_label": label,
                # Flat legacy fields — unchanged contract for existing clients.
                "official_p50_days": subclass.official_p50_days,
                "official_p90_days": subclass.official_p90_days,
                "official_updated": subclass.official_updated,
                # The two blocks that must be rendered together.
                "official": CommunityService._official_block(subclass),
                "room": room,
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
        # The handle is the login identifier once an account exists, so rerolling
        # after signup would silently change what the member signs in with.
        if identity.password_hash:
            raise ValueError("Your handle locks once you've created an account.")
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
        has_account = bool(identity.password_hash)
        # A community account lifts the one-timeline cap exactly like a portal
        # account does — both mean "this is a durable person, not a drive-by".
        is_claimed = identity.user_id is not None or has_account
        return {
            "handle": identity.handle,
            "color": identity.color,
            "initials": identity_gen.initials_of(identity.handle),
            "journeys_posted": identity.journeys_posted or 0,
            "is_claimed": is_claimed,
            "can_post_timeline": is_claimed or (identity.journeys_posted or 0) < 1,
            "device_token": identity.device_token if include_token else None,
            "has_account": has_account,
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
        publish: bool = True,
    ) -> Journey:
        """Create a feed post.

        ``publish=False`` mints a **draft**: a real, owned timeline row that the
        feed and the statistics both ignore until its owner explicitly publishes
        it. That is the shape a saved wait check takes. Allowance is consumed
        here, at row creation, rather than at publication — so drafting cannot be
        used to hoard free writes, and publishing something already paid for
        costs nothing extra.
        """
        is_timeline = payload.post_type == "timeline"
        await consume_rate(
            db,
            "journey" if is_timeline else "question",
            ip_hash=ip_hash,
            identity=identity,
        )

        if is_timeline and identity.user_id is None:
            if (identity.journeys_posted or 0) >= 1:
                raise JourneyCapError(
                    "You've already shared a timeline. Sign in to add or edit more."
                )
            # Storage-clear backstop: count real (materialised, non-sample)
            # timelines already contributed from this network.
            ip_timelines = await db.scalar(
                select(func.count())
                .select_from(CommunityTimeline)
                .where(
                    CommunityTimeline.author_ip_hash == ip_hash,
                    CommunityTimeline.status == "active",
                    CommunityTimeline.journey_id.isnot(None),
                )
            )
            if (ip_timelines or 0) >= _ANON_IP_TIMELINE_CAP:
                raise JourneyCapError(
                    "A timeline has already been shared from this network. "
                    "Sign in to add another."
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
            is_published=publish,
            published_at=datetime.now(timezone.utc) if publish else None,
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

            # Mirror published shares into the stats table so the wait-check
            # reflects them immediately. A draft gets no mirror row at all —
            # the cleanest possible guarantee that an unpublished timeline
            # cannot move a public number, because the number's source table
            # has never heard of it.
            await CommunityService._sync_timeline_mirror(
                db, journey, ip_hash=ip_hash
            )

            identity.journeys_posted = (identity.journeys_posted or 0) + 1

        await db.flush()
        return journey

    # --- Draft ↔ published, and the stats mirror -----------------------------

    @staticmethod
    async def _sync_timeline_mirror(
        db: AsyncSession, journey: Journey, *, ip_hash: Optional[str] = None
    ) -> Optional[CommunityTimeline]:
        """Make ``community_timelines`` agree with this journey. Idempotent.

        One function owns the whole relationship between a feed post and its
        contribution to the public numbers, so "does this count?" has exactly
        one answer in the codebase instead of one per call site. It creates the
        mirror row, updates it when milestones arrive later, and deletes it the
        moment the journey stops qualifying.

        A journey qualifies when it is a published, active timeline with a visa
        and a lodgement date. Drafts do not qualify — which is what makes the
        publish step a real consent rather than a label.
        """
        existing = (
            await db.execute(
                select(CommunityTimeline).where(
                    CommunityTimeline.journey_id == journey.id
                )
            )
        ).scalar_one_or_none()

        qualifies = (
            journey.post_type == "timeline"
            and bool(journey.is_published)
            and journey.status == "active"
            and journey.lodged_on is not None
            and bool(journey.subclass_slug)
        )

        if not qualifies:
            if existing is not None:
                await db.delete(existing)
                await db.flush()
            return None

        source = TIMELINE_SOURCE_FORUM if journey.is_sample else TIMELINE_SOURCE_MEMBER
        if existing is None:
            existing = CommunityTimeline(
                id=uuid.uuid4(),
                subclass_slug=journey.subclass_slug,
                journey_id=journey.id,
                lodged_on=journey.lodged_on,
                decided_on=journey.decided_on,
                outcome=journey.outcome,
                source=source,
                note=(journey.note[:280] if journey.note else None),
                author_ip_hash=ip_hash,
            )
            db.add(existing)
        else:
            existing.subclass_slug = journey.subclass_slug
            existing.lodged_on = journey.lodged_on
            existing.decided_on = journey.decided_on
            existing.outcome = journey.outcome
            existing.source = source
            existing.status = "active"
        await db.flush()
        return existing

    @staticmethod
    async def save_wait_check(
        db: AsyncSession,
        *,
        identity: AnonIdentity,
        ip_hash: str,
        subclass_slug: str,
        lodged_on: date,
        milestones: Optional[list] = None,
        note: Optional[str] = None,
    ) -> Journey:
        """Turn a wait check into the member's own (unpublished) timeline.

        This is the unification the phase is named for. Checking a wait and
        sharing a timeline need the same two facts — which visa, and when you
        lodged — so the check *is* the first draft of the timeline, and saving is
        one tap rather than a second form nobody fills in. It is also why data
        can now arrive from the highest-traffic page instead of the rarest
        action.

        What it deliberately does **not** do is publish. The result is private
        until its owner says otherwise, and nothing here touches the feed or the
        numbers.
        """
        payload = CreateJourneyRequest(
            post_type="timeline",
            subclass_slug=subclass_slug,
            outcome="waiting",
            note=note,
            milestones=milestones
            or [MilestoneIn(milestone_type="Visa Lodged", occurred_on=lodged_on)],
        )
        return await CommunityService.create_journey(
            db, payload, identity=identity, ip_hash=ip_hash, publish=False
        )

    @staticmethod
    async def get_owned_journey(
        db: AsyncSession, journey_id: UUID, identity: Optional[AnonIdentity]
    ) -> Optional[Journey]:
        """A journey the caller owns — drafts included. ``None`` otherwise.

        Ownership is checked before existence is revealed: a stranger probing
        ids gets the same 404 for "not yours" as for "no such post", so this
        cannot be used to discover that a given draft exists.
        """
        if identity is None:
            return None
        journey = await db.get(Journey, journey_id)
        if journey is None or journey.status != "active":
            return None
        if journey.identity_id != identity.id:
            return None
        return journey

    @staticmethod
    async def publish_journey(
        db: AsyncSession, journey: Journey, *, ip_hash: Optional[str] = None
    ) -> Journey:
        """Publish a draft to the feed — the second, explicit consent.

        Idempotent: publishing an already-public post is a no-op rather than an
        error, so a double-tapped button cannot produce a confusing failure.
        """
        if journey.is_published:
            return journey
        journey.is_published = True
        journey.published_at = datetime.now(timezone.utc)
        await db.flush()
        await CommunityService._sync_timeline_mirror(db, journey, ip_hash=ip_hash)
        return journey

    @staticmethod
    async def append_milestones(
        db: AsyncSession,
        journey: Journey,
        milestones: list,
        *,
        outcome: Optional[str] = None,
        ip_hash: Optional[str] = None,
    ) -> Journey:
        """Add later milestones (medical, s56, grant) to an owned timeline.

        A visa wait is a fourteen-month story, not a single submission. Without
        this the saved timeline is a snapshot that silently rots — and, worse,
        the grant that would correct the community median never arrives, so the
        published numbers stay biased toward whatever people happened to report
        on day one.

        Re-derives the whole span from the merged milestone set and re-syncs the
        stats mirror, so a draft that gains a grant date is still a draft, and a
        published one updates the public number the moment it does.
        """
        if journey.post_type != "timeline":
            raise ValueError("Only a timeline can take milestones.")

        existing = await db.execute(
            select(JourneyMilestone).where(
                JourneyMilestone.journey_id == journey.id
            )
        )
        merged: dict[tuple[str, date], Optional[str]] = {}
        for m in existing.scalars().all():
            merged[(m.milestone_type, m.occurred_on)] = m.label
        for m in milestones:
            merged[(m.milestone_type, m.occurred_on)] = (
                m.label.strip() if getattr(m, "label", None) else None
            )

        # Rebuild the ordered set rather than appending, so a re-sent milestone
        # cannot duplicate itself and ordinals stay contiguous.
        await db.execute(
            delete(JourneyMilestone).where(
                JourneyMilestone.journey_id == journey.id
            )
        )
        ordered = sorted(merged.items(), key=lambda kv: kv[0][1])
        ms_tuples: list[tuple[str, date]] = []
        for i, ((mtype, occurred_on), label) in enumerate(ordered):
            db.add(
                JourneyMilestone(
                    id=uuid.uuid4(),
                    journey_id=journey.id,
                    milestone_type=mtype,
                    occurred_on=occurred_on,
                    ordinal=i,
                    label=label,
                )
            )
            ms_tuples.append((mtype, occurred_on))

        if outcome:
            journey.outcome = outcome
        elif any(t == processing.GRANTED_MILESTONE for t, _ in ms_tuples):
            journey.outcome = "granted"

        lodged, decided, days = processing.derive_span(ms_tuples, journey.outcome)
        journey.lodged_on = lodged
        journey.decided_on = decided
        journey.processing_days = days
        await db.flush()

        await CommunityService._sync_timeline_mirror(db, journey, ip_hash=ip_hash)
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
        # Drafts are excluded here and nowhere else is needed for the feed:
        # every feed read funnels through this one query.
        q = select(Journey).where(
            Journey.status == "active", Journey.is_published.is_(True)
        )
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
        db: AsyncSession,
        journey_id: UUID,
        *,
        viewer: Optional[AnonIdentity] = None,
    ) -> Optional[Journey]:
        """A publicly readable journey — or the caller's own draft.

        Passing ``viewer`` is what lets someone open the timeline they just
        saved. Everyone else gets ``None`` (→ 404) for a draft, indistinguishable
        from a post that does not exist.
        """
        journey = await db.get(Journey, journey_id)
        if journey is None or journey.status != "active":
            return None
        if not journey.is_published:
            if viewer is None or journey.identity_id != viewer.id:
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
            "is_published": bool(j.is_published),
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
        await consume_rate(db, "comment", ip_hash=ip_hash, identity=identity)
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

        # Tell whoever was answered. Runs inside this transaction, so a reply
        # that fails to save cannot leave a notification pointing at nothing.
        # The *email* for it is sent by the router after the commit, for the
        # mirror-image reason — see notifications.deliver_reply_emails.
        await notifications.fan_out_reply(
            db, journey=journey, comment=comment, author=identity
        )
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
        # Counts describe the feed, so they count what the feed shows: drafts
        # are excluded, or the filter rail would promise posts that aren't there.
        active = and_(Journey.status == "active", Journey.is_published.is_(True))
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
