"""
Microsoft Graph webhook handler.
Receives change notifications and dispatches to all three agents.

Architecture: "Classify Once, Act Many"
- _dispatch_unified(): single Sonnet call → conflict resolution → action handlers
- _dispatch_legacy(): fallback to parallel independent agents (original behavior)
"""

import asyncio
import logging
import time
from typing import Optional

from app.core.config import get_settings
from app.integrations.microsoft.graph_client import get_graph_client

logger = logging.getLogger(__name__)
settings = get_settings()


async def dispatch_email(mailbox: str, message_id: str, source: str = "webhook") -> dict:
    """
    Central dispatcher — fetches message once, tries unified classification,
    falls back to legacy parallel agents on any failure.
    Deduplicates by message_id so webhooks and polling don't double-process.
    """
    from app.agents.shared.models import ProcessedEmail
    from app.db.session import get_async_session
    from sqlalchemy.exc import IntegrityError

    # Deduplication: try to claim this message
    async with get_async_session() as db:
        try:
            db.add(ProcessedEmail(message_id=message_id, mailbox=mailbox, source=source))
            await db.commit()
        except IntegrityError:
            await db.rollback()
            logger.info(f"Skipping already-processed email {message_id} (source={source})")
            return {"status": "skipped", "reason": "already_processed"}

    graph = get_graph_client()

    # Fetch full message once
    try:
        message = await graph.get_message(mailbox, message_id)
    except Exception as e:
        logger.error(f"Failed to fetch message {message_id} from {mailbox}: {e}")
        return {"status": "error", "error": str(e)}

    # Try unified classification first
    try:
        results = await _dispatch_unified(message, mailbox)
        results["classifier"] = "unified"
        return results
    except Exception as e:
        logger.warning(
            f"Unified classifier failed for {message_id}, falling back to legacy: {e}",
            exc_info=True,
        )

    # Fallback to legacy parallel agents
    results = await _dispatch_legacy(message, mailbox, message_id)
    results["classifier"] = "legacy"
    return results


async def _dispatch_unified(message: dict, mailbox: str) -> dict:
    """
    Unified path: parse → attachments → ONE Sonnet call → conflict resolve → action handlers.
    Raises on any failure (caller falls back to legacy).
    """
    from app.agents.shared.attachment_handler import AttachmentHandler
    from app.agents.shared.email_parser import parse_graph_message
    from app.agents.unified.action_handlers import (
        ComplianceActionHandler,
        EmergentWorkActionHandler,
        InvoiceActionHandler,
        P1ActionHandler,
    )
    from app.agents.unified.classifier import classify_unified
    from app.agents.unified.conflict_resolver import resolve_conflicts
    from app.core.ai_gateway import AIGateway
    from app.db.session import get_async_session

    start_time = time.time()
    parsed = parse_graph_message(message)

    # Process attachments once (shared across all dimensions)
    attachment_names = []
    attachment_text = None
    if parsed.has_attachments:
        handler = AttachmentHandler()
        processed = await handler.process_attachments(mailbox, parsed.message_id)
        attachment_names = [a["name"] for a in processed]
        texts = [a["extracted_text"] for a in processed if a.get("extracted_text")]
        if texts:
            attachment_text = "\n---\n".join(texts)

    # Single AI call
    async with get_async_session() as db:
        ai_gateway = AIGateway(db)
        classification = await classify_unified(
            ai_gateway=ai_gateway,
            from_email=parsed.from_email,
            subject=parsed.subject,
            body_snippet=parsed.body_preview,
            attachment_names=attachment_names,
            attachment_text=attachment_text,
        )

    # Resolve conflicts (pure logic, no I/O)
    resolved = resolve_conflicts(classification)
    processing_time_ms = int((time.time() - start_time) * 1000)

    # Check mailbox exclusions for invoice
    skip_invoice = mailbox.lower() in settings.excluded_mailbox_list

    # Execute action handlers in parallel, sharing a single DB session
    async with get_async_session() as db:
        handler_tasks = {}

        if not skip_invoice:
            handler_tasks["invoice"] = InvoiceActionHandler().execute(
                db=db,
                parsed=parsed,
                mailbox=mailbox,
                classification=classification,
                resolved=resolved.invoice,
                attachment_names=attachment_names,
                processing_time_ms=processing_time_ms,
            )

        handler_tasks["p1_classifier"] = P1ActionHandler().execute(
            db=db,
            parsed=parsed,
            mailbox=mailbox,
            classification=classification,
            resolved=resolved.p1,
            processing_time_ms=processing_time_ms,
        )

        handler_tasks["emergent_work"] = EmergentWorkActionHandler().execute(
            db=db,
            parsed=parsed,
            mailbox=mailbox,
            classification=classification,
            resolved=resolved.emergent,
            processing_time_ms=processing_time_ms,
        )

        handler_tasks["compliance"] = ComplianceActionHandler().execute(
            db=db,
            parsed=parsed,
            mailbox=mailbox,
            classification=classification,
            resolved=resolved.compliance,
            processing_time_ms=processing_time_ms,
        )

        gathered = await asyncio.gather(*handler_tasks.values(), return_exceptions=True)
        results = {}
        for agent_name, result in zip(handler_tasks.keys(), gathered):
            if isinstance(result, Exception):
                logger.error(f"Action handler {agent_name} failed: {result}")
                results[agent_name] = {"status": "error", "error": str(result)}
            else:
                results[agent_name] = result or {"status": "ok"}

        await db.commit()

    conflicts = [
        {"type": c.conflict_type, "description": c.description}
        for c in classification.conflicts
    ]
    if conflicts:
        results["conflicts"] = conflicts

    logger.info(
        f"Unified dispatch completed for {parsed.message_id} in {processing_time_ms}ms "
        f"(conflicts: {len(conflicts)})"
    )
    return results


