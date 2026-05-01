"""Checkpoint service. Mock Stripe for MVP — manual mark-paid is fine."""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.checkpoints.models import Checkpoint
from app.agents.immigration.checkpoints.schemas import CheckpointCreate

logger = logging.getLogger(__name__)


async def list_checkpoints(
    db: AsyncSession, org_id: UUID, case_id: Optional[UUID] = None, pre_case_id: Optional[UUID] = None
) -> list[Checkpoint]:
    stmt = select(Checkpoint).where(Checkpoint.org_id == org_id)
    if case_id:
        stmt = stmt.where(Checkpoint.case_id == case_id)
    if pre_case_id:
        stmt = stmt.where(Checkpoint.pre_case_id == pre_case_id)
    stmt = stmt.order_by(Checkpoint.created_at.desc())
    return (await db.execute(stmt)).scalars().all()


async def create_checkpoint(
    db: AsyncSession, org_id: UUID, seat_id: UUID, payload: CheckpointCreate
) -> Checkpoint:
    if not payload.case_id and not payload.pre_case_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Provide case_id or pre_case_id")

    cp = Checkpoint(
        org_id=org_id,
        case_id=payload.case_id,
        pre_case_id=payload.pre_case_id,
        type=payload.type,
        title=payload.title,
        description=payload.description,
        amount_aud=payload.amount_aud,
        blocking=payload.blocking,
        status="draft",
        created_by_seat_id=seat_id,
    )
    db.add(cp)
    await db.commit()
    await db.refresh(cp)
    return cp


async def send_checkpoint(db: AsyncSession, org_id: UUID, checkpoint_id: UUID) -> Checkpoint:
    cp = (
        await db.execute(
            select(Checkpoint).where(Checkpoint.id == checkpoint_id, Checkpoint.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not cp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Checkpoint not found")
    if cp.status not in ("draft", "sent"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot send a {cp.status} checkpoint")

    # MVP: generate a fake payment link. Phase 2: real Stripe Connect Checkout.
    fake_token = uuid4().hex
    cp.payment_link_url = f"https://mock-stripe.local/pay/{fake_token}"
    cp.stripe_session_id = f"cs_mock_{fake_token}"
    cp.status = "sent"
    cp.sent_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(cp)
    return cp


async def mark_paid(db: AsyncSession, org_id: UUID, checkpoint_id: UUID) -> Checkpoint:
    cp = (
        await db.execute(
            select(Checkpoint).where(Checkpoint.id == checkpoint_id, Checkpoint.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not cp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Checkpoint not found")
    cp.status = "paid"
    cp.paid_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(cp)
    return cp


async def cancel_checkpoint(db: AsyncSession, org_id: UUID, checkpoint_id: UUID) -> None:
    cp = (
        await db.execute(
            select(Checkpoint).where(Checkpoint.id == checkpoint_id, Checkpoint.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not cp:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Checkpoint not found")
    cp.status = "canceled"
    await db.commit()
