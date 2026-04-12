"""
Intake classifier — turn an inbound email into an immigration case inquiry.

Called from the Microsoft Graph webhook dispatcher in
`src/app/integrations/microsoft/webhooks.py`. Uses the Haiku analyzer for a
single fast pass:

    "Is this an immigration inquiry? If so, extract client name, visa type,
     and urgency."

Returns a structured `IntakeClassification`. When AWS credentials are
missing, degrades to a permissive fallback that creates an inquiry case so
emails are never lost during dev setup — the consultant can always adjust
fields manually.
"""

import json
import logging
import re
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.cases.schemas import CreateCaseRequest
from app.agents.immigration.cases.service import CaseService
from app.core.ai_gateway import AIGateway

logger = logging.getLogger(__name__)

AGENT_NAME = "immigration_intake"


SYSTEM_PROMPT = """You are an intake triage assistant for an Australian immigration consultancy.

Given an email, determine if it is an immigration inquiry (someone asking about
getting, renewing, or changing an Australian visa). Extract:
- is_immigration_inquiry: boolean
- client_name: best guess at the person's full name (string or null)
- visa_subclass: e.g. "189", "482", "500", "820" (string or null)
- visa_name: the human-readable visa name (string or null)
- urgency: one of "low", "normal", "high", "urgent"
- confidence: 0.0 to 1.0
- reasoning: one short sentence explaining the decision

Respond ONLY with a JSON object containing those seven fields. No preamble.
Non-immigration emails (newsletters, billing, spam) must return is_immigration_inquiry=false.
"""


@dataclass
class IntakeClassification:
    is_immigration_inquiry: bool
    client_name: Optional[str]
    visa_subclass: Optional[str]
    visa_name: Optional[str]
    urgency: str
    confidence: float
    reasoning: str


def _build_prompt(subject: str, from_name: str, from_email: str, body_preview: str) -> str:
    return (
        f"From: {from_name} <{from_email}>\n"
        f"Subject: {subject}\n"
        f"---\n"
        f"{body_preview[:4000]}"
    )


def _parse_response(message: str) -> Optional[IntakeClassification]:
    if not message:
        return None
    match = re.search(r"\{.*\}", message, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None

    urgency = str(data.get("urgency", "normal")).lower()
    if urgency not in ("low", "normal", "high", "urgent"):
        urgency = "normal"

    try:
        return IntakeClassification(
            is_immigration_inquiry=bool(data.get("is_immigration_inquiry", False)),
            client_name=data.get("client_name"),
            visa_subclass=data.get("visa_subclass"),
            visa_name=data.get("visa_name"),
            urgency=urgency,
            confidence=float(data.get("confidence", 0.0)),
            reasoning=str(data.get("reasoning", "")),
        )
    except (TypeError, ValueError):
        return None


async def classify_email(
    db: AsyncSession,
    *,
    subject: str,
    from_name: str,
    from_email: str,
    body_preview: str,
) -> IntakeClassification:
    """Run the Haiku-based classifier against a parsed email."""
    ai = AIGateway(db=db)
    response = await ai.classify(
        content=_build_prompt(subject, from_name, from_email, body_preview),
        system_prompt=SYSTEM_PROMPT,
        agent_name=AGENT_NAME,
    )

    if response.success:
        parsed = _parse_response(response.message)
        if parsed is not None:
            return parsed
        logger.warning(f"Intake classifier returned unparseable output: {response.message!r}")

    # Fallback: assume it's worth creating a case so we don't drop the email.
    return IntakeClassification(
        is_immigration_inquiry=True,
        client_name=from_name or None,
        visa_subclass=None,
        visa_name=None,
        urgency="normal",
        confidence=0.0,
        reasoning="Classifier unavailable — defaulted to inquiry for manual triage.",
    )


async def classify_and_create_case(
    db: AsyncSession,
    *,
    subject: str,
    from_name: str,
    from_email: str,
    body_preview: str,
    mailbox: str,
    message_id: str,
) -> Optional[str]:
    """
    Classify an email and, if it's an immigration inquiry, create a Case row.

    Returns the new case id as a string, or None if the email was rejected.
    Caller is responsible for committing the session.
    """
    classification = await classify_email(
        db,
        subject=subject,
        from_name=from_name,
        from_email=from_email,
        body_preview=body_preview,
    )
    if not classification.is_immigration_inquiry:
        logger.info(
            f"Intake: skipping non-inquiry email {message_id} "
            f"(confidence={classification.confidence:.2f})"
        )
        return None

    priority = classification.urgency if classification.urgency in ("low", "normal", "high", "urgent") else "normal"

    case = await CaseService.create_case(
        db,
        CreateCaseRequest(
            client_name=classification.client_name or from_name or from_email,
            client_email=from_email,
            visa_subclass=classification.visa_subclass,
            visa_name=classification.visa_name,
            stage="inquiry",
            priority=priority,
            source="email",
            notes=classification.reasoning,
        ),
        source_message_id=message_id,
        source_mailbox=mailbox,
    )
    logger.info(
        f"Intake: created case {case.id} for {from_email} from message {message_id} "
        f"(visa={classification.visa_subclass}, confidence={classification.confidence:.2f})"
    )
    return str(case.id)
