"""PreCase service — list, detail, archive, qualify, force-convert, promote.

Lifecycle:
    pending → in_review → qualified → letter_sent → letter_signed → paid → converted
                                                                            ↓
    archived (from any non-terminal state)        promoted_case_id is set, status="converted"

Manual overrides at every step:
    - qualify(): consultant decides to proceed (sets status=qualified)
    - force_convert(): skip everything, just open the case
    - mark_letter_signed_manually() (in engagement.service): skip the e-sign portal
    - skip_payment() (in payments.service): skip the payment gate (relative case)
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.clients.models import Client
from app.agents.immigration.precases.models import PreCase
from app.agents.immigration.questionnaires.models import (
    Questionnaire,
    QuestionnaireResponse,
    QuestionnaireVersion,
)

logger = logging.getLogger(__name__)


# Status groupings for routing into the right sidebar tab
INBOX_STATUSES = ("pending", "in_review")  # the "Inbox" page (queries)
PRECASE_STATUSES = ("qualified", "letter_sent", "letter_signed", "paid")  # the "Pre-cases" page
TERMINAL_STATUSES = ("converted", "archived")


async def list_precases(
    db: AsyncSession, org_id: UUID, status_filter: Optional[str] = None, group: Optional[str] = None
) -> list[dict]:
    """List pre-cases. `group` is one of: inbox | precase | terminal | None (all)."""
    stmt = select(PreCase).where(PreCase.org_id == org_id)

    if status_filter:
        stmt = stmt.where(PreCase.status == status_filter)
    elif group == "inbox":
        stmt = stmt.where(PreCase.status.in_(INBOX_STATUSES))
    elif group == "precase":
        stmt = stmt.where(PreCase.status.in_(PRECASE_STATUSES))
    elif group == "terminal":
        stmt = stmt.where(PreCase.status.in_(TERMINAL_STATUSES))

    stmt = stmt.order_by(PreCase.created_at.desc())
    rows = (await db.execute(stmt)).scalars().all()

    items = []
    for pc in rows:
        client = None
        if pc.client_id:
            client = (await db.execute(select(Client).where(Client.id == pc.client_id))).scalar_one_or_none()
        response = None
        questionnaire_name = None
        if pc.response_id:
            response = (
                await db.execute(select(QuestionnaireResponse).where(QuestionnaireResponse.id == pc.response_id))
            ).scalar_one_or_none()
            if response:
                q = (
                    await db.execute(select(Questionnaire).where(Questionnaire.id == response.questionnaire_id))
                ).scalar_one_or_none()
                if q:
                    questionnaire_name = q.name
        items.append(
            {
                "id": pc.id,
                "status": pc.status,
                "ai_status": pc.ai_status,
                "ai_summary": pc.ai_summary,
                "ai_suggested_outcome": pc.ai_suggested_outcome,
                "ai_confidence": pc.ai_confidence,
                "questionnaire_name": questionnaire_name,
                "client_id": pc.client_id,
                "client_email": (response.submitter_email if response else (client.primary_email if client else None)),
                "client_name": (
                    response.submitter_name
                    if response and response.submitter_name
                    else (client.name if client else None)
                ),
                "submitted_at": response.submitted_at if response else None,
                "read_at": pc.read_at,
                "qualified_at": pc.qualified_at,
                "letter_sent_at": pc.letter_sent_at,
                "letter_signed_at": pc.letter_signed_at,
                "paid_at": pc.paid_at,
                "converted_at": pc.converted_at,
                "skipped_letter": pc.skipped_letter,
                "skipped_payment": pc.skipped_payment,
                "promoted_case_id": pc.promoted_case_id,
                "created_at": pc.created_at,
            }
        )
    return items


async def get_precase_detail(db: AsyncSession, org_id: UUID, precase_id: UUID) -> dict:
    pc = (
        await db.execute(select(PreCase).where(PreCase.id == precase_id, PreCase.org_id == org_id))
    ).scalar_one_or_none()
    if not pc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PreCase not found")

    client = None
    if pc.client_id:
        client = (await db.execute(select(Client).where(Client.id == pc.client_id))).scalar_one_or_none()

    response: Optional[QuestionnaireResponse] = None
    questionnaire: Optional[Questionnaire] = None
    fields: list = []
    if pc.response_id:
        response = (
            await db.execute(select(QuestionnaireResponse).where(QuestionnaireResponse.id == pc.response_id))
        ).scalar_one_or_none()
        if response:
            questionnaire = (
                await db.execute(select(Questionnaire).where(Questionnaire.id == response.questionnaire_id))
            ).scalar_one_or_none()
            version = (
                await db.execute(
                    select(QuestionnaireVersion).where(QuestionnaireVersion.id == response.version_id)
                )
            ).scalar_one_or_none()
            if version:
                fields = version.schema.get("fields", [])

    # Mark as read on first detail load (only if still in inbox state)
    if pc.read_at is None:
        pc.read_at = datetime.now(timezone.utc)
        if pc.status == "pending":
            pc.status = "in_review"
        await db.commit()
        await db.refresh(pc)

    return {
        "id": pc.id,
        "status": pc.status,
        "ai_status": pc.ai_status,
        "ai_summary": pc.ai_summary,
        "ai_suggested_outcome": pc.ai_suggested_outcome,
        "ai_extracted": pc.ai_extracted or {},
        "ai_confidence": pc.ai_confidence,
        "questionnaire_id": questionnaire.id if questionnaire else None,
        "questionnaire_name": questionnaire.name if questionnaire else None,
        "questionnaire_fields": fields,
        "client_id": pc.client_id,
        "client_email": (response.submitter_email if response else (client.primary_email if client else None)),
        "client_name": (
            response.submitter_name
            if response and response.submitter_name
            else (client.name if client else None)
        ),
        "answers": response.answers if response else {},
        "submitted_at": response.submitted_at if response else None,
        "promoted_case_id": pc.promoted_case_id,
        "qualified_at": pc.qualified_at,
        "letter_sent_at": pc.letter_sent_at,
        "letter_signed_at": pc.letter_signed_at,
        "paid_at": pc.paid_at,
        "converted_at": pc.converted_at,
        "skipped_letter": pc.skipped_letter,
        "skipped_payment": pc.skipped_payment,
        "created_at": pc.created_at,
    }


async def archive_precase(db: AsyncSession, org_id: UUID, precase_id: UUID) -> None:
    pc = (
        await db.execute(select(PreCase).where(PreCase.id == precase_id, PreCase.org_id == org_id))
    ).scalar_one_or_none()
    if not pc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PreCase not found")
    if pc.status == "converted":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot archive a converted pre-case (case is open)")
    pc.status = "archived"
    await db.commit()


async def qualify_precase(db: AsyncSession, org_id: UUID, precase_id: UUID, note: Optional[str] = None) -> dict:
    """Move pre-case from query state → qualified state (now visible in Pre-cases page)."""
    pc = (
        await db.execute(select(PreCase).where(PreCase.id == precase_id, PreCase.org_id == org_id))
    ).scalar_one_or_none()
    if not pc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PreCase not found")
    if pc.status not in INBOX_STATUSES + ("qualified",):
        # idempotent if already qualified, but error if past it
        if pc.status in PRECASE_STATUSES + TERMINAL_STATUSES:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Pre-case already past qualification (status={pc.status})",
            )
    pc.status = "qualified"
    if not pc.qualified_at:
        pc.qualified_at = datetime.now(timezone.utc)
    await db.commit()
    return await get_precase_detail(db, org_id, precase_id)


async def promote_to_case(
    db: AsyncSession, org_id: UUID, precase_id: UUID, seat_id: UUID
) -> UUID:
    """Create a Case from this PreCase (status=converted). Idempotent."""
    from app.agents.immigration.cases.models import Case

    pc = (
        await db.execute(select(PreCase).where(PreCase.id == precase_id, PreCase.org_id == org_id))
    ).scalar_one_or_none()
    if not pc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PreCase not found")
    if pc.promoted_case_id:
        return pc.promoted_case_id

    client = None
    if pc.client_id:
        client = (await db.execute(select(Client).where(Client.id == pc.client_id))).scalar_one_or_none()

    response = None
    if pc.response_id:
        response = (
            await db.execute(select(QuestionnaireResponse).where(QuestionnaireResponse.id == pc.response_id))
        ).scalar_one_or_none()

    client_name = (
        (response.submitter_name if response and response.submitter_name else None)
        or (client.name if client else None)
        or (response.submitter_email if response else "Unknown client")
    )
    client_email = (
        (response.submitter_email if response else None) or (client.primary_email if client else None)
    )

    visa_interest = None
    if pc.ai_extracted and isinstance(pc.ai_extracted, dict):
        visa_interest = pc.ai_extracted.get("visa_interest") or pc.ai_extracted.get("visa_subclass")

    case = Case(
        org_id=org_id,
        client_id=pc.client_id,
        pre_case_id=pc.id,
        client_name=client_name,
        client_email=client_email,
        client_phone=(client.phone if client else None),
        visa_subclass=visa_interest,
        stage="consultation",
        priority="normal",
        source="web_form",
        notes=pc.ai_summary,
    )
    db.add(case)
    await db.flush()

    pc.promoted_case_id = case.id
    pc.status = "converted"
    pc.converted_at = datetime.now(timezone.utc)
    await db.commit()
    return case.id


async def force_convert(
    db: AsyncSession,
    org_id: UUID,
    precase_id: UUID,
    seat_id: UUID,
    payload: dict,
) -> UUID:
    """Manual override: convert to case immediately, skipping any remaining gates.

    Records skipped_letter / skipped_payment with the reason for audit.
    """
    from app.agents.immigration.cases.models import Case

    pc = (
        await db.execute(select(PreCase).where(PreCase.id == precase_id, PreCase.org_id == org_id))
    ).scalar_one_or_none()
    if not pc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PreCase not found")
    if pc.promoted_case_id:
        return pc.promoted_case_id

    reason = payload["reason"]

    # Mark whatever gates were skipped
    if not pc.letter_signed_at:
        pc.skipped_letter = f"force_convert: {reason}"
    if not pc.paid_at:
        pc.skipped_payment = f"force_convert: {reason}"

    client = None
    if pc.client_id:
        client = (await db.execute(select(Client).where(Client.id == pc.client_id))).scalar_one_or_none()

    response = None
    if pc.response_id:
        response = (
            await db.execute(select(QuestionnaireResponse).where(QuestionnaireResponse.id == pc.response_id))
        ).scalar_one_or_none()

    client_name = (
        (response.submitter_name if response and response.submitter_name else None)
        or (client.name if client else None)
        or (response.submitter_email if response else "Unknown client")
    )
    client_email = (
        (response.submitter_email if response else None) or (client.primary_email if client else None)
    )

    case = Case(
        org_id=org_id,
        client_id=pc.client_id,
        pre_case_id=pc.id,
        client_name=client_name,
        client_email=client_email,
        client_phone=(client.phone if client else None),
        visa_subclass=payload.get("visa_subclass"),
        visa_name=payload.get("visa_name"),
        stage="consultation",
        priority="normal",
        source="manual",
        notes=f"Force-converted: {reason}\n\n{pc.ai_summary or ''}",
    )
    db.add(case)
    await db.flush()

    pc.promoted_case_id = case.id
    pc.status = "converted"
    pc.converted_at = datetime.now(timezone.utc)
    await db.commit()
    return case.id
