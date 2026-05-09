"""PreCase router — inbox + pre-cases tab + lifecycle transitions + manual overrides."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.precases import service as pc_service
from app.agents.immigration.precases.schemas import (
    ForceConvertRequest,
    PreCaseDetail,
    PreCaseListResponse,
    PromoteResponse,
    QualifyRequest,
    TransitionRequest,
)
from app.agents.immigration.precases.triage import run_triage_async
from app.core.jwt_auth import CurrentContext, get_current_context
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/precases", tags=["Pre-Cases"])


@router.get("", response_model=PreCaseListResponse)
async def list_precases(
    status_filter: Optional[str] = Query(None, alias="status"),
    group: Optional[str] = Query(None, description="inbox | precase | terminal"),
    q: Optional[str] = Query(None, description="Search by client name, email, questionnaire, or AI summary"),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """List pre-cases (paginated). Use `group=inbox` for the Inbox page (queries),
    `group=precase` for the Pre-cases page (qualified+).
    """
    return await pc_service.list_precases(
        db, ctx.org_id, status_filter, group, q=q, limit=limit, offset=offset
    )


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


@router.post("/{precase_id}/qualify", response_model=PreCaseDetail)
async def qualify_precase(
    precase_id: UUID,
    payload: QualifyRequest,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Move from inbox (query) to pre-cases (qualified)."""
    return await pc_service.qualify_precase(db, ctx.org_id, precase_id, payload.note)


@router.post("/{precase_id}/transition", response_model=PreCaseDetail)
async def transition_precase(
    precase_id: UUID,
    payload: TransitionRequest,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Move a pre-case backwards (or idempotently) to an earlier stage.

    Powers the clickable stage stepper. Forward progression past `qualified`
    must still go through the dedicated endpoints (send letter, mark signed,
    record payment, promote) since they create real artifacts.
    """
    return await pc_service.transition_precase(
        db, ctx.org_id, precase_id, payload.target_status
    )


@router.post("/{precase_id}/promote", response_model=PromoteResponse)
async def promote_precase(
    precase_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Standard convert-to-case (after letter signed + payment received)."""
    case_id = await pc_service.promote_to_case(db, ctx.org_id, precase_id, ctx.seat_id)
    return PromoteResponse(case_id=case_id)


@router.post("/{precase_id}/force-convert", response_model=PromoteResponse)
async def force_convert(
    precase_id: UUID,
    payload: ForceConvertRequest,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Manual override — force-convert pre-case to case, skipping any remaining gates.

    Use cases: relative case (no payment), client signed paper engagement,
    work already done outside the platform.
    """
    case_id = await pc_service.force_convert(
        db, ctx.org_id, precase_id, ctx.seat_id, payload.model_dump()
    )
    return PromoteResponse(case_id=case_id)


@router.post("/{precase_id}/retrigger-ai", status_code=status.HTTP_202_ACCEPTED)
async def retrigger_ai(
    precase_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
):
    run_triage_async(precase_id)
    return {"status": "scheduled"}
