"""Checkpoint router — list, create, send (mock), mark paid, cancel."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.checkpoints import service as cp_service
from app.agents.immigration.checkpoints.schemas import CheckpointCreate, CheckpointOut
from app.core.jwt_auth import CurrentContext, get_current_context
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/checkpoints", tags=["Checkpoints"])


@router.get("", response_model=list[CheckpointOut])
async def list_checkpoints(
    case_id: Optional[UUID] = Query(None),
    pre_case_id: Optional[UUID] = Query(None),
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await cp_service.list_checkpoints(db, ctx.org_id, case_id, pre_case_id)


@router.post("", response_model=CheckpointOut, status_code=status.HTTP_201_CREATED)
async def create_checkpoint(
    payload: CheckpointCreate,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await cp_service.create_checkpoint(db, ctx.org_id, ctx.seat_id, payload)


@router.post("/{checkpoint_id}/send", response_model=CheckpointOut)
async def send_checkpoint(
    checkpoint_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await cp_service.send_checkpoint(db, ctx.org_id, checkpoint_id)


@router.post("/{checkpoint_id}/mark-paid", response_model=CheckpointOut)
async def mark_paid(
    checkpoint_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await cp_service.mark_paid(db, ctx.org_id, checkpoint_id)


@router.post("/{checkpoint_id}/cancel", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_checkpoint(
    checkpoint_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    await cp_service.cancel_checkpoint(db, ctx.org_id, checkpoint_id)
    return None
