"""Newsletter router — fully public, no auth required.

Mounted under /api/v1/public/newsletter/* so the api-key middleware lets it through.
"""

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.newsletter import service
from app.agents.immigration.newsletter.schemas import (
    NewsletterSubscribeIn,
    NewsletterSubscribeOut,
)
from app.db.session import get_db

public_router = APIRouter(prefix="/public/newsletter", tags=["newsletter"])


@public_router.post(
    "/subscribe",
    response_model=NewsletterSubscribeOut,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe(
    payload: NewsletterSubscribeIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> NewsletterSubscribeOut:
    """Public endpoint for the marketing-site footer signup.

    Idempotent: re-submitting the same email returns the existing record with
    already_subscribed=true so the UI can show a friendly message.
    """
    user_agent = request.headers.get("user-agent")
    referrer = request.headers.get("referer")

    row, already = await service.subscribe(
        db,
        email=payload.email,
        source=payload.source or "public_footer",
        user_agent=user_agent,
        referrer=referrer,
    )

    return NewsletterSubscribeOut(
        id=row.id,
        email=row.email,
        created_at=row.created_at,
        already_subscribed=already,
    )
