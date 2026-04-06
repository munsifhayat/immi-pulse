"""
Invoice AI classifier — uses Haiku for fast binary classification.
"""

import json
import logging
from dataclasses import dataclass
from typing import Optional

from app.core.ai_gateway import AIGateway

logger = logging.getLogger(__name__)

INVOICE_SYSTEM_PROMPT = """You are an invoice detection agent for Property Pulse, a property management platform.
Your job is to determine if an email contains an invoice attachment.

An invoice includes:
- Tax invoices, invoices, bills
- Purchase orders referencing payment
- Receipts for services/materials
- Credit notes

NOT invoices:
- Quotes/estimates (unless marked as final invoice)
- Reports, compliance documents
- General correspondence mentioning money
- Marketing emails

Analyze the email subject, body, and attachment names/content.

OUTPUT JSON ONLY (no markdown, no explanation outside JSON):
{
  "is_invoice": true/false,
  "confidence": 0.0-1.0,
  "invoice_type": "invoice|receipt|purchase_order|credit_note|unknown",
  "reasoning": "brief explanation"
}"""


@dataclass
class InvoiceClassification:
    is_invoice: bool
    confidence: float
    invoice_type: str
    reasoning: str


# Filename patterns that suggest invoices
INVOICE_FILENAME_PATTERNS = [
    "invoice", "inv", "receipt", "rcpt", "bill", "credit_note",
    "credit note", "purchase_order", "po_", "tax_invoice",
]


def check_filename_heuristics(attachment_names: list[str]) -> bool:
    """Quick check — do any attachment filenames suggest an invoice?"""
    for name in attachment_names:
        lower = name.lower()
        if any(pattern in lower for pattern in INVOICE_FILENAME_PATTERNS):
            return True
    return False


async def classify_invoice(
    ai_gateway: AIGateway,
    subject: str,
    body_snippet: str,
    attachment_names: list[str],
    attachment_text: Optional[str] = None,
) -> InvoiceClassification:
    """
    Classify whether an email contains an invoice attachment.
    Uses filename heuristics first, then AI for ambiguous cases.
    """
    # Build context for AI
    context_parts = [
        f"Subject: {subject}",
        f"Body: {body_snippet[:1500]}",
        f"Attachments: {', '.join(attachment_names) if attachment_names else 'None'}",
    ]
    if attachment_text:
        context_parts.append(f"Attachment content excerpt:\n{attachment_text[:2000]}")

    prompt = "\n\n".join(context_parts)

    response = await ai_gateway.classify(
        content=prompt,
        system_prompt=INVOICE_SYSTEM_PROMPT,
        agent_name="invoice",
    )

    if not response.success:
        logger.error(f"Invoice classification failed: {response.error}")
        # Fallback to filename heuristics
        has_invoice_name = check_filename_heuristics(attachment_names)
        return InvoiceClassification(
            is_invoice=has_invoice_name,
            confidence=0.3 if has_invoice_name else 0.1,
            invoice_type="unknown",
            reasoning=f"AI failed ({response.error}), used filename heuristic",
        )

    # Parse AI response
    try:
        result = json.loads(response.message.strip())
        return InvoiceClassification(
            is_invoice=result.get("is_invoice", False),
            confidence=float(result.get("confidence", 0.0)),
            invoice_type=result.get("invoice_type", "unknown"),
            reasoning=result.get("reasoning", ""),
        )
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Failed to parse invoice classification response: {e}")
        return InvoiceClassification(
            is_invoice=False,
            confidence=0.0,
            invoice_type="unknown",
            reasoning=f"Failed to parse AI response: {response.message[:200]}",
        )
