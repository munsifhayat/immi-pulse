"""
Conflict resolver — pure-code logic to resolve conflicts between classification dimensions.
No AI calls, no DB access, fully unit-testable.
"""

import logging

from app.agents.unified.schemas import (
    ResolvedAction,
    ResolvedActions,
    UnifiedClassification,
)

logger = logging.getLogger(__name__)

INVOICE_CONFIDENCE_THRESHOLD = 0.7
URGENT_LOW_CONFIDENCE_THRESHOLD = 0.6


def resolve_conflicts(classification: UnifiedClassification) -> ResolvedActions:
    """
    Apply conflict resolution rules to a unified classification.
    Returns ResolvedActions indicating what each handler should do.

    Rules:
    - invoice_and_urgent: suppress invoice auto-move (flag instead), P1 proceeds
    - invoice_and_emergent: both proceed, flagged for review
    - urgent_and_low_confidence: P1 stored but flagged
    - compliance_and_urgent: both proceed, compliance flagged as also urgent
    - compliance_and_invoice: both proceed (invoice for compliance work is valid)
    - P1 is NEVER suppressed
    - Critical compliance is NEVER suppressed
    """
    inv = classification.invoice
    pri = classification.priority
    eme = classification.emergent
    comp = classification.compliance

    # Start with default actions
    invoice_action = ResolvedAction(should_execute=True)
    p1_action = ResolvedAction(should_execute=True)
    emergent_action = ResolvedAction(should_execute=True)
    compliance_action = ResolvedAction(should_execute=True)

    # Detect active conflicts from AI response + our own checks
    conflict_types = {c.conflict_type for c in classification.conflicts}

    # Also detect conflicts programmatically (don't rely solely on AI)
    is_high_conf_invoice = inv.is_invoice and inv.confidence >= INVOICE_CONFIDENCE_THRESHOLD
    is_urgent = pri.is_urgent
    has_emergent = eme.has_signals
    has_compliance = comp.has_compliance_signals
    low_priority_confidence = pri.confidence < URGENT_LOW_CONFIDENCE_THRESHOLD

    # Rule 1: invoice_and_urgent — suppress invoice auto-move, flag instead
    if is_high_conf_invoice and is_urgent:
        conflict_types.add("invoice_and_urgent")

    if "invoice_and_urgent" in conflict_types:
        invoice_action = ResolvedAction(
            should_execute=True,
            flagged=True,
            flag_reason="Invoice auto-move suppressed: email is also P1 urgent",
        )
        logger.info("Conflict: invoice_and_urgent — suppressing auto-move, flagging invoice")

    # Rule 2: invoice_and_emergent — both proceed, flagged for review
    if is_high_conf_invoice and has_emergent:
        conflict_types.add("invoice_and_emergent")

    if "invoice_and_emergent" in conflict_types:
        invoice_action = ResolvedAction(
            should_execute=invoice_action.should_execute,
            flagged=True,
            flag_reason=invoice_action.flag_reason or "Invoice has emergent work signals — needs review",
        )
        emergent_action = ResolvedAction(
            should_execute=True,
            flagged=True,
            flag_reason="Emergent signals detected alongside invoice — flagged for review",
        )
        logger.info("Conflict: invoice_and_emergent — both proceed, flagged")

    # Rule 3: urgent_and_low_confidence — P1 stored but flagged
    if is_urgent and low_priority_confidence:
        conflict_types.add("urgent_and_low_confidence")

    if "urgent_and_low_confidence" in conflict_types:
        p1_action = ResolvedAction(
            should_execute=True,
            flagged=True,
            flag_reason=f"P1 classification has low confidence ({pri.confidence:.2f}) — needs human review",
        )
        logger.info("Conflict: urgent_and_low_confidence — P1 stored but flagged")

    # Rule 4: compliance_and_urgent — both proceed, compliance flagged as also urgent
    if has_compliance and is_urgent:
        conflict_types.add("compliance_and_urgent")

    if "compliance_and_urgent" in conflict_types:
        compliance_action = ResolvedAction(
            should_execute=True,
            flagged=True,
            flag_reason="Compliance signal on P1 urgent email — also flagged as urgent",
        )
        logger.info("Conflict: compliance_and_urgent — both proceed, compliance flagged")

    # Rule 5: compliance_and_invoice — both proceed, no suppression
    if has_compliance and is_high_conf_invoice:
        conflict_types.add("compliance_and_invoice")

    if "compliance_and_invoice" in conflict_types:
        logger.info("Conflict: compliance_and_invoice — both proceed (compliance work invoice)")

    # Critical compliance is never suppressed
    if has_compliance and comp.urgency == "critical":
        compliance_action = ResolvedAction(should_execute=True)

    if conflict_types:
        logger.info(f"Resolved conflicts: {conflict_types}")

    return ResolvedActions(
        invoice=invoice_action,
        p1=p1_action,
        emergent=emergent_action,
        compliance=compliance_action,
    )
