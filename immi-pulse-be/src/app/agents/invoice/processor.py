"""
Invoice processing pipeline: detect -> classify -> move -> log.
"""

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.agents.invoice.classifier import classify_invoice
from app.agents.shared.attachment_handler import AttachmentHandler
from app.agents.shared.email_parser import ParsedEmail, parse_graph_message
from app.core.ai_gateway import AIGateway
from app.core.config import get_settings
from app.db.session import get_async_session
from app.integrations.microsoft.graph_client import get_graph_client

logger = logging.getLogger(__name__)
settings = get_settings()

CONFIDENCE_THRESHOLD = 0.7


class InvoiceProcessor:
    """Orchestrates the full invoice detection pipeline."""

    def __init__(self):
        self.graph = get_graph_client()
        self.attachment_handler = AttachmentHandler()

    async def process(self, message: dict, mailbox: str) -> dict:
        """
        Full pipeline:
        1. Parse email
        2. List/process attachments
        3. AI classification
        4. Move if invoice with high confidence
        5. Log result
        """
        start_time = time.time()
        parsed = parse_graph_message(message)

        # Get attachments
        attachment_names = []
        attachment_text = None
        if parsed.has_attachments:
            processed = await self.attachment_handler.process_attachments(
                mailbox, parsed.message_id
            )
            attachment_names = [a["name"] for a in processed]
            # Combine extracted text for AI context
            texts = [a["extracted_text"] for a in processed if a.get("extracted_text")]
            if texts:
                attachment_text = "\n---\n".join(texts)

        # Classify
        async with get_async_session() as db:
            ai_gateway = AIGateway(db)
            classification = await classify_invoice(
                ai_gateway=ai_gateway,
                subject=parsed.subject,
                body_snippet=parsed.body_preview,
                attachment_names=attachment_names,
                attachment_text=attachment_text,
            )

        # Determine action
        action = "none"
        moved_to_folder = None
        moved_at = None
        error_message = None

        if classification.is_invoice and classification.confidence >= CONFIDENCE_THRESHOLD:
            # Move to Invoice Folder
            try:
                folder = await self.graph.get_folder_by_name(
                    settings.maintenance_inbox, settings.invoice_folder_name
                )
                if folder:
                    await self.graph.move_message(
                        mailbox, parsed.message_id, folder["id"]
                    )
                    action = "moved"
                    moved_to_folder = settings.invoice_folder_name
                    moved_at = datetime.now(timezone.utc)
                    logger.info(f"Invoice moved: {parsed.subject} -> {settings.invoice_folder_name}")
                else:
                    action = "error"
                    error_message = f"Folder '{settings.invoice_folder_name}' not found in {settings.maintenance_inbox}"
                    logger.error(error_message)
            except Exception as e:
                action = "error"
                error_message = str(e)
                logger.error(f"Failed to move invoice: {e}")

        elif classification.is_invoice and classification.confidence < CONFIDENCE_THRESHOLD:
            action = "flagged"
        else:
            action = "skipped"

        # Store result
        processing_time_ms = int((time.time() - start_time) * 1000)
        await self._store_detection(
            parsed=parsed,
            mailbox=mailbox,
            classification=classification,
            attachment_names=attachment_names,
            action=action,
            moved_to_folder=moved_to_folder,
            moved_at=moved_at,
            error_message=error_message,
            processing_time_ms=processing_time_ms,
        )

        return {
            "status": "ok",
            "action": action,
            "is_invoice": classification.is_invoice,
            "confidence": classification.confidence,
        }

    async def _store_detection(
        self,
        parsed: ParsedEmail,
        mailbox: str,
        classification,
        attachment_names: list[str],
        action: str,
        moved_to_folder: Optional[str],
        moved_at: Optional[datetime],
        error_message: Optional[str],
        processing_time_ms: int,
    ) -> None:
        from app.agents.invoice.models import InvoiceDetection
        from app.agents.shared.models import AgentActivityLog

        async with get_async_session() as db:
            detection = InvoiceDetection(
                id=uuid.uuid4(),
                mailbox=mailbox,
                message_id=parsed.message_id,
                thread_id=parsed.conversation_id,
                from_email=parsed.from_email,
                from_name=parsed.from_name,
                subject=parsed.subject,
                received_at=parsed.received_at or datetime.now(timezone.utc),
                is_invoice=classification.is_invoice,
                confidence_score=classification.confidence,
                ai_reasoning=classification.reasoning,
                attachment_names=attachment_names,
                detected_invoice_type=classification.invoice_type,
                action=action,
                moved_to_folder=moved_to_folder,
                moved_at=moved_at,
                error_message=error_message,
            )
            db.add(detection)

            activity = AgentActivityLog(
                id=uuid.uuid4(),
                agent_name="invoice",
                action=action,
                mailbox=mailbox,
                message_id=parsed.message_id,
                subject=parsed.subject,
                details={
                    "is_invoice": classification.is_invoice,
                    "invoice_type": classification.invoice_type,
                },
                confidence_score=classification.confidence,
                processing_time_ms=processing_time_ms,
            )
            db.add(activity)
            await db.commit()
