"""P1 Classifier API endpoints."""

import logging
from datetime import date, datetime, time, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.p1_classifier.models import DailySummary, P1Job
from app.agents.p1_classifier.schemas import DailySummaryOut, P1JobOut, P1StatsOut, P1StatusUpdate
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents/p1", tags=["P1 Classifier"])


@router.get("/jobs", response_model=list[P1JobOut])
async def list_jobs(
    priority: Optional[str] = None,
    status: Optional[str] = None,
    mailbox: Optional[str] = None,
    is_overdue: Optional[bool] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(P1Job).order_by(P1Job.received_at.desc())
    if mailbox:
        query = query.where(P1Job.mailbox == mailbox)
    if priority:
        query = query.where(P1Job.priority == priority)
    if status:
        query = query.where(P1Job.status == status)
    if is_overdue is not None:
        query = query.where(P1Job.is_overdue == is_overdue)
    if from_date:
        query = query.where(P1Job.received_at >= datetime.combine(from_date, time.min).replace(tzinfo=timezone.utc))
    if to_date:
        query = query.where(P1Job.received_at <= datetime.combine(to_date, time.max).replace(tzinfo=timezone.utc))
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/jobs/{job_id}", response_model=P1JobOut)
async def get_job(job_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(P1Job).where(P1Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.put("/jobs/{job_id}/status")
async def update_job_status(
    job_id: UUID,
    body: P1StatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(P1Job).where(P1Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = body.status
    if body.status == "responded" and not job.first_response_at:
        job.first_response_at = datetime.now(timezone.utc)
        job.is_responded = True
    await db.commit()
    return {"status": "ok", "new_status": body.status}


@router.get("/summary/today", response_model=Optional[DailySummaryOut])
async def get_today_summary(db: AsyncSession = Depends(get_db)):
    today = date.today()
    result = await db.execute(
        select(DailySummary)
        .where(DailySummary.summary_date == today, DailySummary.summary_type == "p1_daily")
        .order_by(DailySummary.created_at.desc())
        .limit(1)
    )
    summary = result.scalar_one_or_none()
    return summary


@router.get("/summary/{summary_date}", response_model=Optional[DailySummaryOut])
async def get_summary_by_date(summary_date: date, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DailySummary)
        .where(DailySummary.summary_date == summary_date, DailySummary.summary_type == "p1_daily")
        .order_by(DailySummary.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/summaries", response_model=list[DailySummaryOut])
async def list_summaries(
    limit: int = Query(30, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DailySummary)
        .where(DailySummary.summary_type == "p1_daily")
        .order_by(DailySummary.summary_date.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/stats", response_model=P1StatsOut)
async def get_stats(
    mailbox: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    base = select(func.count()).select_from(P1Job)
    if mailbox:
        base = base.where(P1Job.mailbox == mailbox)
    total_p1 = await db.scalar(
        base.where(P1Job.is_urgent.is_(True))
    )
    responded_in_sla = await db.scalar(
        base.where(
            P1Job.is_urgent.is_(True),
            P1Job.is_responded.is_(True),
            P1Job.is_overdue.is_(False),
        )
    )
    overdue = await db.scalar(
        base.where(P1Job.is_overdue.is_(True))
    )

    # Average response time in minutes for responded P1 jobs
    avg_response = None
    resp_query = select(P1Job).where(
        P1Job.is_urgent.is_(True),
        P1Job.first_response_at.isnot(None),
    )
    if mailbox:
        resp_query = resp_query.where(P1Job.mailbox == mailbox)
    responded_jobs = await db.execute(resp_query)
    responded_list = responded_jobs.scalars().all()
    if responded_list:
        total_minutes = sum(
            (j.first_response_at - j.received_at).total_seconds() / 60
            for j in responded_list
            if j.received_at and j.first_response_at
        )
        avg_response = total_minutes / len(responded_list)

    # By client
    client_q = await db.execute(
        select(P1Job.client_name, func.count())
        .where(P1Job.is_urgent.is_(True), P1Job.client_name.isnot(None))
        .group_by(P1Job.client_name)
    )
    by_client = {row[0]: row[1] for row in client_q.all()}

    return P1StatsOut(
        total_p1=total_p1 or 0,
        responded_in_sla=responded_in_sla or 0,
        overdue=overdue or 0,
        avg_response_time_minutes=avg_response,
        by_client=by_client,
    )
