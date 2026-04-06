"""Compliance agent Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


# --- Detection schemas ---


class ComplianceDetectionOut(BaseModel):
    id: UUID
    mailbox: str
    message_id: str
    thread_id: Optional[str] = None
    from_email: str
    from_name: Optional[str] = None
    subject: str
    received_at: datetime
    compliance_type: str
    jurisdiction: Optional[str] = None
    property_address: Optional[str] = None
    status: str
    deadline: Optional[datetime] = None
    required_action: Optional[str] = None
    certificate_reference: Optional[str] = None
    urgency: str
    confidence_score: float
    ai_reasoning: Optional[str] = None
    action: str
    manually_reviewed: bool = False
    review_action: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ComplianceReviewRequest(BaseModel):
    action: str  # "confirmed", "rejected", "dismissed"
    notes: Optional[str] = None


class ComplianceStatsOut(BaseModel):
    total_detected: int
    by_type: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_urgency: dict[str, int] = {}
    by_jurisdiction: dict[str, int] = {}
    critical_count: int = 0
    expiring_soon: int = 0


# --- Obligation schemas ---


class ComplianceObligationOut(BaseModel):
    id: UUID
    mailbox: str
    compliance_type: str
    jurisdiction: str
    status: str
    last_checked: Optional[datetime] = None
    next_due: Optional[datetime] = None
    certificate_reference: Optional[str] = None
    source_email_id: Optional[str] = None
    source_detection_id: Optional[UUID] = None
    notes: Optional[str] = None
    severity_weight: float = 1.0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ComplianceObligationCreate(BaseModel):
    mailbox: str
    compliance_type: str
    jurisdiction: str = "unknown"
    status: str = "unknown"
    next_due: Optional[datetime] = None
    certificate_reference: Optional[str] = None
    notes: Optional[str] = None


class ComplianceObligationUpdate(BaseModel):
    status: Optional[str] = None
    next_due: Optional[datetime] = None
    certificate_reference: Optional[str] = None
    notes: Optional[str] = None
    jurisdiction: Optional[str] = None


# --- Property profile schemas ---


class PropertyComplianceProfileOut(BaseModel):
    id: UUID
    mailbox: str
    display_name: Optional[str] = None
    property_address: Optional[str] = None
    jurisdiction: Optional[str] = None
    property_age_years: Optional[int] = None
    has_pool: bool = False
    has_gas: bool = False
    has_fire_system: bool = False
    property_type: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PropertyComplianceProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    property_address: Optional[str] = None
    jurisdiction: Optional[str] = None
    property_age_years: Optional[int] = None
    has_pool: Optional[bool] = None
    has_gas: Optional[bool] = None
    has_fire_system: Optional[bool] = None
    property_type: Optional[str] = None
    notes: Optional[str] = None


# --- Score & summary schemas ---


class PropertyScoreOut(BaseModel):
    mailbox: str
    display_name: Optional[str] = None
    score: float
    total_obligations: int
    compliant_count: int
    non_compliant_count: int
    expiring_count: int
    unknown_count: int
    obligations: list[ComplianceObligationOut] = []


class ComplianceSummaryOut(BaseModel):
    portfolio_score: float
    total_properties: int
    properties_at_risk: int
    upcoming_deadlines: int
    detections_this_week: int
    by_type_status: dict[str, dict[str, int]] = {}


# --- Onboarding schemas ---


class PropertyOnboardRequest(BaseModel):
    mailbox: str
    state: str  # QLD, NSW, VIC, SA, WA, TAS, ACT, NT
    has_pool: bool = False
    has_gas: bool = False
    property_age: str = "10-30"  # new | 1-10 | 10-30 | 30+
    property_type: str = "house"  # house | apartment | townhouse | unit
    display_name: Optional[str] = None
    address: Optional[str] = None


class ComplianceRuleOut(BaseModel):
    compliance_type: str
    state: str
    required: bool
    frequency_months: Optional[int] = None
    requires_certificate: bool
    penalty_range: str
    legislation_ref: str
    description: str


class PropertyOnboardResponse(BaseModel):
    profile: PropertyComplianceProfileOut
    obligations_created: int
    score: float


# --- Obligation lifecycle schemas ---


class CompleteObligationRequest(BaseModel):
    certificate_reference: Optional[str] = None
    next_due: Optional[datetime] = None
    notes: Optional[str] = None


class ScheduleObligationRequest(BaseModel):
    next_due: datetime
    notes: Optional[str] = None
