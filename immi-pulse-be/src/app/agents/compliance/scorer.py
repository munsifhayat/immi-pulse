"""Compliance score calculation logic."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.compliance.models import (
    ComplianceObligation,
    PropertyComplianceProfile,
)
from app.agents.compliance.schemas import ComplianceSummaryOut, PropertyScoreOut

logger = logging.getLogger(__name__)

# Severity weights for compliance types — higher = more important for scoring
SEVERITY_WEIGHTS: dict[str, float] = {
    "pool_barrier": 3.0,
    "gas_safety": 2.5,
    "fire_safety": 2.5,
    "electrical_safety": 2.0,
    "smoke_alarm": 2.0,
    "asbestos": 2.0,
    "insurance": 1.5,
    "minimum_standards": 1.5,
    "council_notice": 1.5,
    "contractor_compliance": 1.0,
    "blind_cord_safety": 1.0,
    "body_corporate": 1.0,
    "general_compliance": 1.0,
    "water_efficiency": 0.5,
    "pest_inspection": 0.5,
    "energy_efficiency": 0.5,
}


async def calculate_property_score(
    db: AsyncSession, mailbox: str
) -> PropertyScoreOut:
    """Calculate compliance score for a single property."""
    result = await db.execute(
        select(ComplianceObligation)
        .where(ComplianceObligation.mailbox == mailbox)
        .order_by(ComplianceObligation.compliance_type)
    )
    obligations = result.scalars().all()

    if not obligations:
        # Get profile for display_name
        profile_result = await db.execute(
            select(PropertyComplianceProfile).where(
                PropertyComplianceProfile.mailbox == mailbox
            )
        )
        profile = profile_result.scalar_one_or_none()
        return PropertyScoreOut(
            mailbox=mailbox,
            display_name=profile.display_name if profile else None,
            score=100.0,
            total_obligations=0,
            compliant_count=0,
            non_compliant_count=0,
            expiring_count=0,
            unknown_count=0,
            obligations=[],
        )

    weighted_total = 0.0
    weighted_compliant = 0.0
    compliant_count = 0
    non_compliant_count = 0
    expiring_count = 0
    unknown_count = 0

    from app.agents.compliance.schemas import ComplianceObligationOut

    obligation_outs = []
    for ob in obligations:
        weight = ob.severity_weight or SEVERITY_WEIGHTS.get(ob.compliance_type, 1.0)
        weighted_total += weight

        if ob.status == "compliant":
            weighted_compliant += weight
            compliant_count += 1
        elif ob.status in ("non_compliant", "expired"):
            non_compliant_count += 1
        elif ob.status == "expiring":
            expiring_count += 1
            weighted_compliant += weight * 0.5  # Partial credit
        else:
            unknown_count += 1
            weighted_compliant += weight * 0.75  # Unknown gets benefit of doubt

        obligation_outs.append(ComplianceObligationOut.model_validate(ob))

    score = (weighted_compliant / weighted_total * 100.0) if weighted_total > 0 else 100.0

    # Get profile for display_name
    profile_result = await db.execute(
        select(PropertyComplianceProfile).where(
            PropertyComplianceProfile.mailbox == mailbox
        )
    )
    profile = profile_result.scalar_one_or_none()

    return PropertyScoreOut(
        mailbox=mailbox,
        display_name=profile.display_name if profile else None,
        score=round(score, 1),
        total_obligations=len(obligations),
        compliant_count=compliant_count,
        non_compliant_count=non_compliant_count,
        expiring_count=expiring_count,
        unknown_count=unknown_count,
        obligations=obligation_outs,
    )


async def calculate_portfolio_summary(db: AsyncSession) -> ComplianceSummaryOut:
    """Calculate portfolio-wide compliance summary."""
    from app.agents.compliance.models import ComplianceDetection

    # Get all unique mailboxes with obligations
    mailbox_result = await db.execute(
        select(ComplianceObligation.mailbox).distinct()
    )
    mailboxes = [row[0] for row in mailbox_result.all()]

    if not mailboxes:
        return ComplianceSummaryOut(
            portfolio_score=100.0,
            total_properties=0,
            properties_at_risk=0,
            upcoming_deadlines=0,
            detections_this_week=0,
        )

    # Calculate scores for all properties
    scores = []
    properties_at_risk = 0
    for mb in mailboxes:
        prop_score = await calculate_property_score(db, mb)
        scores.append(prop_score.score)
        if prop_score.non_compliant_count > 0 or prop_score.score < 70:
            properties_at_risk += 1

    portfolio_score = sum(scores) / len(scores) if scores else 100.0

    # Upcoming deadlines (within 30 days)
    now = datetime.now(timezone.utc)
    deadline_cutoff = now + timedelta(days=30)
    upcoming_count = await db.scalar(
        select(func.count())
        .select_from(ComplianceObligation)
        .where(
            ComplianceObligation.next_due.isnot(None),
            ComplianceObligation.next_due <= deadline_cutoff,
            ComplianceObligation.next_due >= now,
        )
    )

    # Detections this week
    week_ago = now - timedelta(days=7)
    detections_count = await db.scalar(
        select(func.count())
        .select_from(ComplianceDetection)
        .where(ComplianceDetection.created_at >= week_ago)
    )

    # By type and status breakdown
    type_status_result = await db.execute(
        select(
            ComplianceObligation.compliance_type,
            ComplianceObligation.status,
            func.count(),
        ).group_by(
            ComplianceObligation.compliance_type,
            ComplianceObligation.status,
        )
    )
    by_type_status: dict[str, dict[str, int]] = {}
    for comp_type, status, count in type_status_result.all():
        if comp_type not in by_type_status:
            by_type_status[comp_type] = {}
        by_type_status[comp_type][status] = count

    return ComplianceSummaryOut(
        portfolio_score=round(portfolio_score, 1),
        total_properties=len(mailboxes),
        properties_at_risk=properties_at_risk,
        upcoming_deadlines=upcoming_count or 0,
        detections_this_week=detections_count or 0,
        by_type_status=by_type_status,
    )
