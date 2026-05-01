"""PreCase service — list, detail, archive, mark read, retrigger AI."""

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


async def list_precases(db: AsyncSession, org_id: UUID, status_filter: Optional[str] = None) -> list[dict]:
    stmt = select(PreCase).where(PreCase.org_id == org_id)
    if status_filter:
        stmt = stmt.where(PreCase.status == status_filter)
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
                "client_name": (response.submitter_name if response and response.submitter_name else (client.name if client else None)),
                "submitted_at": response.submitted_at if response else None,
                "read_at": pc.read_at,
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

    # Mark as read on first detail load
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
        "client_name": (response.submitter_name if response and response.submitter_name else (client.name if client else None)),
        "answers": response.answers if response else {},
        "submitted_at": response.submitted_at if response else None,
        "promoted_case_id": pc.promoted_case_id,
        "created_at": pc.created_at,
    }


async def archive_precase(db: AsyncSession, org_id: UUID, precase_id: UUID) -> None:
    pc = (
        await db.execute(select(PreCase).where(PreCase.id == precase_id, PreCase.org_id == org_id))
    ).scalar_one_or_none()
    if not pc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "PreCase not found")
    pc.status = "archived"
    await db.commit()


async def promote_to_case(db: AsyncSession, org_id: UUID, precase_id: UUID, seat_id: UUID) -> UUID:
    """Create a Case from this PreCase. Returns the new case_id."""
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
    pc.status = "promoted"
    await db.commit()
    return case.id
