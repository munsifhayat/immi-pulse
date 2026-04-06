"""
Daily P1 Summary Generator — runs at 4pm AEST.
Builds structured table and AI-generated narrative.
"""

import logging
import uuid
from datetime import date, datetime, time, timezone

from sqlalchemy import select

from app.agents.p1_classifier.models import DailySummary, P1Job
from app.core.ai_gateway import AIGateway
from app.db.session import get_async_session

logger = logging.getLogger(__name__)

SUMMARY_SYSTEM_PROMPT = """You are a summary generator for Property Pulse's P1 urgent job tracking.
Generate a concise daily summary of P1 urgent jobs.

Include:
- Total P1 jobs today
- How many were responded to within SLA (1 hour)
- How many are overdue
- Key callouts (any patterns, repeat clients, escalations)

Keep it professional, concise, and actionable. 2-3 paragraphs max."""


async def generate_daily_summary() -> dict:
    """Generate the 4pm daily P1 summary."""
    today = date.today()

    async with get_async_session() as db:
        # Get today's P1 jobs
        result = await db.execute(
            select(P1Job)
            .where(P1Job.is_urgent.is_(True))
            .where(P1Job.received_at >= datetime.combine(today, time.min).replace(tzinfo=timezone.utc))
            .order_by(P1Job.received_at.asc())
        )
        jobs = result.scalars().all()

        if not jobs:
            logger.info("No P1 jobs today — skipping summary")
            return {"status": "no_jobs"}

        # Build summary table
        table_data = []
        responded_count = 0
        overdue_count = 0

        for i, job in enumerate(jobs, 1):
            response_time = None
            if job.first_response_at and job.received_at:
                delta = job.first_response_at - job.received_at
                response_time = f"{int(delta.total_seconds() / 60)} min"

            if job.is_responded:
                responded_count += 1
            if job.is_overdue:
                overdue_count += 1

            table_data.append({
                "number": i,
                "client": job.client_name or "Unknown",
                "location": job.contract_location or "Unknown",
                "subject": job.subject[:80],
                "received": job.received_at.strftime("%H:%M") if job.received_at else "",
                "response_time": response_time or "Pending",
                "status": job.status,
            })

        # AI-generated narrative
        ai_gateway = AIGateway(db)
        table_text = "\n".join(
            f"- {r['client']} | {r['location']} | {r['subject']} | {r['received']} | {r['response_time']} | {r['status']}"
            for r in table_data
        )
        prompt = f"Today's P1 Jobs ({len(jobs)} total, {responded_count} responded, {overdue_count} overdue):\n\n{table_text}"

        ai_response = await ai_gateway.summarize(
            content=prompt,
            system_prompt=SUMMARY_SYSTEM_PROMPT,
            agent_name="p1_classifier",
        )

        summary_text = ai_response.message if ai_response.success else f"{len(jobs)} P1 jobs today. {responded_count} responded. {overdue_count} overdue."

        # Store summary
        summary = DailySummary(
            id=uuid.uuid4(),
            summary_date=today,
            summary_time=time(16, 0),
            summary_type="p1_daily",
            total_p1_jobs=len(jobs),
            responded_count=responded_count,
            overdue_count=overdue_count,
            summary_table=table_data,
            summary_text=summary_text,
            raw_data=[{
                "id": str(j.id),
                "subject": j.subject,
                "priority": j.priority,
                "status": j.status,
                "is_overdue": j.is_overdue,
            } for j in jobs],
        )
        db.add(summary)
        await db.commit()

        logger.info(f"P1 daily summary generated: {len(jobs)} jobs")
        return {
            "status": "ok",
            "total_jobs": len(jobs),
            "responded": responded_count,
            "overdue": overdue_count,
        }
