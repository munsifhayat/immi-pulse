"""Payments router — manual record, list, skip override."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.payments import service as payments_service
from app.agents.immigration.payments.schemas import (
    PaymentRecordOut,
    RecordPaymentRequest,
    SkipPaymentRequest,
    SkipPaymentResponse,
)
from app.core.jwt_auth import CurrentContext, get_current_context
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("", response_model=list[PaymentRecordOut])
async def list_payments(
    pre_case_id: Optional[UUID] = Query(None),
    case_id: Optional[UUID] = Query(None),
    checkpoint_id: Optional[UUID] = Query(None),
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await payments_service.list_payments(
        db, ctx.org_id, pre_case_id, case_id, checkpoint_id
    )


@router.post("", response_model=PaymentRecordOut, status_code=status.HTTP_201_CREATED)
async def record_payment(
    payload: RecordPaymentRequest,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Record a payment received (bank transfer, PayID, BPAY, cash, cheque, etc).

    If linked to a checkpoint with a pre-case, advances lifecycle to 'paid'.
    """
    return await payments_service.record_payment(
        db, ctx.org_id, ctx.seat_id, payload.model_dump(mode="json")
    )


@router.post("/skip", response_model=SkipPaymentResponse, status_code=status.HTTP_201_CREATED)
async def skip_payment(
    payload: SkipPaymentRequest,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Manual override: skip payment (e.g. relative case, pro-bono).

    Records a $0 'waived' PaymentRecord to keep the audit trail intact.
    """
    return await payments_service.skip_payment(
        db, ctx.org_id, ctx.seat_id, payload.pre_case_id, payload.reason
    )
