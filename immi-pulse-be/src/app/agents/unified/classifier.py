"""
Unified classifier — single Sonnet AI call covering all three dimensions.
Raises UnifiedClassifierError on any failure (triggers fallback to legacy agents).
"""

import json
import logging
from typing import Optional

from app.agents.unified.schemas import (
    ComplianceLabel,
    ConflictFlag,
    EmergentSignal,
    InvoiceLabel,
    PriorityLabel,
    UnifiedClassification,
)
from app.core.ai_gateway import AIGateway

logger = logging.getLogger(__name__)


class UnifiedClassifierError(Exception):
    """Raised when unified classification fails — triggers legacy fallback."""

    pass


UNIFIED_SYSTEM_PROMPT = """You are a multi-dimensional email classification agent for Property Pulse, a property management platform.
You must evaluate EVERY incoming email across ALL four dimensions simultaneously, then check for conflicts.

═══ DIMENSION 1: INVOICE DETECTION ═══

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

═══ DIMENSION 2: PRIORITY CLASSIFICATION ═══

P1 (URGENT) criteria:
- Safety hazards (gas leaks, electrical failures, water damage)
- Service outages affecting building operations
- Compliance deadlines within 24 hours
- Client escalations mentioning "urgent", "emergency", "ASAP"

P2 (HIGH): Important but not immediately dangerous
P3 (MEDIUM): Standard maintenance requests
P4 (LOW): Informational, non-actionable

Extract: client name, contract/site location, job description, summary.

═══ DIMENSION 3: EMERGENT WORK SIGNALS ═══

Lightweight signal detection (not full analysis). Flag if the email contains:
- References to work outside original scope or contract
- Change requests, variations, or additional works
- Mentions of unexpected conditions or unforeseen issues
- Budget overrun discussions

═══ DIMENSION 4: COMPLIANCE RADAR ═══

Detect compliance-related signals in Australian property management emails. Compliance categories:
- smoke_alarm: Smoke alarm inspections, testing, certificates, failures, battery replacements
- electrical_safety: RCD/safety switch inspections, electrical safety checks, certificates
- pool_barrier: Pool/spa fence inspections, compliance certificates, barrier defects
- gas_safety: Gas fitting inspections, carbon monoxide checks, gas appliance servicing
- fire_safety: Fire extinguishers, fire blankets, evacuation plans, fire safety statements
- insurance: Landlord insurance renewals, policy changes, coverage expiry notices
- council_notice: Council compliance orders, development notices, environmental health
- body_corporate: Strata/body corporate compliance notices, by-law changes, levy notices
- contractor_compliance: Contractor license expiry, insurance expiry, qualification checks
- minimum_standards: Habitability issues, locks, ventilation, mould, weatherproofing
- water_efficiency: Water-saving devices, WELS ratings, dual-flush compliance
- blind_cord_safety: Window covering safety, cord length compliance (VIC)
- asbestos: Asbestos identification, register, removal, management plans
- pest_inspection: Termite inspections, timber pest reports
- energy_efficiency: Energy ratings, insulation requirements, EER disclosure
- general_compliance: Other regulatory or compliance matters

Determine jurisdiction from property address, sender location, or email content (Australian states: NSW, VIC, QLD, SA, WA, TAS, ACT, NT).
Assess urgency: critical (safety risk or imminent deadline), high (within 14 days), medium (within 30 days), low (informational).

═══ CONFLICT DETECTION ═══

After classifying all four dimensions, check for these conflicts:
- "invoice_and_urgent": Email is an invoice (confidence >= 0.7) AND is urgent (P1). Auto-moving may cause urgent emails to be missed.
- "invoice_and_emergent": Email is an invoice AND has emergent work signals. May need special review.
- "urgent_and_low_confidence": Email is classified as urgent (P1) but priority confidence is below 0.6. Needs human review.
- "compliance_and_urgent": Email has compliance signals AND is P1 urgent. Both should proceed.
- "compliance_and_invoice": Email has compliance signals AND is an invoice (e.g., invoice for compliance work). Both proceed.

Only include conflicts that actually apply. Empty array if no conflicts.

═══ OUTPUT FORMAT ═══

OUTPUT JSON ONLY (no markdown, no explanation outside JSON):
{
  "invoice": {
    "is_invoice": true/false,
    "confidence": 0.0-1.0,
    "invoice_type": "invoice|receipt|purchase_order|credit_note|unknown",
    "reasoning": "brief explanation"
  },
  "priority": {
    "priority": "p1|p2|p3|p4",
    "is_urgent": true/false,
    "confidence": 0.0-1.0,
    "category": "safety|maintenance|repair|inspection|compliance|general",
    "client_name": "extracted or null",
    "contract_location": "extracted or null",
    "job_description": "brief description of the job/issue",
    "summary": "one-line summary",
    "reasoning": "why this priority was assigned"
  },
  "emergent": {
    "has_signals": true/false,
    "confidence": 0.0-1.0,
    "signal_description": "brief description or null",
    "reasoning": "brief explanation"
  },
  "compliance": {
    "has_compliance_signals": true/false,
    "confidence": 0.0-1.0,
    "compliance_type": "smoke_alarm|electrical_safety|pool_barrier|gas_safety|fire_safety|insurance|council_notice|body_corporate|contractor_compliance|minimum_standards|water_efficiency|blind_cord_safety|asbestos|pest_inspection|energy_efficiency|general_compliance",
    "jurisdiction": "NSW|VIC|QLD|SA|WA|TAS|ACT|NT|unknown",
    "property_address": "extracted address or null",
    "status": "compliant|non_compliant|expiring|expired|action_required|information",
    "deadline": "YYYY-MM-DD or null",
    "required_action": "what needs to be done or null",
    "certificate_reference": "certificate/reference number or null",
    "urgency": "critical|high|medium|low",
    "reasoning": "brief explanation"
  },
  "conflicts": [
    {
      "conflict_type": "invoice_and_urgent|invoice_and_emergent|urgent_and_low_confidence|compliance_and_urgent|compliance_and_invoice",
      "description": "brief explanation of the conflict"
    }
  ]
}"""


