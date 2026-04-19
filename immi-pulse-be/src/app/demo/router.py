"""Demo-only API for the lawyer showcase.

Exposes:
  GET  /demo/inbox                  — the stable mock email inbox
  POST /demo/emails/{id}/create-case — create a real case seeded from the email
  POST /demo/reset                  — wipe demo-sourced cases so the demo can re-run
  GET  /demo/status                 — current state (how many emails linked, etc.)

These endpoints sit behind the X-API-Key middleware so only the consultant
dashboard can call them.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.cases.models import Case
from app.agents.immigration.cases.schemas import (
    CaseAISummary,
    CaseOut,
    ChecklistItem,
    CreateCaseRequest,
)
from app.agents.immigration.cases.service import CaseService
from app.agents.immigration.cases.checklist_templates import get_template
from app.db.session import get_db
from app.demo.inbox_data import DEMO_EMAILS, get_demo_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo", tags=["Demo"])


class InboxEmailOut(BaseModel):
    id: str
    from_name: str
    from_email: str
    subject: str
    preview: str
    body: str
    received_at: str
    has_attachments: bool
    is_read: bool
    classification: Optional[dict[str, Any]] = None
    ai_summary: Optional[CaseAISummary] = None
    case_defaults: Optional[dict[str, Any]] = None
    linked_case_id: Optional[str] = None


class CreateCaseFromEmailRequest(BaseModel):
    assign_checklist: bool = True


class ResetResponse(BaseModel):
    deleted_cases: int


async def _linked_case_for_email(db: AsyncSession, email_id: str) -> Optional[Case]:
    result = await db.execute(
        select(Case).where(Case.source_message_id == email_id)
    )
    return result.scalars().first()


@router.get("/inbox", response_model=list[InboxEmailOut])
async def list_demo_inbox(db: AsyncSession = Depends(get_db)):
    payload: list[InboxEmailOut] = []
    for email in DEMO_EMAILS:
        linked = await _linked_case_for_email(db, email["id"])
        payload.append(
            InboxEmailOut(
                id=email["id"],
                from_name=email["from_name"],
                from_email=email["from_email"],
                subject=email["subject"],
                preview=email["preview"],
                body=email["body"],
                received_at=email["received_at"],
                has_attachments=email["has_attachments"],
                is_read=email["is_read"],
                classification=email.get("classification"),
                ai_summary=(
                    CaseAISummary.model_validate(email["ai_summary"])
                    if email.get("ai_summary")
                    else None
                ),
                case_defaults=email.get("case_defaults"),
                linked_case_id=str(linked.id) if linked else None,
            )
        )
    return payload


@router.post(
    "/emails/{email_id}/create-case",
    response_model=CaseOut,
)
async def create_case_from_email(
    email_id: str,
    payload: CreateCaseFromEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    email = get_demo_email(email_id)
    if email is None:
        raise HTTPException(status_code=404, detail="Demo email not found")
    if not email.get("case_defaults"):
        raise HTTPException(
            status_code=400, detail="This email is not an immigration inquiry"
        )

    existing = await _linked_case_for_email(db, email_id)
    if existing is not None:
        # Idempotent — return the existing case instead of creating a duplicate.
        total, pending = await CaseService.count_documents(db, existing.id)
        out = CaseOut.model_validate(existing)
        out.documents_count = total
        out.documents_pending = pending
        metadata = existing.metadata_json or {}
        if metadata.get("ai_summary"):
            out.ai_summary = CaseAISummary.model_validate(metadata["ai_summary"])
        if metadata.get("checklist"):
            out.checklist = [
                ChecklistItem.model_validate(item) for item in metadata["checklist"]
            ]
        return out

    defaults = email["case_defaults"]
    ai_summary = (
        CaseAISummary.model_validate(email["ai_summary"])
        if email.get("ai_summary")
        else None
    )
    checklist_items: Optional[list[ChecklistItem]] = None
    if payload.assign_checklist and defaults.get("visa_subclass"):
        template = get_template(defaults["visa_subclass"])
        checklist_items = [ChecklistItem.model_validate(item) for item in template]

    create_req = CreateCaseRequest(
        client_name=defaults["client_name"],
        client_email=defaults.get("client_email"),
        client_phone=defaults.get("client_phone"),
        visa_subclass=defaults.get("visa_subclass"),
        visa_name=defaults.get("visa_name"),
        stage=defaults.get("stage", "consultation"),
        priority=defaults.get("priority", "normal"),
        source=defaults.get("source", "email"),
        notes=defaults.get("notes"),
        ai_summary=ai_summary,
        checklist=checklist_items,
    )
    case = await CaseService.create_case(
        db,
        create_req,
        source_message_id=email["id"],
        source_mailbox="demo-inbox",
    )
    await db.commit()
    await db.refresh(case)

    total, pending = await CaseService.count_documents(db, case.id)
    out = CaseOut.model_validate(case)
    out.documents_count = total
    out.documents_pending = pending
    out.ai_summary = ai_summary
    out.checklist = checklist_items
    return out


@router.post("/reset", response_model=ResetResponse)
async def reset_demo(db: AsyncSession = Depends(get_db)):
    """Delete any cases created from the demo inbox so the walkthrough can be re-run."""
    email_ids = [email["id"] for email in DEMO_EMAILS]
    if not email_ids:
        return ResetResponse(deleted_cases=0)

    result = await db.execute(
        select(Case).where(Case.source_message_id.in_(email_ids))
    )
    cases = list(result.scalars().all())
    count = len(cases)
    for case in cases:
        await db.delete(case)
    await db.commit()
    logger.info(f"Demo reset removed {count} case(s).")
    return ResetResponse(deleted_cases=count)


@router.get("/status")
async def demo_status(db: AsyncSession = Depends(get_db)):
    email_ids = [email["id"] for email in DEMO_EMAILS]
    result = await db.execute(
        select(Case).where(Case.source_message_id.in_(email_ids))
    )
    linked = list(result.scalars().all())
    return {
        "total_emails": len(DEMO_EMAILS),
        "linked_cases": len(linked),
        "linked": [
            {
                "email_id": c.source_message_id,
                "case_id": str(c.id),
                "client": c.client_name,
                "stage": c.stage,
            }
            for c in linked
        ],
    }
