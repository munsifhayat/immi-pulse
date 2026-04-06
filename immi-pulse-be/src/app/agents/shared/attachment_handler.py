"""
Attachment handler — downloads and extracts text from email attachments.
"""

import base64
import logging
from typing import Optional

from app.agents.shared.pdf_processor import extract_docx_text, extract_excel_text, extract_pdf_text
from app.integrations.microsoft.graph_client import get_graph_client

logger = logging.getLogger(__name__)

EXCEL_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
WORD_TYPES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}
PDF_TYPE = "application/pdf"
MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024  # 25MB


class AttachmentHandler:
    """Download and extract text from email attachments via Graph API."""

    def __init__(self):
        self.graph = get_graph_client()

    async def process_attachments(
        self, mailbox: str, message_id: str
    ) -> list[dict]:
        """
        Download all attachments for a message and extract text.
        Returns list of {name, type, size, extracted_text}.
        """
        attachments = await self.graph.get_message_attachments(mailbox, message_id)
        results = []

        for att in attachments:
            name = att.get("name", "unknown")
            content_type = att.get("contentType", "")
            size = att.get("size", 0)

            # Skip oversized attachments
            if size > MAX_ATTACHMENT_SIZE:
                logger.warning(f"Skipping oversized attachment: {name} ({size} bytes)")
                results.append({
                    "name": name,
                    "type": content_type,
                    "size": size,
                    "extracted_text": None,
                    "skipped_reason": "too_large",
                })
                continue

            text = await self._extract_text(att, content_type)
            results.append({
                "name": name,
                "type": content_type,
                "size": size,
                "extracted_text": text[:5000] if text else None,
            })

        return results

    async def _extract_text(self, attachment: dict, content_type: str) -> Optional[str]:
        """Extract text content from an attachment based on its type."""
        # Graph inline attachments include contentBytes directly
        content_bytes_b64 = attachment.get("contentBytes")
        if not content_bytes_b64:
            return None

        try:
            content = base64.b64decode(content_bytes_b64)
        except Exception as e:
            logger.error(f"Failed to decode attachment: {e}")
            return None

        if content_type == PDF_TYPE:
            return extract_pdf_text(content)
        elif content_type in EXCEL_TYPES:
            return extract_excel_text(content)
        elif content_type in WORD_TYPES:
            return extract_docx_text(content)

        return None
