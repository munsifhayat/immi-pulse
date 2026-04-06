"""Compliance agent API endpoints."""

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.compliance.models import (
    ComplianceDetection,
    ComplianceObligation,
    PropertyComplianceProfile,
)
from app.agents.compliance.schemas import (
    ComplianceDetectionOut,
    ComplianceObligationCreate,
    ComplianceObligationOut,
    ComplianceObligationUpdate,
    ComplianceReviewRequest,
    ComplianceRuleOut,
    ComplianceStatsOut,
    ComplianceSummaryOut,
    CompleteObligationRequest,
    PropertyOnboardRequest,
    PropertyOnboardResponse,
    PropertyScoreOut,
    ScheduleObligationRequest,
)
from app.agents.compliance.scorer import (
    SEVERITY_WEIGHTS,
    calculate_portfolio_summary,
    calculate_property_score,
)
from app.agents.compliance.rules_engine import (
    create_obligations_for_property,
    get_rules_for_state,
    preview_obligations,
)
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/agents/compliance", tags=["Compliance"])


# --- Detection endpoints ---


@router.get("/detections", response_model=list[ComplianceDetectionOut])
async def list_detections(
    mailbox: Optional[str] = None,
    compliance_type: Optional[str] = None,
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(ComplianceDetection).order_by(
        ComplianceDetection.received_at.desc()
    )
    if mailbox:
        query = query.where(ComplianceDetection.mailbox == mailbox)
    if compliance_type:
        query = query.where(ComplianceDetection.compliance_type == compliance_type)
    if status:
        query = query.where(ComplianceDetection.status == status)
    if urgency:
        query = query.where(ComplianceDetection.urgency == urgency)
    if jurisdiction:
        query = query.where(ComplianceDetection.jurisdiction == jurisdiction)
    if from_date:
        query = query.where(
            ComplianceDetection.received_at
            >= datetime.combine(from_date, datetime.min.time())
        )
    if to_date:
        query = query.where(
            ComplianceDetection.received_at
            <= datetime.combine(to_date, datetime.max.time())
        )
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/detections/{detection_id}", response_model=ComplianceDetectionOut)
async def get_detection(detection_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ComplianceDetection).where(ComplianceDetection.id == detection_id)
    )
    detection = result.scalar_one_or_none()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")
    return detection


@router.post("/detections/{detection_id}/review")
async def review_detection(
    detection_id: UUID,
    body: ComplianceReviewRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ComplianceDetection).where(ComplianceDetection.id == detection_id)
    )
    detection = result.scalar_one_or_none()
    if not detection:
        raise HTTPException(status_code=404, detail="Detection not found")

    detection.manually_reviewed = True
    detection.review_action = body.action
    detection.review_notes = body.notes
    detection.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    return {"status": "ok", "review_action": body.action}


