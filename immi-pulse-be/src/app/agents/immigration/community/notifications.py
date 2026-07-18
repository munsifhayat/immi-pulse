"""Reply notifications — the inbox, and the batched email that points at it.

Why this exists at all: a Q&A room where you ask something and are never told
that someone answered is a room people post into once. The inbox closes that
loop, and it is the **primary** channel — email is the optional pull-back layer
on top. That ordering is what makes an optional email address workable, and it
is why nothing here fails if a member has no address.

Three rules are load-bearing rather than stylistic:

1. **Neutral subjects and previews, always.** An immi360 email may never name a
   visa subclass, a question title, or any body text — not in the subject, not
   in the preheader (which inbox lists render beside the subject), not in the
   body. Members share inboxes and devices with partners, employers and family,
   and "New reply on your 820 partner visa question" outs someone's immigration
   status to whoever is looking at the phone on the kitchen table. The email
   says only that *something* is waiting; the content stays behind a login.

2. **Batching.** At most one email per (recipient, thread, UTC day). The first
   reply mails you; the nineteen that follow a question catching fire do not.
   Without this the product's own success becomes the reason people mute it.

3. **Replying to yourself notifies nobody.** Obvious, and easy to get wrong,
   because the author of a comment is almost always *someone's* recipient.

Recipients are ``anon_identities`` rows, which are both device identities and
accounts. Notifying a passwordless visitor is deliberate: the row they already
are will hold the notification until they set a password, so claiming an account
reveals a full inbox rather than an empty one.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community import identity as identity_gen
from app.agents.immigration.community import tiers
from app.agents.immigration.community.models import (
    AnonIdentity,
    CommunityNotification,
    Journey,
    JourneyComment,
)
from app.core.config import get_settings

logger = logging.getLogger(__name__)

REPLY_TO_POST = "reply_to_post"
REPLY_TO_COMMENT = "reply_to_comment"

# How much of a reply the inbox shows. Long enough to recognise the thread,
# short enough that the inbox stays a pointer rather than a second feed.
PREVIEW_CHARS = 160


def _truncate(text: Optional[str], limit: int = PREVIEW_CHARS) -> Optional[str]:
    if not text:
        return None
    cleaned = " ".join(text.split())
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit].rstrip() + "…"


# --------------------------------------------------------------------------
# Fan-out
# --------------------------------------------------------------------------


async def fan_out_reply(
    db: AsyncSession,
    *,
    journey: Journey,
    comment: JourneyComment,
    author: AnonIdentity,
) -> list[CommunityNotification]:
    """Create the inbox entries a new reply earns. Runs in the caller's txn.

    Exactly one recipient, chosen the way Reddit chooses it and for the same
    reason: a top-level reply belongs to the person who asked, a reply to a
    comment belongs to the person who wrote that comment. Notifying the post
    author about every reply anywhere under their post is how a popular thread
    turns its own author into the most-spammed person in the room.

    Returns the rows created (empty when the only candidate was the author
    themselves), so the caller can decide whether an email is worth attempting.
    """
    recipient_id: Optional[UUID] = None
    kind = REPLY_TO_POST
    parent_comment_id: Optional[UUID] = None

    if comment.parent_comment_id is not None:
        parent = await db.get(JourneyComment, comment.parent_comment_id)
        if parent is not None:
            recipient_id = parent.identity_id
            kind = REPLY_TO_COMMENT
            parent_comment_id = parent.id

    if recipient_id is None:
        # Either a top-level reply, or a reply whose parent has vanished — in
        # both cases the post's author is the person who was answered.
        recipient_id = journey.identity_id
        kind = REPLY_TO_POST
        parent_comment_id = None

    # Nobody to tell (a seeded post with no identity), or you are talking to
    # yourself. Self-replies are extremely common — authors clarify their own
    # question constantly — so this branch is the normal case, not an edge one.
    if recipient_id is None or recipient_id == author.id:
        return []

    notification = CommunityNotification(
        id=uuid.uuid4(),
        recipient_identity_id=recipient_id,
        type=kind,
        journey_id=journey.id,
        comment_id=comment.id,
        parent_comment_id=parent_comment_id,
        actor_identity_id=author.id,
        actor_handle=author.handle,
        actor_color=author.color,
        preview=_truncate(comment.body),
        context_title=_truncate(journey.title or journey.note, 120),
        status="active",
    )
    db.add(notification)
    await db.flush()
    return [notification]


# --------------------------------------------------------------------------
# Moderation
# --------------------------------------------------------------------------


async def hide_for_target(
    db: AsyncSession, *, target_type: str, target_id: UUID
) -> int:
    """Hide every notification whose source content was just moderated away.

    Called from the moderation path so unread counts drop immediately. Reads
    additionally re-check the source rows' status (see :func:`_inbox_query`),
    which is the mechanism that cannot be forgotten; this one is what keeps the
    badge honest without a join on every count.
    """
    if target_type == "journey":
        where = CommunityNotification.journey_id == target_id
    elif target_type == "journey_comment":
        where = CommunityNotification.comment_id == target_id
    else:
        return 0

    result = await db.execute(
        update(CommunityNotification)
        .where(where, CommunityNotification.status == "active")
        .values(status="hidden")
    )
    return int(result.rowcount or 0)


# --------------------------------------------------------------------------
# Inbox reads
# --------------------------------------------------------------------------


def _inbox_query(account: AnonIdentity):
    """Live notifications for ``account``.

    The joins are the safety net: a notification is only readable while both the
    reply that caused it and the post it sits under are still active. Content
    hidden by any path — the moderation queue, a future bulk action, a hand-run
    SQL fix — disappears from inboxes without that path having to know inboxes
    exist.

    ``is_published`` is checked here for the same reason and is *not* covered by
    the status check: a draft is a healthy ``active`` row, so filtering on status
    alone would let an unpublished timeline generate visible reply notifications
    — a post nobody can see, sending its owner mail about replies that are not
    reachable. Publication state and moderation state are independent axes and
    both have to be asked about.
    """
    return (
        select(CommunityNotification, JourneyComment, Journey)
        .join(JourneyComment, JourneyComment.id == CommunityNotification.comment_id)
        .join(Journey, Journey.id == CommunityNotification.journey_id)
        .where(
            CommunityNotification.recipient_identity_id == account.id,
            CommunityNotification.status == "active",
            JourneyComment.status == "active",
            Journey.status == "active",
            Journey.is_published.is_(True),
        )
    )


async def unread_count(db: AsyncSession, *, account: AnonIdentity) -> int:
    rows = await db.execute(
        _inbox_query(account)
        .where(CommunityNotification.read_at.is_(None))
        .with_only_columns(func.count(CommunityNotification.id))
        .order_by(None)
    )
    return int(rows.scalar() or 0)


async def list_inbox(
    db: AsyncSession,
    *,
    account: AnonIdentity,
    limit: int = 30,
    offset: int = 0,
    unread_only: bool = False,
) -> dict:
    """The inbox page plus the badge number.

    The count is always the *total* unread, never "unread on this page" — a
    badge that changes when you paginate is a badge nobody trusts.
    """
    query = _inbox_query(account)
    if unread_only:
        query = query.where(CommunityNotification.read_at.is_(None))
    query = query.order_by(CommunityNotification.created_at.desc())

    rows = (await db.execute(query.limit(limit).offset(offset))).all()

    items = []
    for notification, comment, journey in rows:
        items.append(
            {
                "id": notification.id,
                "type": notification.type,
                "journey_id": journey.id,
                "comment_id": comment.id,
                "parent_comment_id": notification.parent_comment_id,
                "actor_handle": notification.actor_handle,
                "actor_color": notification.actor_color,
                "actor_initials": identity_gen.initials_of(notification.actor_handle),
                "preview": notification.preview or _truncate(comment.body),
                "context_title": notification.context_title
                or _truncate(journey.title or journey.note, 120),
                "post_type": journey.post_type,
                "is_read": notification.read_at is not None,
                "read_at": notification.read_at,
                "created_at": notification.created_at,
            }
        )

    return {
        "items": items,
        "unread_count": await unread_count(db, account=account),
    }


async def mark_read(
    db: AsyncSession, *, account: AnonIdentity, ids: Optional[list[UUID]] = None
) -> int:
    """Mark notifications read. Idempotent — already-read rows are left alone.

    ``ids=None`` means "mark everything read", which is what the "clear" affordance
    on an inbox does. Scoped to the recipient in the WHERE clause, so passing
    somebody else's notification id marks nothing rather than erroring: an
    endpoint that distinguishes "not yours" from "already read" is an oracle for
    which notification ids exist.
    """
    stmt = update(CommunityNotification).where(
        CommunityNotification.recipient_identity_id == account.id,
        CommunityNotification.read_at.is_(None),
    )
    if ids:
        stmt = stmt.where(CommunityNotification.id.in_(ids))
    result = await db.execute(stmt.values(read_at=datetime.now(timezone.utc)))
    return int(result.rowcount or 0)


# --------------------------------------------------------------------------
# Activity ("You" profile tabs)
# --------------------------------------------------------------------------


async def list_my_posts(
    db: AsyncSession, *, account: AnonIdentity, limit: int = 30, offset: int = 0
) -> list[Journey]:
    """Posts authored by this account, newest first.

    Hidden and removed posts are excluded. A moderated post staying visible only
    to its author is a p6 decision (shadow limiting), not this phase's — and
    showing a removed post here with no explanation would be worse than omitting
    it.

    Unpublished drafts **are** included, deliberately. This is the member's own
    profile, and a saved wait check that were invisible even to its owner would
    be unreachable — there would be nowhere to go to publish it. Each row carries
    ``is_published`` so the UI can mark it as private.
    """
    result = await db.execute(
        select(Journey)
        .where(Journey.identity_id == account.id, Journey.status == "active")
        .order_by(Journey.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def list_my_comments(
    db: AsyncSession, *, account: AnonIdentity, limit: int = 30, offset: int = 0
) -> list[dict]:
    """Replies written by this account, with enough of their post to be findable.

    A comment on its own is unreadable out of context — "yes, mine took about
    that long too" means nothing without knowing what it answered — so each row
    carries the parent post's id and title.
    """
    result = await db.execute(
        select(JourneyComment, Journey)
        .join(Journey, Journey.id == JourneyComment.journey_id)
        .where(
            JourneyComment.identity_id == account.id,
            JourneyComment.status == "active",
            Journey.status == "active",
            Journey.is_published.is_(True),
        )
        .order_by(JourneyComment.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return [
        {
            "id": comment.id,
            "journey_id": journey.id,
            "journey_title": _truncate(journey.title or journey.note, 120),
            "journey_post_type": journey.post_type,
            "parent_comment_id": comment.parent_comment_id,
            "body": comment.body,
            "upvotes": comment.upvotes or 0,
            "created_at": comment.created_at,
        }
        for comment, journey in result.all()
    ]


# --------------------------------------------------------------------------
# Email — opt-in, batched, and deliberately uninformative
# --------------------------------------------------------------------------


async def _already_mailed_today(
    db: AsyncSession, *, recipient_id: UUID, journey_id: UUID
) -> bool:
    """Has this member already had an email about this thread today?

    The batching rule, expressed as a query rather than a scheduler: one send per
    (recipient, thread, UTC day). Same day boundary as the rate counters, so
    there is one notion of "a day" in the product rather than two.

    Two simultaneous replies could both read "no" and both send. Left as-is: the
    failure mode is one duplicate email, and the alternative — locking a row on
    the reply path — costs every reply a write to make a rare duplicate rarer.
    """
    since = tiers.day_window_start()
    found = await db.scalar(
        select(CommunityNotification.id)
        .where(
            CommunityNotification.recipient_identity_id == recipient_id,
            CommunityNotification.journey_id == journey_id,
            CommunityNotification.email_sent_at.isnot(None),
            CommunityNotification.email_sent_at >= since,
        )
        .limit(1)
    )
    return found is not None


async def send_reply_notification_email(*, to: str) -> None:
    """The reply email. Says that something happened, never what.

    No subclass, no question title, no reply text, in the subject, the preheader
    or the body — see rule 1 in this module's docstring. The member opens the
    room to find out what it was, which costs a click and removes an entire
    category of harm.

    Imported through the module (not ``from … import send_generic``) so tests can
    monkeypatch ``app.integrations.resend.templates`` and capture instead of
    send — the pattern in ``tests/e2e_portal_flow.py``.
    """
    from app.integrations.resend import templates as email_templates

    settings = get_settings()
    link = f"{settings.frontend_url.rstrip('/')}/inbox"
    await email_templates.send_generic(
        to=to,
        subject="You have a new reply on immi360",
        eyebrow_text="immi360",
        headline="Someone replied to you",
        body_html=(
            "<p>There's a new reply waiting for you in the room.</p>"
            "<p>We keep these emails deliberately vague — open immi360 to read it.</p>"
        ),
        cta_label="Open your inbox",
        cta_url=link,
        preheader="There's a new reply waiting for you.",
    )


async def deliver_reply_emails(db: AsyncSession, *, comment_id: UUID) -> int:
    """Best-effort email for the notifications a reply just created.

    Called by the router **after** the comment is committed, so an email never
    describes a reply that then failed to save. Every failure mode — no address,
    preference off, Resend unconfigured, Resend down — degrades to "the inbox
    still has it", which is the whole reason the inbox is the primary channel.

    Returns how many emails were actually sent.
    """
    rows = (
        await db.execute(
            select(CommunityNotification, AnonIdentity)
            .join(
                AnonIdentity,
                AnonIdentity.id == CommunityNotification.recipient_identity_id,
            )
            .where(
                CommunityNotification.comment_id == comment_id,
                CommunityNotification.status == "active",
                CommunityNotification.email_sent_at.is_(None),
            )
        )
    ).all()
    if not rows:
        return 0

    settings = get_settings()
    sent = 0
    for notification, recipient in rows:
        if not recipient.email or not recipient.notify_replies_email:
            continue
        if not settings.resend_configured:
            # Not an error: local and CI runs have no Resend key, and the inbox
            # entry — the thing that matters — was already written.
            continue
        if await _already_mailed_today(
            db,
            recipient_id=notification.recipient_identity_id,
            journey_id=notification.journey_id,
        ):
            continue

        try:
            await send_reply_notification_email(to=recipient.email)
        except Exception:  # never let a mail failure surface on the reply path
            logger.exception("Community reply notification failed to send")
            continue

        notification.email_sent_at = datetime.now(timezone.utc)
        sent += 1

    if sent:
        await db.commit()
    return sent
