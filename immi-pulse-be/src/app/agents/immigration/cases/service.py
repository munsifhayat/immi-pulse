"""Business logic for the Cases feature."""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.agents.immigration.cases.checklist_templates import get_template
from app.agents.immigration.cases.heuristic_analyzer import heuristic_analyze
from app.agents.immigration.cases.models import (
    Case,
    CaseDocument,
    CasePortalToken,
    CaseTimelineEvent,
)
from app.agents.immigration.cases.schemas import (
    CreateCaseRequest,
    UpdateCaseRequest,
)
from app.core.config import get_settings
from app.core.portal_auth import generate_pin, hash_pin, sign_portal_token
from app.core.storage import StoredFile, upload_case_document

logger = logging.getLogger(__name__)


class CaseService:
    """Case CRUD, portal link management, and document helpers."""

    # --- Cases --------------------------------------------------------------

    @staticmethod
    async def list_cases(
        db: AsyncSession,
        *,
        stage: Optional[str] = None,
        priority: Optional[str] = None,
        visa_subclass: Optional[str] = None,
        consultant_id: Optional[UUID] = None,
        search: Optional[str] = None,
        limit: int = 100,
    ) -> list[Case]:
        query = select(Case).order_by(Case.updated_at.desc())
        if stage:
            query = query.where(Case.stage == stage)
        if priority:
            query = query.where(Case.priority == priority)
        if visa_subclass:
            query = query.where(Case.visa_subclass == visa_subclass)
        if consultant_id:
            query = query.where(Case.consultant_id == consultant_id)
        if search:
            like = f"%{search.lower()}%"
            query = query.where(
                func.lower(Case.client_name).like(like)
                | func.lower(Case.client_email).like(like)
            )
        query = query.limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_case(db: AsyncSession, case_id: UUID) -> Optional[Case]:
        return await db.get(Case, case_id)

    @staticmethod
    async def create_case(
        db: AsyncSession,
        payload: CreateCaseRequest,
        *,
        consultant_id: Optional[UUID] = None,
        source_message_id: Optional[str] = None,
        source_mailbox: Optional[str] = None,
    ) -> Case:
        metadata: dict[str, Any] = {}
        if payload.ai_summary is not None:
            metadata["ai_summary"] = payload.ai_summary.model_dump(mode="json")
        if payload.checklist is not None:
            metadata["checklist"] = [
                item.model_dump(mode="json") for item in payload.checklist
            ]

        case = Case(
            id=uuid.uuid4(),
            client_name=payload.client_name,
            client_email=payload.client_email,
            client_phone=payload.client_phone,
            visa_subclass=payload.visa_subclass,
            visa_name=payload.visa_name,
            stage=payload.stage,
            priority=payload.priority,
            source=payload.source,
            source_message_id=source_message_id,
            source_mailbox=source_mailbox,
            consultant_id=consultant_id,
            notes=payload.notes,
            metadata_json=metadata or None,
        )
        db.add(case)
        await db.flush()
        await CaseService.record_event(
            db,
            case_id=case.id,
            actor_type="system" if payload.source == "email" else "consultant",
            actor_user_id=consultant_id,
            event_type="case_created",
            event_payload={
                "source": payload.source,
                "stage": payload.stage,
                "has_ai_summary": payload.ai_summary is not None,
                "checklist_items": len(payload.checklist) if payload.checklist else 0,
            },
        )
        return case

    # --- Checklist helpers (stored on case.metadata_json) ------------------

    @staticmethod
    async def generate_checklist(
        db: AsyncSession,
        case: Case,
        *,
        visa_subclass: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """(Re)generate the case's checklist from a template and persist it."""
        template = get_template(visa_subclass or case.visa_subclass)
        metadata = dict(case.metadata_json or {})
        metadata["checklist"] = template
        case.metadata_json = metadata
        flag_modified(case, "metadata_json")
        await CaseService.record_event(
            db,
            case_id=case.id,
            actor_type="system",
            event_type="checklist_generated",
            event_payload={
                "visa_subclass": visa_subclass or case.visa_subclass,
                "item_count": len(template),
            },
        )
        await db.flush()
        return template

    @staticmethod
    async def update_checklist_item(
        db: AsyncSession,
        case: Case,
        item_id: str,
        *,
        status: Optional[str] = None,
        document_id: Optional[UUID] = None,
        notes: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        metadata = dict(case.metadata_json or {})
        items: list[dict[str, Any]] = list(metadata.get("checklist") or [])
        found: Optional[dict[str, Any]] = None
        for item in items:
            if item.get("id") == item_id:
                if status is not None:
                    item["status"] = status
                if document_id is not None:
                    item["document_id"] = str(document_id)
                if notes is not None:
                    item["notes"] = notes
                found = item
                break
        if found is None:
            return None
        metadata["checklist"] = items
        case.metadata_json = metadata
        flag_modified(case, "metadata_json")
        await db.flush()
        return found

    @staticmethod
    async def auto_link_document_to_checklist(
        db: AsyncSession,
        case: Case,
        document: CaseDocument,
    ) -> None:
        """When a client uploads a doc, flip the matching checklist row to
        'uploaded' and point it at the document — keeps the client portal and
        consultant review UI in sync without extra bookkeeping."""
        if not document.document_type:
            logger.info(
                f"auto_link skipped — no document_type on {document.id}"
            )
            return
        # Refresh the case so metadata_json reflects the committed state from
        # any prior requests; within the same session SQLAlchemy will return
        # the cached object whose metadata_json may have been mutated since.
        await db.refresh(case, attribute_names=["metadata_json"])
        metadata = dict(case.metadata_json or {})
        items = [dict(item) for item in (metadata.get("checklist") or [])]
        dirty = False
        for item in items:
            if item.get("document_id"):
                continue
            if item.get("document_type") == document.document_type:
                item["status"] = "uploaded"
                item["document_id"] = str(document.id)
                dirty = True
                break
        if not dirty:
            logger.info(
                f"auto_link: no matching checklist row for "
                f"document_type={document.document_type} on case {case.id}"
            )
            return
        metadata["checklist"] = items
        case.metadata_json = metadata
        flag_modified(case, "metadata_json")
        await db.flush()
        logger.info(
            f"auto_link: document {document.id} ({document.document_type}) "
            f"→ checklist row on case {case.id}"
        )

    @staticmethod
    async def update_case(
        db: AsyncSession,
        case: Case,
        payload: UpdateCaseRequest,
        *,
        actor_user_id: Optional[UUID] = None,
    ) -> Case:
        changed: dict[str, Any] = {}
        data = payload.model_dump(exclude_unset=True)
        for field, value in data.items():
            if getattr(case, field) != value:
                changed[field] = value
                setattr(case, field, value)

        if "stage" in changed:
            await CaseService.record_event(
                db,
                case_id=case.id,
                actor_type="consultant" if actor_user_id else "system",
                actor_user_id=actor_user_id,
                event_type="stage_changed",
                event_payload={"to": changed["stage"]},
            )
        await db.flush()
        return case

    # --- Timeline events ---------------------------------------------------

    @staticmethod
    async def record_event(
        db: AsyncSession,
        *,
        case_id: UUID,
        actor_type: str,
        event_type: str,
        event_payload: Optional[dict[str, Any]] = None,
        actor_user_id: Optional[UUID] = None,
    ) -> CaseTimelineEvent:
        event = CaseTimelineEvent(
            id=uuid.uuid4(),
            case_id=case_id,
            actor_type=actor_type,
            actor_user_id=actor_user_id,
            event_type=event_type,
            event_payload=event_payload,
        )
        db.add(event)
        return event

    @staticmethod
    async def list_events(db: AsyncSession, case_id: UUID) -> list[CaseTimelineEvent]:
        result = await db.execute(
            select(CaseTimelineEvent)
            .where(CaseTimelineEvent.case_id == case_id)
            .order_by(CaseTimelineEvent.created_at.asc())
        )
        return list(result.scalars().all())

    # --- Documents ---------------------------------------------------------

    @staticmethod
    async def list_documents(db: AsyncSession, case_id: UUID) -> list[CaseDocument]:
        result = await db.execute(
            select(CaseDocument)
            .where(CaseDocument.case_id == case_id)
            .order_by(CaseDocument.uploaded_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_document(db: AsyncSession, document_id: UUID) -> Optional[CaseDocument]:
        return await db.get(CaseDocument, document_id)

    @staticmethod
    async def count_documents(db: AsyncSession, case_id: UUID) -> tuple[int, int]:
        total = await db.scalar(
            select(func.count())
            .select_from(CaseDocument)
            .where(CaseDocument.case_id == case_id)
        )
        pending = await db.scalar(
            select(func.count())
            .select_from(CaseDocument)
            .where(
                CaseDocument.case_id == case_id,
                CaseDocument.status == "pending",
            )
        )
        return int(total or 0), int(pending or 0)

    @staticmethod
    async def store_document(
        db: AsyncSession,
        *,
        case_id: UUID,
        file_name: str,
        file_bytes: bytes,
        content_type: Optional[str],
        uploaded_by_type: str = "client",
        uploaded_by_user_id: Optional[UUID] = None,
    ) -> CaseDocument:
        stored: StoredFile = upload_case_document(
            str(case_id), file_name, file_bytes, content_type
        )
        # Run the filename heuristic synchronously so the UI always has an
        # ai_analysis payload to render the moment the file is uploaded. The
        # background Bedrock-backed analyzer (when configured) overwrites
        # this with the richer result.
        heuristic = heuristic_analyze(file_name, file_bytes)
        initial_status = heuristic.get("status") or "pending"
        document = CaseDocument(
            id=uuid.uuid4(),
            case_id=case_id,
            document_type=heuristic.get("document_type"),
            file_name=file_name,
            s3_key=stored.key,
            file_size=stored.size,
            content_type=content_type,
            uploaded_by_type=uploaded_by_type,
            uploaded_by_user_id=uploaded_by_user_id,
            status=initial_status,
            ai_analysis=heuristic,
        )
        db.add(document)
        await db.flush()
        await CaseService.record_event(
            db,
            case_id=case_id,
            actor_type=uploaded_by_type,
            actor_user_id=uploaded_by_user_id,
            event_type="document_uploaded",
            event_payload={"document_id": str(document.id), "file_name": file_name},
        )
        case = await db.get(Case, case_id)
        if case is not None:
            await CaseService.auto_link_document_to_checklist(db, case, document)
        return document

    @staticmethod
    async def mark_document_reviewed(
        db: AsyncSession,
        document: CaseDocument,
        *,
        status: str,
        review_notes: Optional[str],
        reviewer_user_id: Optional[UUID],
    ) -> CaseDocument:
        document.status = status
        document.review_notes = review_notes
        document.reviewed_by = reviewer_user_id
        document.reviewed_at = datetime.now(timezone.utc)
        await CaseService.record_event(
            db,
            case_id=document.case_id,
            actor_type="consultant",
            actor_user_id=reviewer_user_id,
            event_type="document_reviewed",
            event_payload={"document_id": str(document.id), "status": status},
        )
        # Propagate review status to the matching checklist row so both
        # consultant and client see the same state.
        case = await db.get(Case, document.case_id)
        if case is not None:
            metadata = dict(case.metadata_json or {})
            items = list(metadata.get("checklist") or [])
            dirty = False
            checklist_status = (
                "validated"
                if status == "validated"
                else "flagged"
                if status in ("flagged", "rejected")
                else "uploaded"
            )
            for item in items:
                if item.get("document_id") == str(document.id):
                    item["status"] = checklist_status
                    dirty = True
                    break
            if dirty:
                metadata["checklist"] = items
                case.metadata_json = metadata
                flag_modified(case, "metadata_json")
        await db.flush()
        return document

    # --- Portal tokens -----------------------------------------------------

    @staticmethod
    async def create_portal_token(
        db: AsyncSession,
        case_id: UUID,
        *,
        created_by: Optional[UUID] = None,
        expires_in_days: Optional[int] = None,
    ) -> tuple[CasePortalToken, str, str]:
        """
        Mint a new portal token for a case.

        Returns the DB row, the signed URL-safe token string, and the plaintext
        PIN (which is only returned once — never again, since only the bcrypt
        hash is persisted).
        """
        settings = get_settings()
        ttl_days = expires_in_days or settings.portal_token_max_age_days
        expires_at = datetime.now(timezone.utc) + timedelta(days=ttl_days)

        pin = generate_pin()
        token_id = uuid.uuid4()

        row = CasePortalToken(
            id=token_id,
            case_id=case_id,
            pin_hash=hash_pin(pin),
            expires_at=expires_at,
            created_by=created_by,
        )
        db.add(row)
        await db.flush()

        signed = sign_portal_token(token_id=token_id, case_id=case_id)
        await CaseService.record_event(
            db,
            case_id=case_id,
            actor_type="consultant" if created_by else "system",
            actor_user_id=created_by,
            event_type="portal_link_generated",
            event_payload={"token_id": str(token_id), "expires_at": expires_at.isoformat()},
        )
        return row, signed, pin

    @staticmethod
    async def revoke_portal_token(
        db: AsyncSession,
        token: CasePortalToken,
        *,
        revoked_by: Optional[UUID] = None,
    ) -> None:
        token.revoked = True
        await CaseService.record_event(
            db,
            case_id=token.case_id,
            actor_type="consultant" if revoked_by else "system",
            actor_user_id=revoked_by,
            event_type="portal_link_revoked",
            event_payload={"token_id": str(token.id)},
        )
        await db.flush()
