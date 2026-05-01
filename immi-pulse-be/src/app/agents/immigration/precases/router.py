"""PreCase router — inbox + detail + archive + promote + retrigger AI."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.precases import service as pc_service
from app.agents.immigration.precases.schemas import (
    PreCaseDetail,
    PreCaseListItem,
    PromoteResponse,
)
from app.agents.immigration.precases.triage import run_triage_async
from app.core.jwt_auth import CurrentContext, get_current_context
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/precases", tags=["Pre-Cases"])


@router.get("", response_model=list[PreCaseListItem])
async def list_precases(
    status_filter: str = Query(None, alias="status"),
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await pc_service.list_precases(db, ctx.org_id, status_filter)


@router.get("/{precase_id}", response_model=PreCaseDetail)
async def get_precase(
    precase_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await pc_service.get_precase_detail(db, ctx.org_id, precase_id)


@router.post("/{precase_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
async def archive_precase(
    precase_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    await pc_service.archive_precase(db, ctx.org_id, precase_id)
    return None


@router.post("/{precase_id}/promote", response_model=PromoteResponse)
async def promote_precase(
    precase_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    case_id = await pc_service.promote_to_case(db, ctx.org_id, precase_id, ctx.seat_id)
    return PromoteResponse(case_id=case_id)


@router.post("/{precase_id}/retrigger-ai", status_code=status.HTTP_202_ACCEPTED)
async def retrigger_ai(
    precase_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
):
    run_triage_async(precase_id)
    return {"status": "scheduled"}
