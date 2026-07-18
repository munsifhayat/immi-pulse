"""The trust ladder in motion — computing tiers, and holding what should not be public.

``tiers.py`` decides what a set of signals *means*. This module gathers those
signals from the database, writes the conclusion back, and applies the two
consequences that need a session: screening a write before it lands, and
holding content into the moderation queue when it should not go straight out.

Three principles this module is built around, all of them load-bearing:

**Tiers are computed, never displayed.** Nothing here is returned by a public
serializer. There is no score, no badge, no leaderboard, and no endpoint that
tells a member what tier they are on. The only tier a reader ever sees is T4,
the registered professional, and that is a disclosure the reader is entitled to
rather than a reward the member earned. Making the ladder visible would turn it
into the thing people optimise, and a waiting room where people post to climb a
ladder is a worse waiting room.

**A hold is not a deletion.** Auto-held content keeps its row, stays visible to
its author, and lands in the *existing* moderation queue as an open report — so
a human decides, and a false positive costs a member a delay rather than their
post. Dismissing that report puts the content straight back into the feed.

**Nothing here can ban.** The strongest automatic action available is "held for
review" or "not shown in the feed". Every one of them is reversible by a
moderator and none of them is reversible only by time.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community import antispam, tiers
from app.agents.immigration.community.models import (
    CONTENT_ACTIVE,
    CONTENT_HELD,
    REPORT_SOURCE_AUTO,
    AnonIdentity,
    CommunityReport,
    Journey,
    JourneyComment,
)
from app.core.config import get_settings

logger = logging.getLogger(__name__)


# --- Signal gathering ---------------------------------------------------------


async def gather_signals(db: AsyncSession, account: AnonIdentity) -> tiers.TrustSignals:
    """Read everything the promotion policy is allowed to look at.

    "Surviving" is the operative word in ``surviving_contributions``: held,
    hidden, removed and unpublished content is not counted. Volume that
    moderation had to clean up is not evidence that someone can be trusted with
    more, and counting it would make the fastest route to T2 "post a lot and
    accept that some of it gets pulled".
    """
    now = datetime.now(timezone.utc)
    created = account.created_at or now
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_days = max(0, (now - created).days)

    journeys = (
        await db.execute(
            select(
                func.count(Journey.id),
                func.coalesce(func.sum(Journey.upvotes), 0),
            ).where(
                Journey.identity_id == account.id,
                Journey.status == CONTENT_ACTIVE,
                Journey.is_published.is_(True),
            )
        )
    ).one()

    comments = (
        await db.execute(
            select(
                func.count(JourneyComment.id),
                func.coalesce(func.sum(JourneyComment.upvotes), 0),
            ).where(
                JourneyComment.identity_id == account.id,
                JourneyComment.status == CONTENT_ACTIVE,
            )
        )
    ).one()

    # A timeline taken all the way to a decision. This is the T3 gate, and the
    # reason T3 cannot be farmed: sitting out a visa queue is not something a
    # script can do.
    completed = await db.scalar(
        select(func.count(Journey.id)).where(
            Journey.identity_id == account.id,
            Journey.post_type == "timeline",
            Journey.status == CONTENT_ACTIVE,
            Journey.is_published.is_(True),
            Journey.outcome.in_(("granted", "refused")),
        )
    )

    last_upheld = account.last_upheld_report_at
    if last_upheld is not None and last_upheld.tzinfo is None:
        last_upheld = last_upheld.replace(tzinfo=timezone.utc)
    cutoff = now - timedelta(days=tiers.UPHELD_REPORT_WINDOW_DAYS)
    recent_upheld = (
        int(account.upheld_reports or 0)
        if last_upheld is not None and last_upheld >= cutoff
        else 0
    )

    return tiers.TrustSignals(
        account_age_days=age_days,
        surviving_contributions=int(journeys[0] or 0) + int(comments[0] or 0),
        net_votes=int(journeys[1] or 0) + int(comments[1] or 0),
        upheld_reports=int(account.upheld_reports or 0),
        upheld_reports_recent=recent_upheld,
        completed_timelines=int(completed or 0),
        email_verified=account.email_verified_at is not None,
        is_professional=int(account.trust_tier or 0) == tiers.T4_PROFESSIONAL,
    )


async def recompute_tier(db: AsyncSession, account: AnonIdentity) -> int:
    """Recompute and store one account's tier. Returns the new tier.

    Promotion is silent and effective on the next request — there is no
    announcement, because being told you have been promoted is what makes a
    ladder into a game. Members notice T2 the way it is meant to be noticed: a
    link they post one day simply goes through.
    """
    signals = await gather_signals(db, account)
    new_tier = tiers.compute_tier(signals)
    previous = int(account.trust_tier or tiers.T1_NEW)

    account.trust_tier = new_tier
    account.tier_computed_at = datetime.now(timezone.utc)
    # Shadow-limiting is a separate axis from tier and is recomputed here too,
    # so an account that has served its history can come back out of it.
    account.shadow_limited = (
        int(account.upheld_reports or 0) >= tiers.SHADOW_LIMIT_UPHELD_THRESHOLD
    )

    if new_tier != previous:
        logger.info(
            "community tier change identity=%s %s -> %s (age=%sd contrib=%s votes=%s "
            "upheld=%s recent_upheld=%s completed=%s)",
            account.id,
            previous,
            new_tier,
            signals.account_age_days,
            signals.surviving_contributions,
            signals.net_votes,
            signals.upheld_reports,
            signals.upheld_reports_recent,
            signals.completed_timelines,
        )
    return new_tier


async def recompute_all_tiers(db: AsyncSession, *, batch_size: int = 500) -> dict:
    """Recompute every account's tier. The nightly job's entry point.

    Only rows with a password are considered: a device identity with no account
    is T0 by definition (``tiers.effective_tier``) whatever the column says, so
    computing a tier for one would be writing a number nothing reads.
    """
    offset = 0
    counts: dict[int, int] = {}
    changed = 0
    scanned = 0

    while True:
        accounts = list(
            (
                await db.execute(
                    select(AnonIdentity)
                    .where(AnonIdentity.password_hash.isnot(None))
                    .order_by(AnonIdentity.created_at.asc())
                    .limit(batch_size)
                    .offset(offset)
                )
            )
            .scalars()
            .all()
        )
        if not accounts:
            break
        for account in accounts:
            before = int(account.trust_tier or tiers.T1_NEW)
            after = await recompute_tier(db, account)
            counts[after] = counts.get(after, 0) + 1
            scanned += 1
            if after != before:
                changed += 1
        await db.commit()
        offset += batch_size

    return {"scanned": scanned, "changed": changed, "by_tier": counts}


async def record_upheld_report(
    db: AsyncSession, *, identity_id: Optional[UUID]
) -> Optional[AnonIdentity]:
    """A moderator upheld a report against this member's content.

    Increments the lifetime count, stamps the recency clock, and recomputes the
    tier on the spot rather than waiting for the nightly job — demotion is the
    one direction where a day's delay has a real cost, because the account is
    still posting in the meantime.
    """
    if identity_id is None:
        return None
    account = await db.get(AnonIdentity, identity_id)
    if account is None:
        return None
    account.upheld_reports = int(account.upheld_reports or 0) + 1
    account.last_upheld_report_at = datetime.now(timezone.utc)
    await db.flush()
    await recompute_tier(db, account)
    await db.flush()
    return account


# --- Screening a write --------------------------------------------------------


@dataclass
class ScreenResult:
    """What screening decided about one piece of content.

    Two outcomes, and they are meaningfully different. ``reject_reasons`` means
    the write does not happen and the member is told why immediately, so they
    can edit and try again — the right answer for a rule they can satisfy
    themselves ("no links yet"). ``hold_reasons`` means the write lands, is kept
    out of the feed, and waits for a human — the right answer for a judgement
    nobody should be making automatically.
    """

    reject_reasons: list[str] = field(default_factory=list)
    hold_reasons: list[str] = field(default_factory=list)

    @property
    def rejected(self) -> bool:
        return bool(self.reject_reasons)

    @property
    def held(self) -> bool:
        return bool(self.hold_reasons)


# Member-facing copy for the contact gate. Names the rule and when it lifts,
# because a refusal a member cannot act on reads as a bug and gets reported as
# one. It does not name a tier or a score — the ladder stays invisible.
CONTACT_GATE_MESSAGE = (
    "New accounts can't post links, phone numbers or contact handles yet. "
    "This lifts automatically once you've been part of the room for a week or so. "
    "Links to homeaffairs.gov.au and other official sources always work."
)


async def _recent_write_count(
    db: AsyncSession, *, identity: AnonIdentity, since: datetime
) -> int:
    """Posts + comments this identity has landed since ``since``."""
    journeys = await db.scalar(
        select(func.count(Journey.id)).where(
            Journey.identity_id == identity.id, Journey.created_at >= since
        )
    )
    comments = await db.scalar(
        select(func.count(JourneyComment.id)).where(
            JourneyComment.identity_id == identity.id,
            JourneyComment.created_at >= since,
        )
    )
    return int(journeys or 0) + int(comments or 0)


async def _duplicate_thread_count(
    db: AsyncSession, *, identity: AnonIdentity, fingerprint: str
) -> int:
    """How many distinct threads already carry this exact body from this member.

    Counts a journey as its own thread, so pasting the same pitch as three
    top-level posts is caught the same way as pasting it into three other
    people's threads.
    """
    comment_threads = await db.scalar(
        select(func.count(func.distinct(JourneyComment.journey_id))).where(
            JourneyComment.identity_id == identity.id,
            JourneyComment.content_fingerprint == fingerprint,
        )
    )
    own_posts = await db.scalar(
        select(func.count(Journey.id)).where(
            Journey.identity_id == identity.id,
            Journey.content_fingerprint == fingerprint,
        )
    )
    return int(comment_threads or 0) + int(own_posts or 0)


async def screen_write(
    db: AsyncSession,
    *,
    identity: AnonIdentity,
    text: str,
    fingerprint: Optional[str] = None,
) -> ScreenResult:
    """Decide whether this content may be published, held, or refused.

    Ordering matters. Touting is checked first and at every tier, because it is
    the one signal that is a legal question rather than a spam question. The
    contact gate is checked second and only below T2. Velocity and similarity
    are checked last because they cost queries, and content already destined for
    a hold does not need a second reason to be held.
    """
    result = ScreenResult()
    tier = tiers.effective_tier(
        has_account=bool(identity.password_hash),
        stored_tier=identity.trust_tier,
    )

    touting = antispam.touting_signals(text)
    if touting:
        result.hold_reasons.extend(touting)

    if not tiers.may_post_contact_details(tier):
        contact = antispam.contact_signals(text)
        if contact:
            result.reject_reasons.extend(contact)
            # A refused write never lands, so there is nothing to hold and no
            # point paying for the remaining queries.
            return result

    if not result.hold_reasons:
        settings = get_settings()
        window = settings.community_velocity_window_seconds
        max_writes = settings.community_velocity_max_writes
        since = datetime.now(timezone.utc) - timedelta(seconds=window)
        if await _recent_write_count(db, identity=identity, since=since) >= max_writes:
            result.hold_reasons.append(
                f"{max_writes}+ posts in {window} seconds"
            )

    if not result.hold_reasons and fingerprint:
        existing = await _duplicate_thread_count(
            db, identity=identity, fingerprint=fingerprint
        )
        if existing >= antispam.SIMILARITY_MIN_THREADS - 1:
            result.hold_reasons.append(
                f"identical text already posted in {existing} other threads"
            )

    return result


# --- Holding into the existing moderation queue --------------------------------


async def auto_hold(
    db: AsyncSession,
    *,
    target_type: str,
    target_id: UUID,
    reasons: list[str],
) -> CommunityReport:
    """Hold content for review by filing a report against it.

    Deliberately reuses ``community_reports`` rather than inventing a second
    queue. A moderator should have one list to work, and auto-held content needs
    exactly the same decision — leave it up or take it down — as content a
    member reported. ``source="auto"`` is what lets the queue label it, and the
    weight is set at the hold threshold so the row reads consistently beside
    member reports that reached the same bar.
    """
    report = CommunityReport(
        id=uuid.uuid4(),
        target_type=target_type,
        target_id=target_id,
        reason="spam",
        description="Held automatically: " + "; ".join(reasons),
        source=REPORT_SOURCE_AUTO,
        weight=tiers.AUTO_HOLD_REPORT_WEIGHT,
        status="open",
    )
    db.add(report)
    await db.flush()
    logger.info(
        "community auto-hold target=%s/%s reasons=%s",
        target_type,
        target_id,
        reasons,
    )
    return report


async def accumulated_report_weight(
    db: AsyncSession, *, target_type: str, target_id: UUID
) -> int:
    """Total weight of the open reports standing against a piece of content."""
    total = await db.scalar(
        select(func.coalesce(func.sum(CommunityReport.weight), 0)).where(
            CommunityReport.target_type == target_type,
            CommunityReport.target_id == target_id,
            CommunityReport.status == "open",
        )
    )
    return int(total or 0)


# --- Shadow limiting ----------------------------------------------------------


def shadow_limit_filter(model, viewer: Optional[AnonIdentity]):
    """A WHERE clause that hides shadow-limited authors from everyone but themselves.

    The point of shadow-limiting is that the account sees no change: their post
    appears, their profile lists it, nothing tells them they have been limited.
    An account that knows it has been limited simply makes another one, so the
    silence is the mechanism, not a courtesy.

    ``model`` is :class:`Journey` or :class:`JourneyComment` — anything with an
    ``identity_id``. Rows with a NULL ``identity_id`` (seeded sample content)
    are explicitly kept: a bare ``NOT IN`` would evaluate to NULL for them and
    silently empty the feed, which is exactly the kind of failure that looks
    like a broken query rather than a policy.
    """
    shadowed = select(AnonIdentity.id).where(AnonIdentity.shadow_limited.is_(True))
    visible = or_(
        model.identity_id.is_(None),
        model.identity_id.notin_(shadowed),
    )
    if viewer is not None:
        visible = or_(visible, model.identity_id == viewer.id)
    return visible


def visible_status_filter(model, viewer: Optional[AnonIdentity]):
    """Active content, plus the viewer's own held content.

    Held content stays visible to its author for the same reason a hold is not
    a deletion: they wrote it in good faith until a human says otherwise, and
    discovering that a post silently vanished is how a member concludes the room
    is broken and leaves.
    """
    visible = model.status == CONTENT_ACTIVE
    if viewer is not None:
        visible = or_(
            visible,
            (model.status == CONTENT_HELD) & (model.identity_id == viewer.id),
        )
    return visible
