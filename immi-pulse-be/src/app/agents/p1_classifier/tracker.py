"""
SLA Tracker — monitors P1 response times and marks overdue jobs.
Runs every 15 minutes via scheduler.
"""

import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.agents.p1_classifier.models import P1Job
from app.db.session import get_async_session
from app.integrations.microsoft.graph_client import get_graph_client

logger = logging.getLogger(__name__)


async def check_sla_compliance():
    """
    Check all open P1 jobs for SLA compliance:
    - Mark overdue if past response deadline
    - Check mailbox for thread replies
    """
    async with get_async_session() as db:
        result = await db.execute(
            select(P1Job).where(
                P1Job.is_urgent.is_(True),
                P1Job.is_responded.is_(False),
                P1Job.status == "open",
            )
        )
        jobs = result.scalars().all()

        if not jobs:
            return

        logger.info(f"SLA Tracker: Checking {len(jobs)} open P1 jobs")
        now = datetime.now(timezone.utc)
        graph = get_graph_client()

        for job in jobs:
            # Check if overdue
            if job.response_deadline and now > job.response_deadline:
                if not job.is_overdue:
                    job.is_overdue = True
                    logger.warning(f"P1 job overdue: {job.subject} (deadline: {job.response_deadline})")

            # Check for thread replies
            if job.thread_id and job.mailbox:
                try:
                    thread_messages = await graph.get_conversation_thread(
                        job.mailbox, job.thread_id
                    )
                    # If there are replies after the original email
                    if len(thread_messages) > 1:
                        # Find earliest reply after the job was received
                        for msg in thread_messages[1:]:
                            reply_time_str = msg.get("receivedDateTime")
                            if reply_time_str:
                                try:
                                    reply_time = datetime.fromisoformat(
                                        reply_time_str.replace("Z", "+00:00")
                                    )
                                    if reply_time > job.received_at:
                                        job.is_responded = True
                                        job.first_response_at = reply_time
                                        job.status = "responded"
                                        logger.info(
                                            f"P1 job responded: {job.subject} at {reply_time}"
                                        )
                                        break
                                except (ValueError, TypeError):
                                    pass
                except Exception as e:
                    logger.error(f"Failed to check thread for {job.subject}: {e}")

        await db.commit()
        logger.info("SLA Tracker: Check complete")
