"""Newsletter service — store + visibly log every subscription."""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.newsletter.models import NewsletterSubscriber

logger = logging.getLogger(__name__)


async def subscribe(
    db: AsyncSession,
    *,
    email: str,
    source: str = "public_footer",
    user_agent: Optional[str] = None,
    referrer: Optional[str] = None,
) -> tuple[NewsletterSubscriber, bool]:
    """Idempotent subscribe. Returns (row, already_subscribed)."""
    normalized = email.strip().lower()

    existing = await db.scalar(
        select(NewsletterSubscriber).where(NewsletterSubscriber.email == normalized)
    )
    if existing is not None:
        logger.info("[newsletter] duplicate signup email=%s source=%s", normalized, source)
        return existing, True

    sub = NewsletterSubscriber(
        email=normalized,
        source=source,
        user_agent=user_agent,
        referrer=referrer,
    )
    db.add(sub)
    await db.commit()
    await db.refresh(sub)

    # Loud log so the team sees signups in Heroku logs without checking the DB.
    logger.warning(
        "[newsletter] NEW signup email=%s source=%s id=%s",
        sub.email, sub.source, sub.id,
    )
    return sub, False
