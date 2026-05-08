"""Clients service — list/get/create/patch/history/send-questionnaire/open-case-direct.

A "client" is a global identity (primary_email keyed). Per-org context lives
in ClientOrgLink. Queries within this service are always scoped via the link.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.cases.models import Case
from app.agents.immigration.clients.models import Client, ClientOrgLink
from app.agents.immigration.precases.models import PreCase
from app.agents.immigration.questionnaires.models import (
    Questionnaire,
    QuestionnaireResponse,
)
from app.core.config import get_settings

logger = logging.getLogger(__name__)


# Statuses that count as "raw query" (in inbox)
QUERY_STATUSES = ("pending", "in_review")
# Statuses that count as "qualified precase" (in pre-cases page)
PRECASE_STATUSES = ("qualified", "letter_sent", "letter_signed", "paid")


async def _scoped_clients(db: AsyncSession, org_id: UUID, search: Optional[str] = None) -> list[tuple[Client, ClientOrgLink]]:
    """Return [(Client, ClientOrgLink)] for clients linked to this org, optionally filtered by search."""
    stmt = (
        select(Client, ClientOrgLink)
        .join(ClientOrgLink, ClientOrgLink.client_id == Client.id)
        .where(ClientOrgLink.org_id == org_id)
    )
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                Client.primary_email.ilike(like),
                Client.name.ilike(like),
                Client.phone.ilike(like),
            )
        )
    stmt = stmt.order_by(Client.created_at.desc())
    rows = (await db.execute(stmt)).all()
    return [(c, link) for c, link in rows]


async def list_clients(db: AsyncSession, org_id: UUID, search: Optional[str] = None) -> list[dict]:
    pairs = await _scoped_clients(db, org_id, search)
    if not pairs:
        return []

    client_ids = [c.id for c, _ in pairs]

    # Fetch all precases + cases for these clients in this org, in two queries
    precases = (
        await db.execute(
            select(PreCase).where(
                PreCase.org_id == org_id,
                PreCase.client_id.in_(client_ids),
            )
        )
    ).scalars().all()
    cases = (
        await db.execute(
            select(Case).where(
                Case.org_id == org_id,
                Case.client_id.in_(client_ids),
            )
        )
    ).scalars().all()

    # Group by client_id
    pc_by_client: dict[UUID, list[PreCase]] = {}
    for pc in precases:
        pc_by_client.setdefault(pc.client_id, []).append(pc)
    case_by_client: dict[UUID, list[Case]] = {}
    for c in cases:
        case_by_client.setdefault(c.client_id, []).append(c)

    items = []
    for client, link in pairs:
        pcs = pc_by_client.get(client.id, [])
        cs = case_by_client.get(client.id, [])
        query_count = sum(1 for pc in pcs if pc.status in QUERY_STATUSES)
        precase_count = sum(1 for pc in pcs if pc.status in PRECASE_STATUSES)
        archived_count = sum(1 for pc in pcs if pc.status == "archived")
        case_count = len(cs)

        # latest activity = most recent updated_at across all entities
        latest_dt = client.updated_at
        latest_status = "none"
        for pc in pcs:
            if pc.updated_at and (not latest_dt or pc.updated_at > latest_dt):
                latest_dt = pc.updated_at
                if pc.status in QUERY_STATUSES:
                    latest_status = "query"
                elif pc.status in PRECASE_STATUSES:
                    latest_status = "precase"
        for c in cs:
            if c.updated_at and (not latest_dt or c.updated_at > latest_dt):
                latest_dt = c.updated_at
                latest_status = "case"

        items.append(
            {
                "id": client.id,
                "primary_email": client.primary_email,
                "name": client.name,
                "phone": client.phone,
                "country": client.country,
                "first_seen_at": link.first_seen_at,
                "last_activity_at": latest_dt,
                "query_count": query_count,
                "precase_count": precase_count,
                "case_count": case_count,
                "archived_count": archived_count,
                "latest_status": latest_status,
            }
        )
    return items


async def _resolve_client_in_org(db: AsyncSession, org_id: UUID, client_id: UUID) -> tuple[Client, ClientOrgLink]:
    pair = (
        await db.execute(
            select(Client, ClientOrgLink)
            .join(ClientOrgLink, ClientOrgLink.client_id == Client.id)
            .where(Client.id == client_id, ClientOrgLink.org_id == org_id)
        )
    ).first()
    if not pair:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found in this org")
    return pair[0], pair[1]


async def get_client_detail(db: AsyncSession, org_id: UUID, client_id: UUID) -> dict:
    client, link = await _resolve_client_in_org(db, org_id, client_id)

    precases = (
        await db.execute(
            select(PreCase)
            .where(PreCase.org_id == org_id, PreCase.client_id == client_id)
            .order_by(PreCase.created_at.desc())
        )
    ).scalars().all()
    cases = (
        await db.execute(
            select(Case)
            .where(Case.org_id == org_id, Case.client_id == client_id)
            .order_by(Case.created_at.desc())
        )
    ).scalars().all()

    queries = []
    qualified = []
    for pc in precases:
        item = {
            "id": pc.id,
            "status": pc.status,
            "ai_summary": pc.ai_summary,
            "ai_suggested_outcome": pc.ai_suggested_outcome,
            "created_at": pc.created_at,
            "updated_at": pc.updated_at,
            "promoted_case_id": pc.promoted_case_id,
        }
        if pc.status in QUERY_STATUSES:
            queries.append(item)
        elif pc.status in PRECASE_STATUSES:
            qualified.append(item)
        # archived precases included in history but not in either tab list

    case_items = [
        {
            "id": c.id,
            "stage": c.stage,
            "priority": c.priority,
            "visa_subclass": c.visa_subclass,
            "visa_name": c.visa_name,
            "client_name": c.client_name,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        }
        for c in cases
    ]

    # Build chronological history
    history: list[dict] = []
    for pc in precases:
        history.append(
            {
                "kind": "query",
                "occurred_at": pc.created_at,
                "title": "Submitted query",
                "detail": pc.ai_summary[:200] if pc.ai_summary else None,
                "ref_id": pc.id,
            }
        )
        if pc.qualified_at:
            history.append(
                {
                    "kind": "precase",
                    "occurred_at": pc.qualified_at,
                    "title": "Marked qualified",
                    "detail": None,
                    "ref_id": pc.id,
                }
            )
        if pc.letter_sent_at:
            history.append(
                {
                    "kind": "letter_sent",
                    "occurred_at": pc.letter_sent_at,
                    "title": "Engagement letter sent",
                    "detail": None,
                    "ref_id": pc.id,
                }
            )
        if pc.letter_signed_at:
            history.append(
                {
                    "kind": "letter_signed",
                    "occurred_at": pc.letter_signed_at,
                    "title": "Letter signed",
                    "detail": pc.skipped_letter or None,
                    "ref_id": pc.id,
                }
            )
        if pc.paid_at:
            history.append(
                {
                    "kind": "payment",
                    "occurred_at": pc.paid_at,
                    "title": "Retainer received" if not pc.skipped_payment else "Payment skipped",
                    "detail": pc.skipped_payment,
                    "ref_id": pc.id,
                }
            )
        if pc.converted_at:
            history.append(
                {
                    "kind": "case_opened",
                    "occurred_at": pc.converted_at,
                    "title": "Case opened",
                    "detail": None,
                    "ref_id": pc.promoted_case_id,
                }
            )
    for c in cases:
        history.append(
            {
                "kind": "case_stage",
                "occurred_at": c.updated_at or c.created_at,
                "title": f"Case · {c.stage}",
                "detail": c.visa_subclass,
                "ref_id": c.id,
            }
        )

    history.sort(key=lambda h: h["occurred_at"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

    return {
        "id": client.id,
        "primary_email": client.primary_email,
        "name": client.name,
        "phone": client.phone,
        "country": client.country,
        "first_seen_at": link.first_seen_at,
        "created_at": client.created_at,
        "queries": queries,
        "precases": qualified,
        "cases": case_items,
        "history": history,
    }


async def create_client(db: AsyncSession, org_id: UUID, payload: dict) -> dict:
    """Manually create a client (or attach an existing global Client to this org)."""
    email = payload["primary_email"].lower().strip()
    existing = (
        await db.execute(select(Client).where(Client.primary_email == email))
    ).scalar_one_or_none()

    if existing:
        client = existing
        # Maybe enrich with new info
        if payload.get("name") and not client.name:
            client.name = payload["name"]
        if payload.get("phone") and not client.phone:
            client.phone = payload["phone"]
        if payload.get("country") and not client.country:
            client.country = payload["country"]
    else:
        client = Client(
            primary_email=email,
            name=payload.get("name"),
            phone=payload.get("phone"),
            country=payload.get("country"),
        )
        db.add(client)
        await db.flush()

    link = (
        await db.execute(
            select(ClientOrgLink).where(
                ClientOrgLink.client_id == client.id,
                ClientOrgLink.org_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if not link:
        link = ClientOrgLink(
            client_id=client.id,
            org_id=org_id,
            status="active",
            first_seen_at=datetime.now(timezone.utc),
        )
        db.add(link)

    await db.commit()
    await db.refresh(client)

    return {
        "id": client.id,
        "primary_email": client.primary_email,
        "name": client.name,
        "phone": client.phone,
        "country": client.country,
        "first_seen_at": link.first_seen_at,
        "last_activity_at": client.updated_at,
        "query_count": 0,
        "precase_count": 0,
        "case_count": 0,
        "archived_count": 0,
        "latest_status": "none",
    }


async def patch_client(db: AsyncSession, org_id: UUID, client_id: UUID, payload: dict) -> dict:
    client, _link = await _resolve_client_in_org(db, org_id, client_id)
    if "name" in payload:
        client.name = payload["name"]
    if "phone" in payload:
        client.phone = payload["phone"]
    if "country" in payload:
        client.country = payload["country"]
    await db.commit()
    return await get_client_detail(db, org_id, client_id)


async def send_questionnaire_link(
    db: AsyncSession, org_id: UUID, client_id: UUID, questionnaire_id: UUID, personal_note: Optional[str]
) -> dict:
    """Generate the public link + a note. v1 returns the link to copy; later: actual email send."""
    client, _ = await _resolve_client_in_org(db, org_id, client_id)
    q = (
        await db.execute(
            select(Questionnaire).where(
                Questionnaire.id == questionnaire_id,
                Questionnaire.org_id == org_id,
                Questionnaire.is_active == True,  # noqa: E712
            )
        )
    ).scalar_one_or_none()
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Questionnaire not found or inactive")

    settings = get_settings()
    base = settings.frontend_url.rstrip("/") if settings.frontend_url else "http://localhost:3000"
    public_link = f"{base}/q/{q.slug}?email={client.primary_email}"
    note_text = personal_note or (
        f"Hi {client.name or 'there'}, please complete this short intake form so we can review your case."
    )

    # NOTE: v1 returns link for the consultant to copy. Email integration is deferred.
    return {"public_link": public_link, "note": note_text}


async def open_case_direct(
    db: AsyncSession,
    org_id: UUID,
    client_id: UUID,
    seat_id: UUID,
    payload: dict,
) -> UUID:
    """Manual override: open a Case for this client without going through the pre-case ladder.

    Use cases: relative case (no payment), walk-in client signed paper engagement,
    consultant has already done all the work outside the system.
    """
    client, _ = await _resolve_client_in_org(db, org_id, client_id)

    case = Case(
        org_id=org_id,
        client_id=client.id,
        pre_case_id=None,
        client_name=client.name or client.primary_email,
        client_email=client.primary_email,
        client_phone=client.phone,
        visa_subclass=payload.get("visa_subclass"),
        visa_name=payload.get("visa_name"),
        stage="consultation",
        priority="normal",
        source="manual",
        notes=(
            f"Manual case opened (skip reason: {payload.get('skip_reason')})\n\n{payload.get('notes') or ''}"
            if payload.get("skip_reason")
            else payload.get("notes")
        ),
    )
    db.add(case)
    await db.flush()
    case_id = case.id
    await db.commit()
    return case_id