async def classify_unified(
    ai_gateway: AIGateway,
    from_email: str,
    subject: str,
    body_snippet: str,
    attachment_names: list[str],
    attachment_text: Optional[str] = None,
) -> UnifiedClassification:
    """
    Single Sonnet call that classifies across all dimensions.
    Raises UnifiedClassifierError on any failure.
    """
    # Build comprehensive context
    context_parts = [
        f"From: {from_email}",
        f"Subject: {subject}",
        f"Body:\n{body_snippet[:2000]}",
        f"Attachments: {', '.join(attachment_names) if attachment_names else 'None'}",
    ]
    if attachment_text:
        context_parts.append(f"Attachment content excerpt:\n{attachment_text[:2000]}")

    prompt = "\n\n".join(context_parts)

    response = await ai_gateway.classify_comprehensive(
        content=prompt,
        system_prompt=UNIFIED_SYSTEM_PROMPT,
        agent_name="unified_classifier",
    )

    if not response.success:
        raise UnifiedClassifierError(f"AI call failed: {response.error}")

    # Parse response — strip markdown code fences if present
    try:
        raw = response.message.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            raw = raw.rsplit("```", 1)[0]
        result = json.loads(raw.strip())
    except (json.JSONDecodeError, ValueError) as e:
        raise UnifiedClassifierError(
            f"Failed to parse AI response: {e} — raw: {response.message[:300]}"
        )

    try:
        inv = result["invoice"]
        pri = result["priority"]
        eme = result["emergent"]
        comp = result.get("compliance", {})

        return UnifiedClassification(
            invoice=InvoiceLabel(
                is_invoice=inv.get("is_invoice", False),
                confidence=float(inv.get("confidence", 0.0)),
                invoice_type=inv.get("invoice_type", "unknown"),
                reasoning=inv.get("reasoning", ""),
            ),
            priority=PriorityLabel(
                priority=pri.get("priority", "p3"),
                is_urgent=pri.get("is_urgent", False),
                confidence=float(pri.get("confidence", 0.0)),
                category=pri.get("category", "general"),
                client_name=pri.get("client_name"),
                contract_location=pri.get("contract_location"),
                job_description=pri.get("job_description"),
                summary=pri.get("summary"),
                reasoning=pri.get("reasoning", ""),
            ),
            emergent=EmergentSignal(
                has_signals=eme.get("has_signals", False),
                confidence=float(eme.get("confidence", 0.0)),
                signal_description=eme.get("signal_description"),
                reasoning=eme.get("reasoning", ""),
            ),
            compliance=ComplianceLabel(
                has_compliance_signals=comp.get("has_compliance_signals", False),
                confidence=float(comp.get("confidence", 0.0)),
                compliance_type=comp.get("compliance_type", "general_compliance"),
                jurisdiction=comp.get("jurisdiction", "unknown"),
                property_address=comp.get("property_address"),
                status=comp.get("status", "information"),
                deadline=comp.get("deadline"),
                required_action=comp.get("required_action"),
                certificate_reference=comp.get("certificate_reference"),
                urgency=comp.get("urgency", "low"),
                reasoning=comp.get("reasoning", ""),
            ),
            conflicts=[
                ConflictFlag(
                    conflict_type=c.get("conflict_type", "unknown"),
                    description=c.get("description", ""),
                )
                for c in result.get("conflicts", [])
            ],
        )
    except (KeyError, TypeError) as e:
        raise UnifiedClassifierError(
            f"Missing required fields in AI response: {e}"
        )
