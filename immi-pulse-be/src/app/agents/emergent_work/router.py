"""Emergent Work API endpoints."""

import logging
from datetime import date, datetime, time, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.emergent_work.models import EmergentWorkItem, EmergentWorkReport
from app.agents.emergent_work.schemas import (
    EmergentWorkItemOut,
    EmergentWorkReportOut,
    EmergentWorkStatsOut,
    EmergentWorkStatusUpdate,
)
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents/emergent-work", tags=["Emergent Work"])


@router.get("/items", response_model=list[EmergentWorkItemOut])
async def list_items(
    client: Optional[str] = None,
    mailbox: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(EmergentWorkItem).order_by(EmergentWorkItem.created_at.desc())
    if mailbox:
        query = query.where(EmergentWorkItem.mailbox == mailbox)
    if client:
        query = query.where(EmergentWorkItem.client_name == client)
    if status:
        query = query.where(EmergentWorkItem.status == status)
    if from_date:
        query = query.where(EmergentWorkItem.created_at >= datetime.combine(from_date, time.min).replace(tzinfo=timezone.utc))
    if to_date:
        query = query.where(EmergentWorkItem.created_at <= datetime.combine(to_date, time.max).replace(tzinfo=timezone.utc))
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/items/{item_id}", response_model=EmergentWorkItemOut)
async def get_item(item_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmergentWorkItem).where(EmergentWorkItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.put("/items/{item_id}/status")
async def update_item_status(
    item_id: UUID,
    body: EmergentWorkStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergentWorkItem).where(EmergentWorkItem.id == item_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.status = body.status
    now = datetime.now(timezone.utc)
    if body.status == "raised":
        item.raised_at = now
    elif body.status == "resolved":
        item.resolved_at = now
    await db.commit()
    return {"status": "ok", "new_status": body.status}


@router.get("/reports", response_model=list[EmergentWorkReportOut])
async def list_reports(
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergentWorkReport)
        .order_by(EmergentWorkReport.report_time.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/reports/latest", response_model=Optional[EmergentWorkReportOut])
async def get_latest_report(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmergentWorkReport)
        .order_by(EmergentWorkReport.report_time.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/stats", response_model=EmergentWorkStatsOut)
async def get_stats(
    mailbox: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    base = select(func.count()).select_from(EmergentWorkItem)
    if mailbox:
        base = base.where(EmergentWorkItem.mailbox == mailbox)
    total = await db.scalar(base)
    raised = await db.scalar(
        base.where(EmergentWorkItem.status == "raised")
    )
    resolved = await db.scalar(
        base.where(EmergentWorkItem.status == "resolved")
    )
    dismissed = await db.scalar(
        base.where(EmergentWorkItem.status == "dismissed")
    )

    client_q = await db.execute(
        select(EmergentWorkItem.client_name, func.count())
        .where(EmergentWorkItem.client_name.isnot(None))
        .group_by(EmergentWorkItem.client_name)
    )
    by_client = {row[0]: row[1] for row in client_q.all()}

    return EmergentWorkStatsOut(
        total_detected=total or 0,
        raised=raised or 0,
        resolved=resolved or 0,
        dismissed=dismissed or 0,
        by_client=by_client,
    )