@router.get("/stats", response_model=ComplianceStatsOut)
async def get_stats(
    mailbox: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    base = select(func.count()).select_from(ComplianceDetection)
    if mailbox:
        base = base.where(ComplianceDetection.mailbox == mailbox)

    total = await db.scalar(base) or 0

    # By type
    type_q = await db.execute(
        select(ComplianceDetection.compliance_type, func.count())
        .where(ComplianceDetection.mailbox == mailbox if mailbox else True)
        .group_by(ComplianceDetection.compliance_type)
    )
    by_type = {row[0]: row[1] for row in type_q.all()}

    # By status
    status_q = await db.execute(
        select(ComplianceDetection.status, func.count())
        .where(ComplianceDetection.mailbox == mailbox if mailbox else True)
        .group_by(ComplianceDetection.status)
    )
    by_status = {row[0]: row[1] for row in status_q.all()}

    # By urgency
    urgency_q = await db.execute(
        select(ComplianceDetection.urgency, func.count())
        .where(ComplianceDetection.mailbox == mailbox if mailbox else True)
        .group_by(ComplianceDetection.urgency)
    )
    by_urgency = {row[0]: row[1] for row in urgency_q.all()}

    # By jurisdiction
    juris_q = await db.execute(
        select(ComplianceDetection.jurisdiction, func.count())
        .where(ComplianceDetection.mailbox == mailbox if mailbox else True)
        .group_by(ComplianceDetection.jurisdiction)
    )
    by_jurisdiction = {row[0] or "unknown": row[1] for row in juris_q.all()}

    critical_count = by_urgency.get("critical", 0)

    # Expiring soon (obligations within 30 days)
    from datetime import timedelta

    now = datetime.now(timezone.utc)
    expiring_soon = await db.scalar(
        select(func.count())
        .select_from(ComplianceObligation)
        .where(
            ComplianceObligation.next_due.isnot(None),
            ComplianceObligation.next_due <= now + timedelta(days=30),
            ComplianceObligation.next_due >= now,
        )
    ) or 0

    return ComplianceStatsOut(
        total_detected=total,
        by_type=by_type,
        by_status=by_status,
        by_urgency=by_urgency,
        by_jurisdiction=by_jurisdiction,
        critical_count=critical_count,
        expiring_soon=expiring_soon,
    )


# --- Obligation endpoints ---


@router.get("/obligations", response_model=list[ComplianceObligationOut])
async def list_obligations(
    mailbox: Optional[str] = None,
    compliance_type: Optional[str] = None,
    status: Optional[str] = None,
    jurisdiction: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    query = select(ComplianceObligation).order_by(
        ComplianceObligation.next_due.asc().nullslast()
    )
    if mailbox:
        query = query.where(ComplianceObligation.mailbox == mailbox)
    if compliance_type:
        query = query.where(ComplianceObligation.compliance_type == compliance_type)
    if status:
        query = query.where(ComplianceObligation.status == status)
    if jurisdiction:
        query = query.where(ComplianceObligation.jurisdiction == jurisdiction)
    query = query.limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/obligations/{obligation_id}", response_model=ComplianceObligationOut)
async def get_obligation(obligation_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ComplianceObligation).where(ComplianceObligation.id == obligation_id)
    )
    obligation = result.scalar_one_or_none()
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found")
    return obligation


@router.post("/obligations", response_model=ComplianceObligationOut)
async def create_obligation(
    body: ComplianceObligationCreate,
    db: AsyncSession = Depends(get_db),
):
    obligation = ComplianceObligation(
        id=uuid.uuid4(),
        mailbox=body.mailbox,
        compliance_type=body.compliance_type,
        jurisdiction=body.jurisdiction,
        status=body.status,
        next_due=body.next_due,
        certificate_reference=body.certificate_reference,
        notes=body.notes,
        severity_weight=SEVERITY_WEIGHTS.get(body.compliance_type, 1.0),
    )
    db.add(obligation)
    await db.commit()
    await db.refresh(obligation)
    return obligation


@router.put("/obligations/{obligation_id}", response_model=ComplianceObligationOut)
async def update_obligation(
    obligation_id: UUID,
    body: ComplianceObligationUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ComplianceObligation).where(ComplianceObligation.id == obligation_id)
    )
    obligation = result.scalar_one_or_none()
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(obligation, field, value)
    obligation.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(obligation)
    return obligation


# --- Property score endpoints ---


@router.get("/properties", response_model=list[PropertyScoreOut])
async def list_property_scores(db: AsyncSession = Depends(get_db)):
    # Get all mailboxes that have obligations or profiles
    mailbox_result = await db.execute(
        select(ComplianceObligation.mailbox).distinct()
    )
    mailboxes = [row[0] for row in mailbox_result.all()]

    scores = []
    for mb in mailboxes:
        score = await calculate_property_score(db, mb)
        scores.append(score)

    scores.sort(key=lambda s: s.score)
    return scores


@router.get("/properties/{mailbox}/score", response_model=PropertyScoreOut)
async def get_property_score(mailbox: str, db: AsyncSession = Depends(get_db)):
    return await calculate_property_score(db, mailbox)


# --- Summary endpoint ---


@router.get("/summary", response_model=ComplianceSummaryOut)
async def get_summary(db: AsyncSession = Depends(get_db)):
    return await calculate_portfolio_summary(db)


# --- Rules engine endpoints ---