async def _dispatch_legacy(message: dict, mailbox: str, message_id: str) -> dict:
    """Legacy path: fan out to all three agents independently (original behavior)."""
    results = {}
    skip_invoice = mailbox.lower() in settings.excluded_mailbox_list

    tasks = {}
    if not skip_invoice:
        tasks["invoice"] = _process_invoice(message, mailbox)
    tasks["p1_classifier"] = _process_p1(message, mailbox)
    tasks["emergent_work"] = _queue_emergent_work(message, mailbox)

    gathered = await asyncio.gather(*tasks.values(), return_exceptions=True)

    for agent_name, result in zip(tasks.keys(), gathered):
        if isinstance(result, Exception):
            logger.error(f"Agent {agent_name} failed for {message_id}: {result}")
            results[agent_name] = {"status": "error", "error": str(result)}
        else:
            results[agent_name] = result or {"status": "ok"}

    return results


async def _process_invoice(message: dict, mailbox: str) -> Optional[dict]:
    """Route to invoice agent processor."""
    try:
        from app.agents.invoice.processor import InvoiceProcessor

        processor = InvoiceProcessor()
        return await processor.process(message, mailbox)
    except ImportError:
        logger.debug("Invoice processor not yet available")
        return {"status": "skipped", "reason": "not_implemented"}
    except Exception as e:
        logger.error(f"Invoice processing failed: {e}")
        raise


async def _process_p1(message: dict, mailbox: str) -> Optional[dict]:
    """Route to P1 classifier processor."""
    try:
        from app.agents.p1_classifier.processor import P1Processor

        processor = P1Processor()
        return await processor.process(message, mailbox)
    except ImportError:
        logger.debug("P1 processor not yet available")
        return {"status": "skipped", "reason": "not_implemented"}
    except Exception as e:
        logger.error(f"P1 classification failed: {e}")
        raise


async def _queue_emergent_work(message: dict, mailbox: str) -> Optional[dict]:
    """Queue email for emergent work batch analysis."""
    try:
        from app.agents.emergent_work.processor import EmergentWorkProcessor

        processor = EmergentWorkProcessor()
        return await processor.queue_email(message, mailbox)
    except ImportError:
        logger.debug("Emergent work processor not yet available")
        return {"status": "skipped", "reason": "not_implemented"}
    except Exception as e:
        logger.error(f"Emergent work queueing failed: {e}")
        raise
