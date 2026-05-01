"""Questionnaire service — CRUD, publish, and public submission."""

import logging
import re
import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.clients.models import Client, ClientOrgLink
from app.agents.immigration.orgs.models import Organization
from app.agents.immigration.precases.models import PreCase
from app.agents.immigration.questionnaires.models import (
    Questionnaire,
    QuestionnaireResponse,
    QuestionnaireVersion,
)
from app.agents.immigration.questionnaires.schemas import (
    QuestionField,
    QuestionnaireCreate,
    QuestionnaireUpdate,
    SubmitQuestionnaireRequest,
)

logger = logging.getLogger(__name__)


def _slugify(value: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return s or "form"


async def _unique_slug(db: AsyncSession, base: str) -> str:
    candidate = base
    n = 0
    while True:
        existing = (
            await db.execute(select(Questionnaire).where(Questionnaire.slug == candidate))
        ).scalar_one_or_none()
        if not existing:
            return candidate
        n += 1
        candidate = f"{base}-{n}"


async def list_questionnaires(db: AsyncSession, org_id: UUID) -> list[dict]:
    rows = (
        await db.execute(
            select(Questionnaire).where(Questionnaire.org_id == org_id).order_by(Questionnaire.created_at.desc())
        )
    ).scalars().all()
    out = []
    for q in rows:
        version = (
            await db.execute(
                select(QuestionnaireVersion).where(
                    QuestionnaireVersion.id == q.current_version_id
                )
            )
        ).scalar_one_or_none()
        field_count = len(version.schema.get("fields", [])) if version else 0
        response_count = (
            await db.execute(
                select(func.count(QuestionnaireResponse.id)).where(
                    QuestionnaireResponse.questionnaire_id == q.id
                )
            )
        ).scalar() or 0
        out.append(
            {
                "id": q.id,
                "name": q.name,
                "slug": q.slug,
                "audience": q.audience,
                "is_active": q.is_active,
                "created_at": q.created_at,
                "field_count": field_count,
                "response_count": response_count,
            }
        )
    return out


async def get_questionnaire(db: AsyncSession, org_id: UUID, q_id: UUID) -> dict:
    q = (
        await db.execute(
            select(Questionnaire).where(Questionnaire.id == q_id, Questionnaire.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Questionnaire not found")
    version = (
        await db.execute(
            select(QuestionnaireVersion).where(QuestionnaireVersion.id == q.current_version_id)
        )
    ).scalar_one_or_none()
    fields = version.schema.get("fields", []) if version else []
    response_count = (
        await db.execute(
            select(func.count(QuestionnaireResponse.id)).where(
                QuestionnaireResponse.questionnaire_id == q.id
            )
        )
    ).scalar() or 0
    return {
        "id": q.id,
        "name": q.name,
        "description": q.description,
        "slug": q.slug,
        "audience": q.audience,
        "is_active": q.is_active,
        "created_at": q.created_at,
        "fields": fields,
        "response_count": response_count,
    }


async def create_questionnaire(
    db: AsyncSession, org_id: UUID, seat_id: UUID, payload: QuestionnaireCreate
) -> dict:
    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one_or_none()
    base = f"{_slugify(org.name)}-{_slugify(payload.name)}" if org else _slugify(payload.name)
    slug = await _unique_slug(db, base)

    q = Questionnaire(
        org_id=org_id,
        name=payload.name,
        description=payload.description,
        slug=slug,
        audience=payload.audience,
        is_active=True,
        created_by_seat_id=seat_id,
    )
    db.add(q)
    await db.flush()

    fields = [f.model_dump() for f in payload.fields]
    version = QuestionnaireVersion(
        questionnaire_id=q.id,
        version_no=1,
        schema={"fields": fields},
        published_at=datetime.now(timezone.utc),
    )
    db.add(version)
    await db.flush()
    q.current_version_id = version.id
    await db.commit()
    await db.refresh(q)

    return await get_questionnaire(db, org_id, q.id)


async def update_questionnaire(
    db: AsyncSession, org_id: UUID, q_id: UUID, payload: QuestionnaireUpdate
) -> dict:
    q = (
        await db.execute(
            select(Questionnaire).where(Questionnaire.id == q_id, Questionnaire.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Questionnaire not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        q.name = data["name"]
    if "description" in data:
        q.description = data["description"]
    if "audience" in data:
        q.audience = data["audience"]
    if "is_active" in data:
        q.is_active = data["is_active"]

    if "fields" in data and data["fields"] is not None:
        # Bump to a new version snapshot
        last = (
            await db.execute(
                select(QuestionnaireVersion)
                .where(QuestionnaireVersion.questionnaire_id == q.id)
                .order_by(QuestionnaireVersion.version_no.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        next_no = (last.version_no + 1) if last else 1
        version = QuestionnaireVersion(
            questionnaire_id=q.id,
            version_no=next_no,
            schema={"fields": data["fields"]},
            published_at=datetime.now(timezone.utc),
        )
        db.add(version)
        await db.flush()
        q.current_version_id = version.id

    await db.commit()
    await db.refresh(q)
    return await get_questionnaire(db, org_id, q.id)


async def delete_questionnaire(db: AsyncSession, org_id: UUID, q_id: UUID) -> None:
    q = (
        await db.execute(
            select(Questionnaire).where(Questionnaire.id == q_id, Questionnaire.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Questionnaire not found")
    await db.delete(q)
    await db.commit()


# --- Public submission ---


async def get_public_questionnaire(db: AsyncSession, slug: str) -> dict:
    q = (
        await db.execute(select(Questionnaire).where(Questionnaire.slug == slug, Questionnaire.is_active.is_(True)))
    ).scalar_one_or_none()
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Questionnaire not found")
    version = (
        await db.execute(
            select(QuestionnaireVersion).where(QuestionnaireVersion.id == q.current_version_id)
        )
    ).scalar_one_or_none()
    fields = version.schema.get("fields", []) if version else []
    org = (await db.execute(select(Organization).where(Organization.id == q.org_id))).scalar_one_or_none()
    return {
        "id": q.id,
        "name": q.name,
        "description": q.description,
        "org_name": org.name if org else "",
        "fields": fields,
    }


async def submit_public_questionnaire(
    db: AsyncSession,
    slug: str,
    payload: SubmitQuestionnaireRequest,
    ip_address: Optional[str],
    user_agent: Optional[str],
) -> dict:
    q = (
        await db.execute(select(Questionnaire).where(Questionnaire.slug == slug, Questionnaire.is_active.is_(True)))
    ).scalar_one_or_none()
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Questionnaire not found")

    email = payload.submitter_email.lower().strip()

    # Resolve / create Client
    client = (await db.execute(select(Client).where(Client.primary_email == email))).scalar_one_or_none()
    if not client:
        client = Client(primary_email=email, name=payload.submitter_name)
        db.add(client)
        await db.flush()
    else:
        if not client.name and payload.submitter_name:
            client.name = payload.submitter_name

    # Resolve / create ClientOrgLink
    link = (
        await db.execute(
            select(ClientOrgLink).where(
                ClientOrgLink.client_id == client.id, ClientOrgLink.org_id == q.org_id
            )
        )
    ).scalar_one_or_none()
    if not link:
        link = ClientOrgLink(
            client_id=client.id,
            org_id=q.org_id,
            status="active",
            first_seen_at=datetime.now(timezone.utc),
        )
        db.add(link)
        await db.flush()

    # Save response
    response = QuestionnaireResponse(
        questionnaire_id=q.id,
        version_id=q.current_version_id,
        org_id=q.org_id,
        client_id=client.id,
        answers=payload.answers,
        submitter_email=email,
        submitter_name=payload.submitter_name,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(response)
    await db.flush()

    # Create PreCase (status pending; AI runs in background later)
    precase = PreCase(
        org_id=q.org_id,
        client_id=client.id,
        response_id=response.id,
        source="questionnaire",
        status="pending",
        ai_status="pending",
    )
    db.add(precase)
    await db.commit()
    await db.refresh(precase)

    # Trigger async AI triage (best-effort, fail-open)
    try:
        from app.agents.immigration.precases.triage import run_triage_async
        run_triage_async(precase.id)
    except Exception as exc:  # pragma: no cover
        logger.warning(f"Failed to schedule triage for precase {precase.id}: {exc}")

    return {
        "response_id": response.id,
        "pre_case_id": precase.id,
        "message": "Thanks — we'll be in touch shortly.",
    }
