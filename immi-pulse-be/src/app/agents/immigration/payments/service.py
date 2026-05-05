"""Payments service — manual ledger + receipts + skip override.

Stripe is not wired in v1. Auto-confirm path will route through the same
record_payment() function once the Stripe webhook lands.
"""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.checkpoints.models import Checkpoint
from app.agents.immigration.payments.models import OrgReceiptCounter, PaymentRecord
from app.agents.immigration.precases.models import PreCase

logger = logging.getLogger(__name__)


async def _next_receipt_number(db: AsyncSession, org_id: UUID) -> str:
    """Atomic-ish increment of the per-org sequential counter."""
    counter = (
        await db.execute(select(OrgReceiptCounter).where(OrgReceiptCounter.org_id == org_id))
    ).scalar_one_or_none()
    if not counter:
        counter = OrgReceiptCounter(org_id=org_id, next_number=1)
        db.add(counter)
        await db.flush()
    n = counter.next_number
    counter.next_number = n + 1
    return f"R-{n:05d}"


async def list_payments(
    db: AsyncSession,
    org_id: UUID,
    pre_case_id: Optional[UUID] = None,
    case_id: Optional[UUID] = None,
    checkpoint_id: Optional[UUID] = None,
) -> list[dict]:
    stmt = select(PaymentRecord).where(PaymentRecord.org_id == org_id)
    if pre_case_id:
        stmt = stmt.where(PaymentRecord.pre_case_id == pre_case_id)
    if case_id:
        stmt = stmt.where(PaymentRecord.case_id == case_id)
    if checkpoint_id:
        stmt = stmt.where(PaymentRecord.checkpoint_id == checkpoint_id)
    stmt = stmt.order_by(desc(PaymentRecord.created_at))
    rows = (await db.execute(stmt)).scalars().all()
    return [_payment_to_dict(p) for p in rows]


async def record_payment(
    db: AsyncSession,
    org_id: UUID,
    seat_id: UUID,
    payload: dict,
) -> dict:
    """Record a payment received. Auto-promotes pre-case to case if linked + retainer."""
    if not (payload.get("checkpoint_id") or payload.get("pre_case_id") or payload.get("case_id")):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "At least one of checkpoint_id, pre_case_id, or case_id is required",
        )

    # Validate references belong to this org
    checkpoint = None
    if payload.get("checkpoint_id"):
        checkpoint = (
            await db.execute(
                select(Checkpoint).where(
                    Checkpoint.id == payload["checkpoint_id"],
                    Checkpoint.org_id == org_id,
                )
            )
        ).scalar_one_or_none()
        if not checkpoint:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Checkpoint not found")

    pre_case_id = payload.get("pre_case_id") or (checkpoint.pre_case_id if checkpoint else None)
    case_id = payload.get("case_id") or (checkpoint.case_id if checkpoint else None)

    receipt_number = await _next_receipt_number(db, org_id)

    record = PaymentRecord(
        org_id=org_id,
        checkpoint_id=payload.get("checkpoint_id"),
        pre_case_id=pre_case_id,
        case_id=case_id,
        method=payload["method"],
        amount_aud=Decimal(str(payload["amount_aud"])),
        reference=payload.get("reference"),
        received_at=_to_datetime(payload["received_at"]),
        notes=payload.get("notes"),
        receipt_number=receipt_number,
        recorded_by_seat_id=seat_id,
    )
    db.add(record)

    # Mark checkpoint paid if linked
    if checkpoint:
        checkpoint.status = "paid"
        checkpoint.paid_at = datetime.now(timezone.utc)

    # If linked to a pre-case, advance lifecycle (paid → converted via service in precases)
    if pre_case_id:
        pc = (
            await db.execute(select(PreCase).where(PreCase.id == pre_case_id, PreCase.org_id == org_id))
        ).scalar_one_or_none()
        if pc and pc.status not in ("converted", "archived"):
            pc.status = "paid"
            pc.paid_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(record)
    return _payment_to_dict(record)


async def skip_payment(
    db: AsyncSession,
    org_id: UUID,
    seat_id: UUID,
    pre_case_id: UUID,
    reason: str,
) -> dict:
    """Manual override: mark payment as waived ($0) for this pre-case.

    Records a 'waived' PaymentRecord to keep the audit trail honest.
    """
    pc = (
        await db.execute(select(PreCase).where(PreCase.id == pre_case_id, PreCase.org_id == org_id))
    ).scalar_one_or_none()
    if not pc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pre-case not found")
    if pc.status in ("converted", "archived"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Pre-case already {pc.status}")

    receipt_number = await _next_receipt_number(db, org_id)
    record = PaymentRecord(
        org_id=org_id,
        pre_case_id=pre_case_id,
        method="waived",
        amount_aud=Decimal("0"),
        reference=None,
        received_at=datetime.now(timezone.utc),
        notes=f"Payment waived: {reason}",
        receipt_number=receipt_number,
        recorded_by_seat_id=seat_id,
    )
    db.add(record)

    pc.status = "paid"  # advance lifecycle so consultant can convert next
    pc.paid_at = datetime.now(timezone.utc)
    pc.skipped_payment = reason

    await db.commit()
    await db.refresh(record)
    return {
        "payment_record_id": record.id,
        "pre_case_id": pre_case_id,
        "new_status": pc.status,
    }


def _to_datetime(v: Any) -> datetime:
    if isinstance(v, datetime):
        return v
    if isinstance(v, str):
        # Pydantic mode=json serialised datetime to ISO string
        s = v.replace("Z", "+00:00")
        return datetime.fromisoformat(s)
    raise ValueError(f"Cannot coerce to datetime: {v!r}")


def _payment_to_dict(p: PaymentRecord) -> dict:
    return {
        "id": p.id,
        "checkpoint_id": p.checkpoint_id,
        "pre_case_id": p.pre_case_id,
        "case_id": p.case_id,
        "method": p.method,
        "amount_aud": p.amount_aud,
        "reference": p.reference,
        "received_at": p.received_at,
        "notes": p.notes,
        "receipt_number": p.receipt_number,
        "created_at": p.created_at,
    }
