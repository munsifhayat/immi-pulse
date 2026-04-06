"""
Email parser — extracts structured data from Microsoft Graph message objects.
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ParsedEmail:
    message_id: str
    conversation_id: Optional[str]
    subject: str
    from_email: str
    from_name: Optional[str]
    to_recipients: list[str]
    received_at: Optional[datetime]
    body_text: str
    body_preview: str
    has_attachments: bool
    attachment_names: list[str] = field(default_factory=list)
    importance: str = "normal"
    raw: dict = field(default_factory=dict)


def parse_graph_message(message: dict) -> ParsedEmail:
    """Parse a Microsoft Graph message into a structured object."""
    from_obj = message.get("from", {}).get("emailAddress", {})
    to_list = [
        r.get("emailAddress", {}).get("address", "")
        for r in message.get("toRecipients", [])
    ]

    # Extract plain text body
    body = message.get("body", {})
    body_text = body.get("content", "")
    if body.get("contentType", "").lower() == "html":
        body_text = _strip_html(body_text)

    # Parse received date
    received_str = message.get("receivedDateTime")
    received_at = None
    if received_str:
        try:
            received_at = datetime.fromisoformat(received_str.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            pass

    return ParsedEmail(
        message_id=message.get("id", ""),
        conversation_id=message.get("conversationId"),
        subject=message.get("subject", "(no subject)"),
        from_email=from_obj.get("address", ""),
        from_name=from_obj.get("name"),
        to_recipients=to_list,
        received_at=received_at,
        body_text=body_text[:5000],
        body_preview=message.get("bodyPreview", "")[:500],
        has_attachments=message.get("hasAttachments", False),
        importance=message.get("importance", "normal"),
        raw=message,
    )


def _strip_html(html: str) -> str:
    """Basic HTML tag removal for plain text extraction."""
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()