@router.get("/rules/preview", response_model=list[ComplianceRuleOut])
async def preview_rules(
    state: str = Query(..., description="Australian state code"),
    has_pool: bool = Query(False),
    has_gas: bool = Query(False),
    property_age: str = Query("10-30"),
    property_type: str = Query("house"),
):
    """Preview which compliance obligations apply for a property."""
    rules = preview_obligations(state, has_pool, has_gas, property_age, property_type)
    return rules


@router.get("/rules/{state}", response_model=list[ComplianceRuleOut])
async def get_state_rules(state: str):
    """Get all compliance rules for a specific state."""
    rules = get_rules_for_state(state)
    if not rules:
        raise HTTPException(status_code=404, detail=f"No rules found for state: {state}")
    return rules


# --- Property onboarding ---


@router.post("/properties/onboard", response_model=PropertyOnboardResponse)
async def onboard_property(
    body: PropertyOnboardRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Onboard a new property: create profile + auto-generate all required obligations
    from the rules engine based on state and property features.
    """
    # Check if profile already exists
    existing = await db.execute(
        select(PropertyComplianceProfile).where(
            PropertyComplianceProfile.mailbox == body.mailbox
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Property profile already exists for {body.mailbox}",
        )

    # Create profile
    profile = PropertyComplianceProfile(
        id=uuid.uuid4(),
        mailbox=body.mailbox,
        display_name=body.display_name,
        property_address=body.address,
        jurisdiction=body.state,
        has_pool=body.has_pool,
        has_gas=body.has_gas,
        property_type=body.property_type,
    )
    db.add(profile)

    # Generate obligations from rules engine
    obligations = create_obligations_for_property(
        state=body.state,
        mailbox=body.mailbox,
        has_pool=body.has_pool,
        has_gas=body.has_gas,
        property_age=body.property_age,
        property_type=body.property_type,
    )
    for ob in obligations:
        db.add(ob)

    await db.commit()
    await db.refresh(profile)

    # Calculate initial score
    score = await calculate_property_score(db, body.mailbox)

    from app.agents.compliance.schemas import PropertyComplianceProfileOut

    return PropertyOnboardResponse(
        profile=PropertyComplianceProfileOut.model_validate(profile),
        obligations_created=len(obligations),
        score=score.score,
    )


# --- Obligation lifecycle ---


@router.post(
    "/obligations/{obligation_id}/complete",
    response_model=ComplianceObligationOut,
)
async def complete_obligation(
    obligation_id: UUID,
    body: CompleteObligationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Mark an obligation as compliant (e.g., inspection passed, certificate received)."""
    result = await db.execute(
        select(ComplianceObligation).where(ComplianceObligation.id == obligation_id)
    )
    obligation = result.scalar_one_or_none()
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found")

    now = datetime.now(timezone.utc)
    obligation.status = "compliant"
    obligation.last_checked = now
    obligation.updated_at = now

    if body.certificate_reference:
        obligation.certificate_reference = body.certificate_reference
    if body.notes:
        obligation.notes = body.notes

    # Set next_due: use provided date, or auto-calculate from rules engine frequency
    if body.next_due:
        obligation.next_due = body.next_due
    else:
        # Look up the rule frequency to auto-calculate
        from app.agents.compliance.rules_engine import COMPLIANCE_RULES

        rule_key = (obligation.jurisdiction, obligation.compliance_type)
        rule = COMPLIANCE_RULES.get(rule_key)
        if rule and rule.frequency_months:
            obligation.next_due = now + timedelta(days=rule.frequency_months * 30)

    await db.commit()
    await db.refresh(obligation)
    return obligation


@router.post(
    "/obligations/{obligation_id}/schedule",
    response_model=ComplianceObligationOut,
)
async def schedule_obligation(
    obligation_id: UUID,
    body: ScheduleObligationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Schedule an inspection/check for an obligation."""
    result = await db.execute(
        select(ComplianceObligation).where(ComplianceObligation.id == obligation_id)
    )
    obligation = result.scalar_one_or_none()
    if not obligation:
        raise HTTPException(status_code=404, detail="Obligation not found")

    obligation.status = "scheduled"
    obligation.next_due = body.next_due
    obligation.updated_at = datetime.now(timezone.utc)
    if body.notes:
        obligation.notes = body.notes

    await db.commit()
    await db.refresh(obligation)
    return obligation
