"""
Emergent Work AI detector — uses Sonnet for complex multi-document reasoning.
"""

import json
import logging
from dataclasses import dataclass, field
from typing import Optional

from app.core.ai_gateway import AIGateway

logger = logging.getLogger(__name__)

EMERGENT_WORK_SYSTEM_PROMPT = """You are an emergent work detection agent for Property Pulse, a property management platform.

Your job is to analyze email threads and related documents (invoices, reports) to identify
work that falls OUTSIDE the original contracted scope — work that should be raised with
the client for additional compensation.

Emergent work indicators:
- Tasks not in the original maintenance contract
- Unplanned repairs caused by third-party damage
- Scope increases requested mid-job
- Work described in invoices that doesn't match the original brief
- Additional site visits not originally planned
- Materials/equipment beyond standard maintenance

NOT emergent work:
- Routine maintenance within contract
- Standard repairs covered by agreement
- Administrative follow-ups

Analyze the full email thread and any attached invoices/reports.

OUTPUT JSON ONLY (no markdown, no explanation outside JSON):
{
  "has_emergent_work": true/false,
  "confidence": 0.0-1.0,
  "original_scope_summary": "what the original job/contract covers",
  "emergent_items": [
    {
      "description": "clear description of the emergent work",
      "evidence": "which email or attachment paragraph supports this",
      "estimated_impact": "low|medium|high",
      "recommended_action": "raise_with_client|monitor|ignore"
    }
  ],
  "reasoning": "overall analysis"
}"""


@dataclass
class EmergentItem:
    description: str
    evidence: str
    estimated_impact: str
    recommended_action: str


@dataclass
class EmergentWorkAnalysis:
    has_emergent_work: bool
    confidence: float
    original_scope_summary: Optional[str]
    emergent_items: list[EmergentItem] = field(default_factory=list)
    reasoning: str = ""


async def detect_emergent_work(
    ai_gateway: AIGateway,
    thread_subject: str,
    emails: list[dict],
    attachments: list[dict],
    client: Optional[str] = None,
) -> EmergentWorkAnalysis:
    """Analyze a thread for emergent work using AI."""
    # Build context
    context_parts = [f"Thread Subject: {thread_subject}"]
    if client:
        context_parts.append(f"Client: {client}")

    context_parts.append("\n--- EMAIL THREAD ---")
    for email in emails:
        context_parts.append(
            f"\nFrom: {email.get('from', 'Unknown')}\n"
            f"Date: {email.get('date', 'Unknown')}\n"
            f"Body:\n{email.get('body', '')[:1500]}"
        )

    if attachments:
        context_parts.append("\n--- ATTACHMENTS ---")
        for att in attachments:
            if att.get("extracted_text"):
                context_parts.append(
                    f"\nFile: {att.get('name', 'unknown')}\n"
                    f"Content:\n{att['extracted_text'][:2000]}"
                )

    prompt = "\n".join(context_parts)

    response = await ai_gateway.analyze(
        content=prompt,
        system_prompt=EMERGENT_WORK_SYSTEM_PROMPT,
        agent_name="emergent_work",
    )

    if not response.success:
        logger.error(f"Emergent work detection failed: {response.error}")
        return EmergentWorkAnalysis(
            has_emergent_work=False,
            confidence=0.0,
            original_scope_summary=None,
            reasoning=f"AI failed: {response.error}",
        )

    try:
        result = json.loads(response.message.strip())
        items = [
            EmergentItem(
                description=item.get("description", ""),
                evidence=item.get("evidence", ""),
                estimated_impact=item.get("estimated_impact", "medium"),
                recommended_action=item.get("recommended_action", "monitor"),
            )
            for item in result.get("emergent_items", [])
        ]
        return EmergentWorkAnalysis(
            has_emergent_work=result.get("has_emergent_work", False),
            confidence=float(result.get("confidence", 0.0)),
            original_scope_summary=result.get("original_scope_summary"),
            emergent_items=items,
            reasoning=result.get("reasoning", ""),
        )
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Failed to parse emergent work response: {e}")
        return EmergentWorkAnalysis(
            has_emergent_work=False,
            confidence=0.0,
            original_scope_summary=None,
            reasoning=f"Failed to parse AI response: {response.message[:200]}",
        )
