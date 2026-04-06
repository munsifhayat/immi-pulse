"""
Thread analyzer — fetches conversation threads and processes attachments.
"""

import logging
from datetime import datetime, timedelta, timezone

from app.agents.shared.attachment_handler import AttachmentHandler
from app.agents.shared.email_parser import parse_graph_message
from app.core.config import get_settings
from app.integrations.microsoft.graph_client import get_graph_client

logger = logging.getLogger(__name__)
settings = get_settings()


async def gather_recent_threads(hours: int = 2) -> list[dict]:
    """
    Fetch recent email threads from all monitored mailboxes.
    Returns thread packages ready for AI analysis.
    """
    graph = get_graph_client()
    attachment_handler = AttachmentHandler()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    filter_query = f"receivedDateTime ge {cutoff.strftime('%Y-%m-%dT%H:%M:%SZ')}"

    threads: dict[str, dict] = {}

    for mailbox in settings.monitored_mailbox_list:
        try:
            messages = await graph.list_messages(
                mailbox=mailbox,
                top=100,
                filter_query=filter_query,
            )

            for msg in messages:
                conv_id = msg.get("conversationId")
                if not conv_id:
                    continue

                if conv_id not in threads:
                    threads[conv_id] = {
                        "conversation_id": conv_id,
                        "mailbox": mailbox,
                        "subject": msg.get("subject", "(no subject)"),
                        "emails": [],
                        "attachments": [],
                        "message_ids": [],
                    }

                parsed = parse_graph_message(msg)
                threads[conv_id]["emails"].append({
                    "from": parsed.from_email,
                    "date": parsed.received_at.isoformat() if parsed.received_at else "",
                    "body": parsed.body_text[:1500],
                })
                threads[conv_id]["message_ids"].append(parsed.message_id)

                # Process attachments
                if parsed.has_attachments:
                    try:
                        processed = await attachment_handler.process_attachments(
                            mailbox, parsed.message_id
                        )
                        for att in processed:
                            if att.get("extracted_text"):
                                threads[conv_id]["attachments"].append(att)
                    except Exception as e:
                        logger.error(f"Attachment processing failed for {parsed.message_id}: {e}")

        except Exception as e:
            logger.error(f"Failed to fetch messages for {mailbox}: {e}")

    # Only return threads with multiple emails (conversations worth analyzing)
    return [t for t in threads.values() if len(t["emails"]) > 1]
