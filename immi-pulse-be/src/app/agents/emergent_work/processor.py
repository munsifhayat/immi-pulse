"""
Emergent Work processing pipeline: gather threads -> analyze -> detect -> report.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone

from app.agents.emergent_work.detector import detect_emergent_work
from app.agents.emergent_work.thread_analyzer import gather_recent_threads
from app.agents.shared.models import AgentActivityLog
from app.core.ai_gateway import AIGateway
from app.db.session import get_async_session

logger = logging.getLogger(__name__)


class EmergentWorkProcessor:
    """Orchestrates emergent work detection pipeline."""

    async def queue_email(self, message: dict, mailbox: str) -> dict:
        """Queue an email for next batch analysis. Currently a no-op — batch runs on schedule."""
        return {"status": "queued", "mailbox": mailbox}

    async def run_scheduled_scan(self, hours: int = 2) -> dict:
        """
        Scheduled scan: gather recent threads, analyze each, store results.
        Called by APScheduler every 2 hours.
        """
        logger.info(f"Emergent work scan starting (last {hours} hours)")

        threads = await gather_recent_threads(hours=hours)
        if not threads:
            logger.info("No multi-email threads found — skipping")
            return {"status": "no_threads"}

        logger.info(f"Analyzing {len(threads)} threads for emergent work")
        items_detected = 0

        async with get_async_session() as db:
            ai_gateway = AIGateway(db)

            for thread in threads:
                try:
                    analysis = await detect_emergent_work(
                        ai_gateway=ai_gateway,
                        thread_subject=thread["subject"],
                        emails=thread["emails"],
                        attachments=thread["attachments"],
                    )

                    if analysis.has_emergent_work and analysis.confidence >= 0.6:
                        await self._store_item(
                            db=db,
                            thread=thread,
                            analysis=analysis,
                        )
                        items_detected += 1

                except Exception as e:
                    logger.error(f"Analysis failed for thread '{thread['subject']}': {e}")

            # Generate report
            if items_detected > 0:
                await self._generate_report(db, hours, items_detected)

            await db.commit()

        logger.info(f"Emergent work scan complete: {items_detected} items detected")
        return {"status": "ok", "items_detected": items_detected}

    async def _store_item(self, db, thread: dict, analysis) -> None:
        from app.agents.emergent_work.models import EmergentWorkItem

        # Build supporting evidence from emergent items
        evidence = [
            {
                "description": item.description,
                "evidence": item.evidence,
                "impact": item.estimated_impact,
                "action": item.recommended_action,
            }
            for item in analysis.emergent_items
        ]

        # Primary recommended action
        primary_action = "monitor"
        if analysis.emergent_items:
            primary_action = analysis.emergent_items[0].recommended_action

        # Primary description
        description = ""
        if analysis.emergent_items:
            description = "; ".join(item.description for item in analysis.emergent_items)

        item = EmergentWorkItem(
            id=uuid.uuid4(),
            mailbox=thread["mailbox"],
            source_message_ids=thread["message_ids"],
            thread_id=thread["conversation_id"],
            subject=thread["subject"],
            original_scope_summary=analysis.original_scope_summary,
            emergent_work_description=description,
            supporting_evidence=evidence,
            confidence_score=analysis.confidence,
            ai_reasoning=analysis.reasoning,
            recommended_action=primary_action,
            processed_attachments=[
                {"name": a.get("name"), "type": a.get("type")}
                for a in thread["attachments"]
            ],
        )
        db.add(item)

        activity = AgentActivityLog(
            id=uuid.uuid4(),
            agent_name="emergent_work",
            action="detected",
            mailbox=thread["mailbox"],
            subject=thread["subject"],
            details={"items_count": len(analysis.emergent_items)},
            confidence_score=analysis.confidence,
        )
        db.add(activity)

    async def _generate_report(self, db, hours: int, items_count: int) -> None:
        from app.agents.emergent_work.models import EmergentWorkReport

        now = datetime.now(timezone.utc)
        report = EmergentWorkReport(
            id=uuid.uuid4(),
            report_time=now,
            period_start=now - timedelta(hours=hours),
            period_end=now,
            items_detected=items_count,
            summary_table=[],  # Populated by separate summary generation if needed
            summary_text=f"Emergent work scan detected {items_count} items in the last {hours} hours.",
        )
        db.add(report)
