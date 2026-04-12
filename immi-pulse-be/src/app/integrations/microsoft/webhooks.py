"""
Microsoft Graph webhook handler.

Receives change notifications from Microsoft 365, deduplicates by message_id,
fetches the full message via Graph, parses it, and hands it to the immigration
intake classifier. On success the classifier creates a Case row for the email.
"""

import logging

from app.integrations.microsoft.graph_client import get_graph_client

logger = logging.getLogger(__name__)


async def dispatch_email(mailbox: str, message_id: str, source: str = "webhook") -> dict:
    """
    Central dispatcher — fetches the message once, deduplicates, and runs
    the immigration intake classifier to auto-create a case.
    """
    from sqlalchemy.exc import IntegrityError

    from app.agents.immigration.cases.intake_classifier import classify_and_create_case
    from app.agents.shared.email_parser import parse_graph_message
    from app.agents.shared.models import ProcessedEmail
    from app.db.session import get_async_session

    # Deduplication — try to claim this message
    async with get_async_session() as db:
        try:
            db.add(ProcessedEmail(message_id=message_id, mailbox=mailbox, source=source))
            await db.commit()
        except IntegrityError:
            await db.rollback()
            logger.info(f"Skipping already-processed email {message_id} (source={source})")
            return {"status": "skipped", "reason": "already_processed"}

    graph = get_graph_client()
    try:
        message = await graph.get_message(mailbox, message_id)
    except Exception as e:
        logger.error(f"Failed to fetch message {message_id} from {mailbox}: {e}")
        return {"status": "error", "error": str(e)}

    try:
        parsed = parse_graph_message(message)
    except Exception as e:
        logger.error(f"Failed to parse Graph message {message_id}: {e}")
        return {"status": "error", "error": f"parse_failed: {e}"}

    async with get_async_session() as db:
        try:
            case_id = await classify_and_create_case(
                db,
                subject=parsed.subject,
                from_name=parsed.from_name or "",
                from_email=parsed.from_email or "",
                body_preview=parsed.body_preview or "",
                mailbox=mailbox,
                message_id=message_id,
            )
            await db.commit()
        except Exception as e:
            logger.error(f"Intake classification failed for {message_id}: {e}", exc_info=True)
            await db.rollback()
            return {"status": "error", "error": str(e)}

    if case_id:
        return {"status": "ok", "case_id": case_id, "classifier": "immigration_intake"}
    return {"status": "ok", "reason": "not_an_inquiry"}
