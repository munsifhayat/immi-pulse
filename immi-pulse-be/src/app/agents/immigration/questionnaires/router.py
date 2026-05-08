"""Questionnaire router — CRUD (auth) + public submit (no auth)."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.questionnaires import service as q_service
from app.agents.immigration.questionnaires.schemas import (
    PublicQuestionnaireOut,
    QuestionnaireCreate,
    QuestionnaireListItem,
    QuestionnaireOut,
    QuestionnaireUpdate,
    SubmitQuestionnaireRequest,
    SubmitQuestionnaireResponse,
)
from app.core.config import get_settings
from app.core.jwt_auth import CurrentContext, get_current_context
from app.db.session import get_db

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/questionnaires", tags=["Questionnaires"])
public_router = APIRouter(prefix="/public/q", tags=["Questionnaires"])


def _add_public_url(item: dict, slug: str) -> dict:
    settings = get_settings()
    item["public_url"] = f"{settings.frontend_url}/q/{slug}"
    return item


@router.get("", response_model=list[QuestionnaireListItem])
async def list_questionnaires(
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    rows = await q_service.list_questionnaires(db, ctx.org_id)
    return rows


@router.post("", response_model=QuestionnaireOut, status_code=status.HTTP_201_CREATED)
async def create_questionnaire(
    payload: QuestionnaireCreate,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    result = await q_service.create_questionnaire(db, ctx.org_id, ctx.seat_id, payload)
    return _add_public_url(result, result["slug"])


@router.get("/{q_id}", response_model=QuestionnaireOut)
async def get_questionnaire(
    q_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    result = await q_service.get_questionnaire(db, ctx.org_id, q_id)
    return _add_public_url(result, result["slug"])


@router.patch("/{q_id}", response_model=QuestionnaireOut)
async def update_questionnaire(
    q_id: UUID,
    payload: QuestionnaireUpdate,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    result = await q_service.update_questionnaire(db, ctx.org_id, q_id, payload)
    return _add_public_url(result, result["slug"])


@router.delete("/{q_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_questionnaire(
    q_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    await q_service.delete_questionnaire(db, ctx.org_id, q_id)
    return None


# --- Public submission (no JWT) ---


@public_router.get("/{slug}", response_model=PublicQuestionnaireOut)
async def get_public_questionnaire(slug: str, db: AsyncSession = Depends(get_db)):
    return await q_service.get_public_questionnaire(db, slug)


@public_router.post("/{slug}/submit", response_model=SubmitQuestionnaireResponse)
async def submit_public_questionnaire(
    slug: str,
    payload: SubmitQuestionnaireRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    return await q_service.submit_public_questionnaire(db, slug, payload, ip, ua)
