"""
P1 processing pipeline: classify -> track SLA -> store.
"""

import logging
import time
import uuid
from datetime import datetime, timedelta, timezone

from app.agents.p1_classifier.classifier import classify_priority
from app.agents.shared.email_parser import parse_graph_message
from app.agents.shared.models import AgentActivityLog
from app.core.ai_gateway import AIGateway
from app.db.session import get_async_session

logger = logging.getLogger(__name__)


class P1Processor:
    """Orchestrates P1 classification pipeline."""

    async def process(self, message: dict, mailbox: str) -> dict:
        start_time = time.time()
        parsed = parse_graph_message(message)

        async with get_async_session() as db:
            ai_gateway = AIGateway(db)
            classification = await classify_priority(
                ai_gateway=ai_gateway,
                from_email=parsed.from_email,
                subject=parsed.subject,
                body_snippet=parsed.body_preview,
            )

        # Set SLA deadline for P1
        response_deadline = None
        if classification.is_urgent and parsed.received_at:
            response_deadline = parsed.received_at + timedelta(hours=1)

        processing_time_ms = int((time.time() - start_time) * 1000)
        await self._store_job(
            parsed=parsed,
            mailbox=mailbox,
            classification=classification,
            response_deadline=response_deadline,
            processing_time_ms=processing_time_ms,
        )

        return {
            "status": "ok",
            "priority": classification.priority,
            "is_urgent": classification.is_urgent,
            "confidence": classification.confidence,
        }

    async def _store_job(
        self, parsed, mailbox, classification, response_deadline, processing_time_ms
    ) -> None:
        from app.agents.p1_classifier.models import P1Job

        async with get_async_session() as db:
            job = P1Job(
                id=uuid.uuid4(),
                mailbox=mailbox,
                message_id=parsed.message_id,
                thread_id=parsed.conversation_id,
                from_email=parsed.from_email,
                from_name=parsed.from_name,
                subject=parsed.subject,
                received_at=parsed.received_at or datetime.now(timezone.utc),
                priority=classification.priority,
                is_urgent=classification.is_urgent,
                confidence_score=classification.confidence,
                ai_reasoning=classification.reasoning,
                category=classification.category,
                client_name=classification.client_name,
                contract_location=classification.contract_location,
                job_description=classification.job_description,
                ai_summary=classification.summary,
                response_deadline=response_deadline,
            )
            db.add(job)

            activity = AgentActivityLog(
                id=uuid.uuid4(),
                agent_name="p1_classifier",
                action="classified",
                mailbox=mailbox,
                message_id=parsed.message_id,
                subject=parsed.subject,
                details={
                    "priority": classification.priority,
                    "category": classification.category,
                    "client_name": classification.client_name,
                },
                confidence_score=classification.confidence,
                processing_time_ms=processing_time_ms,
            )
            db.add(activity)
            await db.commit()
