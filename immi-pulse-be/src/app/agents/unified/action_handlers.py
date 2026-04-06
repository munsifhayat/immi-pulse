"""
Action handlers — execute side-effects from pre-classified data.
Each handler writes to the same DB tables as the legacy processors.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.shared.email_parser import ParsedEmail
from app.agents.unified.schemas import ResolvedAction, UnifiedClassification
from app.core.config import get_settings
from app.integrations.microsoft.graph_client import get_graph_client

logger = logging.getLogger(__name__)
settings = get_settings()

INVOICE_CONFIDENCE_THRESHOLD = 0.7


class InvoiceActionHandler:
    """Store invoice detection + optionally move email to invoice folder."""

    async def execute(
        self,
        db: AsyncSession,
        parsed: ParsedEmail,
        mailbox: str,
        classification: UnifiedClassification,
        resolved: ResolvedAction,
        attachment_names: list[str],
        processing_time_ms: int,
    ) -> dict:
        inv = classification.invoice
        action = "none"
        moved_to_folder = None
        moved_at = None
        error_message = None

        if inv.is_invoice and inv.confidence >= INVOICE_CONFIDENCE_THRESHOLD:
            if not settings.invoice_auto_move_enabled:
                # Auto-move disabled — classify only, no write operations
                action = "detected"
                logger.info(
                    f"Invoice detected (auto-move disabled): {parsed.subject}"
                )
            elif resolved.flagged:
                # Conflict resolution suppressed auto-move
                action = "flagged"
                logger.info(
                    f"Invoice flagged (not moved) for {parsed.subject}: {resolved.flag_reason}"
                )
            else:
                # Move to invoice folder
                try:
                    graph = get_graph_client()
                    folder = await graph.get_folder_by_name(
                        settings.maintenance_inbox, settings.invoice_folder_name
                    )
                    if folder:
                        await graph.move_message(
                            mailbox, parsed.message_id, folder["id"]
                        )
                        action = "moved"
                        moved_to_folder = settings.invoice_folder_name
                        moved_at = datetime.now(timezone.utc)
                        logger.info(
                            f"Invoice moved: {parsed.subject} -> {settings.invoice_folder_name}"
                        )
                    else:
                        action = "error"
                        error_message = (
                            f"Folder '{settings.invoice_folder_name}' not found "
                            f"in {settings.maintenance_inbox}"
                        )
                        logger.error(error_message)
                except Exception as e:
                    action = "error"
                    error_message = str(e)
                    logger.error(f"Failed to move invoice: {e}")

        elif inv.is_invoice and inv.confidence < INVOICE_CONFIDENCE_THRESHOLD:
            action = "flagged"
        else:
            action = "skipped"

        await self._store_detection(
            db=db,
            parsed=parsed,
            mailbox=mailbox,
            classification=classification,
            attachment_names=attachment_names,
            action=action,
            moved_to_folder=moved_to_folder,
            moved_at=moved_at,
            error_message=error_message,
            processing_time_ms=processing_time_ms,
            flag_reason=resolved.flag_reason,
        )

        return {
            "status": "ok",
            "action": action,
            "is_invoice": inv.is_invoice,
            "confidence": inv.confidence,
        }

    async def _store_detection(
        self,
        db: AsyncSession,
        parsed: ParsedEmail,
        mailbox: str,
        classification: UnifiedClassification,
        attachment_names: list[str],
        action: str,
        moved_to_folder: Optional[str],
        moved_at: Optional[datetime],
        error_message: Optional[str],
        processing_time_ms: int,
        flag_reason: Optional[str],
    ) -> None:
        from app.agents.invoice.models import InvoiceDetection
        from app.agents.shared.models import AgentActivityLog

        inv = classification.invoice
        detection = InvoiceDetection(
            id=uuid.uuid4(),
            mailbox=mailbox,
            message_id=parsed.message_id,
            thread_id=parsed.conversation_id,
            from_email=parsed.from_email,
            from_name=parsed.from_name,
            subject=parsed.subject,
            received_at=parsed.received_at or datetime.now(timezone.utc),
            is_invoice=inv.is_invoice,
            confidence_score=inv.confidence,
            ai_reasoning=inv.reasoning,
            attachment_names=attachment_names,
            detected_invoice_type=inv.invoice_type,
            action=action,
            moved_to_folder=moved_to_folder,
            moved_at=moved_at,
            error_message=error_message,
        )
        db.add(detection)

        details = {
            "is_invoice": inv.is_invoice,
            "invoice_type": inv.invoice_type,
            "classifier": "unified",
        }
        if flag_reason:
            details["flag_reason"] = flag_reason

        activity = AgentActivityLog(
            id=uuid.uuid4(),
            agent_name="invoice",
            action=action,
            mailbox=mailbox,
            message_id=parsed.message_id,
            subject=parsed.subject,
            details=details,
            confidence_score=inv.confidence,
            processing_time_ms=processing_time_ms,
        )
        db.add(activity)


class P1ActionHandler:
    """Store P1 job record + SLA deadline tracking."""

    async def execute(
        self,
        db: AsyncSession,
        parsed: ParsedEmail,
        mailbox: str,
        classification: UnifiedClassification,
        resolved: ResolvedAction,
        processing_time_ms: int,
    ) -> dict:
        pri = classification.priority

        # SLA deadline for P1
        response_deadline = None
        if pri.is_urgent and parsed.received_at:
            response_deadline = parsed.received_at + timedelta(hours=1)

        await self._store_job(
            db=db,
            parsed=parsed,
            mailbox=mailbox,
            classification=classification,
            response_deadline=response_deadline,
            processing_time_ms=processing_time_ms,
            flagged=resolved.flagged,
            flag_reason=resolved.flag_reason,
        )

        return {
            "status": "ok",
            "priority": pri.priority,
            "is_urgent": pri.is_urgent,
            "confidence": pri.confidence,
        }

    async def _store_job(
        self,
        db: AsyncSession,
        parsed: ParsedEmail,
        mailbox: str,
        classification: UnifiedClassification,
        response_deadline: Optional[datetime],
        processing_time_ms: int,
        flagged: bool,
        flag_reason: Optional[str],
    ) -> None:
        from app.agents.p1_classifier.models import P1Job
        from app.agents.shared.models import AgentActivityLog

        pri = classification.priority
        job = P1Job(
            id=uuid.uuid4(),
            mailbox=mailbox,
            message_id=parsed.message_id,
            thread_id=parsed.conversation_id,
            from_email=parsed.from_email,
            from_name=parsed.from_name,
            subject=parsed.subject,
            received_at=parsed.received_at or datetime.now(timezone.utc),
            priority=pri.priority,
            is_urgent=pri.is_urgent,
            confidence_score=pri.confidence,
            ai_reasoning=pri.reasoning,
            category=pri.category,
            client_name=pri.client_name,
            contract_location=pri.contract_location,
            job_description=pri.job_description,
            ai_summary=pri.summary,
            response_deadline=response_deadline,
        )
        db.add(job)

        details = {
            "priority": pri.priority,
            "category": pri.category,
            "client_name": pri.client_name,
            "classifier": "unified",
        }
        if flagged:
            details["flagged"] = True
            details["flag_reason"] = flag_reason

        activity = AgentActivityLog(
            id=uuid.uuid4(),
            agent_name="p1_classifier",
            action="classified",
            mailbox=mailbox,
            message_id=parsed.message_id,
            subject=parsed.subject,
            details=details,
            confidence_score=pri.confidence,
            processing_time_ms=processing_time_ms,
        )
        db.add(activity)


class EmergentWorkActionHandler:
    """Log emergent work signals to activity log (batch scan unchanged)."""

    async def execute(
        self,
        db: AsyncSession,
        parsed: ParsedEmail,
        mailbox: str,
        classification: UnifiedClassification,
        resolved: ResolvedAction,
        processing_time_ms: int,
    ) -> dict:
        eme = classification.emergent

        if not eme.has_signals:
            return {"status": "ok", "action": "no_signals"}

        await self._store_signal(
            db=db,
            parsed=parsed,
            mailbox=mailbox,
            classification=classification,
            resolved=resolved,
            processing_time_ms=processing_time_ms,
        )

        return {
            "status": "ok",
            "action": "signal_logged",
            "has_signals": True,
            "confidence": eme.confidence,
        }

    async def _store_signal(
        self,
        db: AsyncSession,
        parsed: ParsedEmail,
        mailbox: str,
        classification: UnifiedClassification,
        resolved: ResolvedAction,
        processing_time_ms: int,
    ) -> None:
        from app.agents.shared.models import AgentActivityLog

        eme = classification.emergent
        details = {
            "has_signals": eme.has_signals,
            "signal_description": eme.signal_description,
            "classifier": "unified",
        }
        if resolved.flagged:
            details["flagged"] = True
            details["flag_reason"] = resolved.flag_reason

        activity = AgentActivityLog(
            id=uuid.uuid4(),
            agent_name="emergent_work",
            action="signal_detected",
            mailbox=mailbox,
            message_id=parsed.message_id,
            subject=parsed.subject,
            details=details,
            confidence_score=eme.confidence,
            processing_time_ms=processing_time_ms,
        )
        db.add(activity)


class ComplianceActionHandler:
    """Store compliance detection + auto-update obligations from unified classifier."""

    async def execute(
        self,
        db: AsyncSession,
        parsed: ParsedEmail,
        mailbox: str,
        classification: UnifiedClassification,
        resolved: ResolvedAction,
        processing_time_ms: int,
    ) -> dict:
        comp = classification.compliance

        if not comp.has_compliance_signals:
            return {"status": "ok", "action": "no_signals"}

        detection = await self._store_detection(
            db=db,
            parsed=parsed,
            mailbox=mailbox,
            classification=classification,
            resolved=resolved,
            processing_time_ms=processing_time_ms,
        )

        # Auto-update or create the corresponding obligation
        await self._update_obligation(db, detection, mailbox)

        return {
            "status": "ok",
            "action": "flagged" if resolved.flagged else "detected",
            "compliance_type": comp.compliance_type,
            "urgency": comp.urgency,
            "confidence": comp.confidence,
        }

    async def _store_detection(
        self,
        db: AsyncSession,
        parsed: ParsedEmail,
        mailbox: str,
        classification: UnifiedClassification,
        resolved: ResolvedAction,
        processing_time_ms: int,
    ):
        from app.agents.compliance.models import ComplianceDetection
        from app.agents.shared.models import AgentActivityLog

        comp = classification.compliance

        # Parse deadline string to datetime if present
        deadline_dt = None
        if comp.deadline:
            try:
                deadline_dt = datetime.fromisoformat(comp.deadline)
                if deadline_dt.tzinfo is None:
                    deadline_dt = deadline_dt.replace(tzinfo=timezone.utc)
            except (ValueError, TypeError):
                logger.warning(f"Could not parse compliance deadline: {comp.deadline}")

        action = "flagged" if resolved.flagged else "detected"

        detection = ComplianceDetection(
            id=uuid.uuid4(),
            mailbox=mailbox,
            message_id=parsed.message_id,
            thread_id=parsed.conversation_id,
            from_email=parsed.from_email,
            from_name=parsed.from_name,
            subject=parsed.subject,
            received_at=parsed.received_at or datetime.now(timezone.utc),
            compliance_type=comp.compliance_type,
            jurisdiction=comp.jurisdiction,
            property_address=comp.property_address,
            status=comp.status,
            deadline=deadline_dt,
            required_action=comp.required_action,
            certificate_reference=comp.certificate_reference,
            urgency=comp.urgency,
            confidence_score=comp.confidence,
            ai_reasoning=comp.reasoning,
            action=action,
        )
        db.add(detection)

        details = {
            "compliance_type": comp.compliance_type,
            "jurisdiction": comp.jurisdiction,
            "status": comp.status,
            "urgency": comp.urgency,
            "classifier": "unified",
        }
        if comp.property_address:
            details["property_address"] = comp.property_address
        if comp.deadline:
            details["deadline"] = comp.deadline
        if comp.required_action:
            details["required_action"] = comp.required_action
        if resolved.flagged:
            details["flagged"] = True
            details["flag_reason"] = resolved.flag_reason

        activity = AgentActivityLog(
            id=uuid.uuid4(),
            agent_name="compliance",
            action=action,
            mailbox=mailbox,
            message_id=parsed.message_id,
            subject=parsed.subject,
            details=details,
            confidence_score=comp.confidence,
            processing_time_ms=processing_time_ms,
        )
        db.add(activity)

        return detection

    async def _update_obligation(self, db: AsyncSession, detection, mailbox: str) -> None:
        """Auto-update or create the corresponding compliance obligation."""
        from app.agents.compliance.models import ComplianceObligation, PropertyComplianceProfile
        from app.agents.compliance.scorer import SEVERITY_WEIGHTS

        from sqlalchemy import select

        # Ensure property profile exists
        profile_result = await db.execute(
            select(PropertyComplianceProfile).where(
                PropertyComplianceProfile.mailbox == mailbox
            )
        )
        if not profile_result.scalar_one_or_none():
            profile = PropertyComplianceProfile(
                id=uuid.uuid4(),
                mailbox=mailbox,
                jurisdiction=detection.jurisdiction,
                property_address=detection.property_address,
            )
            db.add(profile)

        # Upsert obligation
        result = await db.execute(
            select(ComplianceObligation).where(
                ComplianceObligation.mailbox == mailbox,
                ComplianceObligation.compliance_type == detection.compliance_type,
            )
        )
        obligation = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if obligation:
            obligation.status = detection.status
            obligation.last_checked = now
            obligation.jurisdiction = detection.jurisdiction or obligation.jurisdiction
            obligation.source_email_id = detection.message_id
            obligation.source_detection_id = detection.id
            if detection.certificate_reference:
                obligation.certificate_reference = detection.certificate_reference
            if detection.deadline:
                obligation.next_due = detection.deadline
            obligation.updated_at = now
        else:
            obligation = ComplianceObligation(
                id=uuid.uuid4(),
                mailbox=mailbox,
                compliance_type=detection.compliance_type,
                jurisdiction=detection.jurisdiction or "unknown",
                status=detection.status,
                last_checked=now,
                next_due=detection.deadline,
                certificate_reference=detection.certificate_reference,
                source_email_id=detection.message_id,
                source_detection_id=detection.id,
                severity_weight=SEVERITY_WEIGHTS.get(detection.compliance_type, 1.0),
            )
            db.add(obligation)
