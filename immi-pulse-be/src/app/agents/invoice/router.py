"""Invoice agent API endpoints."""

import logging
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.invoice.models import InvoiceDetection
from app.agents.invoice.schemas import InvoiceDetectionOut, InvoiceReviewRequest, InvoiceStatsOut
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents/invoice", tags=["Invoice Agent"])


@router.get("/detections", response_model=list[InvoiceDetectionOut])
async def list_detections(
    mailbox: Optional[str] = None,
    is_invoice: Optional[bool] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(InvoiceDetection).order_by(InvoiceDetection.received_at.desc())
    if mailbox:
        query = query.where(InvoiceDetection.mailbox == mailbox)
    if is_invoice is not None:
        query = query.where(InvoiceDetection.is_invoice == is_invoice)
    if from_date:
        query = query.where(InvoiceDetection.received_at >= datetime.combine(from_date, datetime.min.time()))
    if to_date:
        query = query.where(InvoiceDetection.received_at <= datetime.combine(to_date, datetime.max.time()))
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/detections/{detection_id}", response_model=InvoiceDetectionOut)
async def get_detection(detection_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InvoiceDetection).where(InvoiceDetection.id == detection_id)
    )
    detection = result.scalar_one_or_none()
    if not detection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Detection not found")
    return detection


@router.post("/detections/{detection_id}/review")
async def review_detection(
    detection_id: UUID,
    body: InvoiceReviewRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(InvoiceDetection).where(InvoiceDetection.id == detection_id)
    )
    detection = result.scalar_one_or_none()
    if not detection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Detection not found")

    detection.manually_reviewed = True
    detection.review_action = body.action
    detection.reviewed_at = datetime.utcnow()
    await db.commit()
    return {"status": "ok", "review_action": body.action}


@router.get("/stats", response_model=InvoiceStatsOut)
async def get_stats(
    mailbox: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    base = select(func.count()).select_from(InvoiceDetection)
    if mailbox:
        base = base.where(InvoiceDetection.mailbox == mailbox)
    total = await db.scalar(base)
    invoices = await db.scalar(
        base.where(InvoiceDetection.is_invoice.is_(True))
    )
    moved = await db.scalar(
        base.where(InvoiceDetection.action == "moved")
    )
    flagged = await db.scalar(
        base.where(InvoiceDetection.action == "flagged")
    )

    # Per-mailbox counts
    mailbox_q = await db.execute(
        select(InvoiceDetection.mailbox, func.count())
        .group_by(InvoiceDetection.mailbox)
    )
    by_mailbox = {row[0]: row[1] for row in mailbox_q.all()}

    return InvoiceStatsOut(
        total_processed=total or 0,
        invoices_detected=invoices or 0,
        moved=moved or 0,
        flagged=flagged or 0,
        by_mailbox=by_mailbox,
    )
