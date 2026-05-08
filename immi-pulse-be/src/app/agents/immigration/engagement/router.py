"""Engagement letters router — templates, compose/send, mark-signed-manual + public sign portal."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.engagement import service as engagement_service
from app.agents.immigration.engagement.schemas import (
    LetterOut,
    MarkSignedManuallyRequest,
    PublicLetterView,
    PublicSignRequest,
    PublicSignResponse,
    ResendReminderResponse,
    SendLetterRequest,
    SendLetterResponse,
    TemplateCreate,
    TemplateOut,
    TemplatePatch,
)
from app.core.jwt_auth import CurrentContext, get_current_context
from app.db.session import get_db

logger = logging.getLogger(__name__)

# Authenticated router (consultant-side)
router = APIRouter(prefix="/engagement-letters", tags=["Engagement Letters"])

# Public router (client signing portal — no auth, PIN-protected)
public_router = APIRouter(prefix="/public/letters", tags=["Engagement Letters (public)"])


# ── Templates ───────────────────────────────────────────────────────────────

@router.get("/templates", response_model=list[TemplateOut])
async def list_templates(
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await engagement_service.list_templates(db, ctx.org_id)


@router.get("/templates/default", response_model=TemplateOut)
async def get_default_template(
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    t = await engagement_service.get_or_create_default_template(db, ctx.org_id)
    return engagement_service._template_to_dict(t)


@router.post("/templates", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    payload: TemplateCreate,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await engagement_service.create_template(
        db, ctx.org_id, payload.model_dump(), ctx.seat_id
    )


@router.patch("/templates/{template_id}", response_model=TemplateOut)
async def patch_template(
    template_id: UUID,
    payload: TemplatePatch,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await engagement_service.patch_template(
        db, ctx.org_id, template_id, payload.model_dump(exclude_unset=True)
    )


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    await engagement_service.delete_template(db, ctx.org_id, template_id)
    return None


# ── Letters (per-precase) ───────────────────────────────────────────────────

@router.get("/by-precase/{pre_case_id}", response_model=Optional[LetterOut])
async def get_letter_for_precase(
    pre_case_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await engagement_service.get_letter_for_pre_case(db, ctx.org_id, pre_case_id)


@router.post("/by-precase/{pre_case_id}/send", response_model=SendLetterResponse)
async def compose_and_send(
    pre_case_id: UUID,
    payload: SendLetterRequest,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Compose + send the engagement letter. Returns sign URL + 6-digit PIN ONCE."""
    return await engagement_service.compose_and_send(
        db, ctx.org_id, pre_case_id, ctx.seat_id, payload.model_dump(mode="json")
    )


@router.post(
    "/by-precase/{pre_case_id}/mark-signed-manually",
    response_model=LetterOut,
)
async def mark_signed_manually(
    pre_case_id: UUID,
    payload: MarkSignedManuallyRequest,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Manual override — consultant attests the letter was signed offline."""
    return await engagement_service.mark_signed_manually(
        db, ctx.org_id, pre_case_id, ctx.seat_id, payload.model_dump()
    )


@router.post("/{letter_id}/resend-reminder", response_model=ResendReminderResponse)
async def resend_reminder(
    letter_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Re-email the signing link to the applicant (PIN is not re-shared)."""
    return await engagement_service.resend_reminder(db, ctx.org_id, letter_id)


@router.post("/{letter_id}/void", status_code=status.HTTP_204_NO_CONTENT)
async def void_letter(
    letter_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    await engagement_service.void_letter(db, ctx.org_id, letter_id)
    return None


# ── Public signing portal (no auth, PIN-protected) ──────────────────────────

@public_router.get("/{sign_token}", response_model=PublicLetterView)
async def public_view_letter(
    sign_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Client lands here from email link. Doesn't require PIN to VIEW."""
    return await engagement_service.public_get_letter(db, sign_token)


@public_router.post("/{sign_token}/sign", response_model=PublicSignResponse)
async def public_sign_letter(
    sign_token: str,
    payload: PublicSignRequest,
    request: Request,
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
    db: AsyncSession = Depends(get_db),
):
    """Client signs (typed name or drawn). Requires PIN."""
    ip = request.client.host if request.client else None
    return await engagement_service.public_sign_letter(
        db, sign_token, payload.model_dump(), ip_address=ip, user_agent=user_agent
    )
