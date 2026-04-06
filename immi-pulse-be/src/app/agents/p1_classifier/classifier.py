"""
P1 urgency classifier — uses Haiku for fast priority classification.
"""

import json
import logging
from dataclasses import dataclass
from typing import Optional

from app.core.ai_gateway import AIGateway

logger = logging.getLogger(__name__)

P1_SYSTEM_PROMPT = """You are a priority classification agent for Property Pulse, a property management platform.
Classify incoming emails by urgency using the Property Pulse priority system.

P1 (URGENT) criteria:
- Safety hazards (gas leaks, electrical failures, water damage)
- Service outages affecting building operations
- Compliance deadlines within 24 hours
- Client escalations mentioning "urgent", "emergency", "ASAP"

P2 (HIGH): Important but not immediately dangerous
P3 (MEDIUM): Standard maintenance requests
P4 (LOW): Informational, non-actionable

Extract: client name, contract/site location, job description, summary.

OUTPUT JSON ONLY (no markdown, no explanation outside JSON):
{
  "priority": "p1|p2|p3|p4",
  "is_urgent": true/false,
  "confidence": 0.0-1.0,
  "category": "safety|maintenance|repair|inspection|compliance|general",
  "client_name": "extracted or null",
  "contract_location": "extracted or null",
  "job_description": "brief description of the job/issue",
  "summary": "one-line summary",
  "reasoning": "why this priority was assigned"
}"""


@dataclass
class P1Classification:
    priority: str
    is_urgent: bool
    confidence: float
    category: str
    client_name: Optional[str]
    contract_location: Optional[str]
    job_description: Optional[str]
    summary: Optional[str]
    reasoning: str


async def classify_priority(
    ai_gateway: AIGateway,
    from_email: str,
    subject: str,
    body_snippet: str,
) -> P1Classification:
    """Classify email priority using AI."""
    prompt = f"From: {from_email}\nSubject: {subject}\n\nBody:\n{body_snippet[:2000]}"

    response = await ai_gateway.classify(
        content=prompt,
        system_prompt=P1_SYSTEM_PROMPT,
        agent_name="p1_classifier",
    )

    if not response.success:
        logger.error(f"P1 classification failed: {response.error}")
        return P1Classification(
            priority="p3",
            is_urgent=False,
            confidence=0.1,
            category="general",
            client_name=None,
            contract_location=None,
            job_description=None,
            summary=None,
            reasoning=f"AI failed ({response.error}), defaulting to P3",
        )

    try:
        result = json.loads(response.message.strip())
        return P1Classification(
            priority=result.get("priority", "p3"),
            is_urgent=result.get("is_urgent", False),
            confidence=float(result.get("confidence", 0.0)),
            category=result.get("category", "general"),
            client_name=result.get("client_name"),
            contract_location=result.get("contract_location"),
            job_description=result.get("job_description"),
            summary=result.get("summary"),
            reasoning=result.get("reasoning", ""),
        )
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"Failed to parse P1 classification response: {e}")
        return P1Classification(
            priority="p3",
            is_urgent=False,
            confidence=0.0,
            category="general",
            client_name=None,
            contract_location=None,
            job_description=None,
            summary=None,
            reasoning=f"Failed to parse AI response: {response.message[:200]}",
        )
