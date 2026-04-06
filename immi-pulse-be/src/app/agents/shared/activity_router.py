"""Activity log and metrics API endpoints."""

import logging
from datetime import date, datetime, time, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.shared.models import AgentActivityLog, AIUsageLog
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Activity"])


@router.get("/activity")
async def list_activity(
    agent: Optional[str] = None,
    mailbox: Optional[str] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
):
    query = select(AgentActivityLog).order_by(AgentActivityLog.created_at.desc())
    if agent:
        query = query.where(AgentActivityLog.agent_name == agent)
    if mailbox:
        query = query.where(AgentActivityLog.mailbox == mailbox)
    if from_date:
        query = query.where(
            AgentActivityLog.created_at >= datetime.combine(from_date, time.min).replace(tzinfo=timezone.utc)
        )
    query = query.limit(limit)
    result = await db.execute(query)
    rows = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "agent_name": r.agent_name,
            "action": r.action,
            "mailbox": r.mailbox,
            "message_id": r.message_id,
            "subject": r.subject,
            "confidence_score": r.confidence_score,
            "processing_time_ms": r.processing_time_ms,
            "status": r.status,
            "error_message": r.error_message,
            "details": r.details,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/metrics")
async def get_metrics(db: AsyncSession = Depends(get_db)):
    today_start = datetime.combine(date.today(), time.min).replace(tzinfo=timezone.utc)

    # Unique emails processed today (count distinct message_id)
    emails_today = await db.scalar(
        select(func.count(func.distinct(AgentActivityLog.message_id)))
        .where(AgentActivityLog.created_at >= today_start)
    )

    # Average processing time
    avg_time = await db.scalar(
        select(func.avg(AgentActivityLog.processing_time_ms))
        .where(AgentActivityLog.processing_time_ms.isnot(None))
    )

    # AI usage today
    ai_calls_today = await db.scalar(
        select(func.count())
        .select_from(AIUsageLog)
        .where(AIUsageLog.created_at >= today_start)
    )
    ai_cost_today = await db.scalar(
        select(func.sum(AIUsageLog.estimated_cost))
        .where(AIUsageLog.created_at >= today_start)
    )

    # Unique emails with errors today
    errors_today = await db.scalar(
        select(func.count(func.distinct(AgentActivityLog.message_id)))
        .where(
            AgentActivityLog.created_at >= today_start,
            AgentActivityLog.status == "error",
        )
    )

    return {
        "emails_processed_today": emails_today or 0,
        "avg_processing_time_ms": round(avg_time, 1) if avg_time else None,
        "ai_calls_today": ai_calls_today or 0,
        "ai_cost_today_usd": round(float(ai_cost_today), 4) if ai_cost_today else 0.0,
        "error_count_today": errors_today or 0,
        "error_rate": round((errors_today or 0) / max(emails_today or 1, 1) * 100, 1),
    }


@router.get("/agents/status")
async def get_agent_status(db: AsyncSession = Depends(get_db)):
    """Get the status and last activity time for each agent."""
    agents = ["invoice", "p1_classifier", "emergent_work"]
    result = {}
    for agent_name in agents:
        # Last activity
        last = await db.execute(
            select(AgentActivityLog)
            .where(AgentActivityLog.agent_name == agent_name)
            .order_by(AgentActivityLog.created_at.desc())
            .limit(1)
        )
        last_entry = last.scalar_one_or_none()

        # Total processed
        total = await db.scalar(
            select(func.count())
            .select_from(AgentActivityLog)
            .where(AgentActivityLog.agent_name == agent_name)
        )

        # Error count
        errors = await db.scalar(
            select(func.count())
            .select_from(AgentActivityLog)
            .where(
                AgentActivityLog.agent_name == agent_name,
                AgentActivityLog.status == "error",
            )
        )

        result[agent_name] = {
            "last_active": last_entry.created_at.isoformat() if last_entry else None,
            "last_status": last_entry.status if last_entry else None,
            "total_processed": total or 0,
            "error_count": errors or 0,
        }

    return result
