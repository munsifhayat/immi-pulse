"""Pydantic schemas for the Cases feature (consultant + client portal)."""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.agents.immigration.cases.models import (
    CASE_PRIORITIES,
    CASE_SOURCES,
    CASE_STAGES,
    DOCUMENT_STATUSES,
)

CaseStageLiteral = Literal[
    "inquiry",
    "consultation",
    "visa_pathway",
    "checklist",
    "document_collection",
    "document_review",
    "application_prep",
    "lodgement",
    "post_lodgement",
    "decision",
]
CasePriorityLiteral = Literal["low", "normal", "high", "urgent"]
CaseSourceLiteral = Literal["email", "manual", "web_form"]
DocumentStatusLiteral = Literal["pending", "validated", "flagged", "rejected"]


# Sanity checks — keep enum values in sync with models.py at import time.
assert set(CASE_STAGES) == set(CaseStageLiteral.__args__)
assert set(CASE_PRIORITIES) == set(CasePriorityLiteral.__args__)
assert set(CASE_SOURCES) == set(CaseSourceLiteral.__args__)
assert set(DOCUMENT_STATUSES) == set(DocumentStatusLiteral.__args__)


# --- Case CRUD ---------------------------------------------------------------


class CaseAISummary(BaseModel):
    """AI-generated summary of the inbound email / inquiry."""

    summary: str
    key_points: list[str] = Field(default_factory=list)
    proposed_visa_subclass: Optional[str] = None
    proposed_visa_name: Optional[str] = None
    confidence: Optional[float] = None
    reasoning: Optional[str] = None
    extracted_details: dict[str, Any] = Field(default_factory=dict)
    source_email: Optional[dict[str, Any]] = None


class ChecklistItem(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    document_type: str
    required: bool = True
    status: Literal["pending", "uploaded", "validated", "flagged"] = "pending"
    document_id: Optional[UUID] = None
    notes: Optional[str] = None


class CreateCaseRequest(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    visa_subclass: Optional[str] = None
    visa_name: Optional[str] = None
    stage: CaseStageLiteral = "inquiry"
    priority: CasePriorityLiteral = "normal"
    source: CaseSourceLiteral = "manual"
    notes: Optional[str] = None
    ai_summary: Optional[CaseAISummary] = None
    checklist: Optional[list[ChecklistItem]] = None


class UpdateCaseRequest(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    visa_subclass: Optional[str] = None
    visa_name: Optional[str] = None
    stage: Optional[CaseStageLiteral] = None
    priority: Optional[CasePriorityLiteral] = None
    consultant_id: Optional[UUID] = None
    lodgement_date: Optional[datetime] = None
    decision_date: Optional[datetime] = None
    notes: Optional[str] = None


class CaseOut(BaseModel):
    id: UUID
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    consultant_id: Optional[UUID] = None
    visa_subclass: Optional[str] = None
    visa_name: Optional[str] = None
    stage: CaseStageLiteral
    priority: CasePriorityLiteral
    source: CaseSourceLiteral
    source_message_id: Optional[str] = None
    lodgement_date: Optional[datetime] = None
    decision_date: Optional[datetime] = None
    notes: Optional[str] = None
    documents_count: int = 0
    documents_pending: int = 0
    ai_summary: Optional[CaseAISummary] = None
    checklist: Optional[list[ChecklistItem]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Case documents ----------------------------------------------------------


class CaseDocumentOut(BaseModel):
    id: UUID
    case_id: UUID
    document_type: Optional[str] = None
    file_name: str
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    uploaded_by_type: Literal["client", "consultant"]
    uploaded_at: datetime
    status: DocumentStatusLiteral
    ai_analysis: Optional[dict[str, Any]] = None
    reviewed_at: Optional[datetime] = None
    review_notes: Optional[str] = None

    model_config = {"from_attributes": True}


class ReviewDocumentRequest(BaseModel):
    status: Literal["validated", "flagged", "rejected"]
    review_notes: Optional[str] = None


class DocumentDownloadUrlOut(BaseModel):
    url: str
    expires_in_seconds: int


# --- Timeline ----------------------------------------------------------------


class CaseTimelineEventOut(BaseModel):
    id: UUID
    case_id: UUID
    actor_type: Literal["system", "consultant", "client"]
    actor_user_id: Optional[UUID] = None
    event_type: str
    event_payload: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Portal link -------------------------------------------------------------


class GeneratePortalLinkRequest(BaseModel):
    send_email: bool = Field(
        default=True,
        description="If true, email the link+PIN to the client via Microsoft Graph.",
    )
    expires_in_days: Optional[int] = Field(
        default=None,
        description="Override default token lifetime (server-side capped).",
        ge=1,
        le=30,
    )


class GeneratePortalLinkResponse(BaseModel):
    url: str
    pin: str
    expires_at: datetime
    token_id: UUID
    email_sent: bool


# --- Client portal -----------------------------------------------------------


class PortalVerifyRequest(BaseModel):
    token: str
    pin: str = Field(min_length=6, max_length=6)


class PortalVerifyResponse(BaseModel):
    session_jwt: str
    expires_at: datetime
    case_id: UUID


class PortalCaseOut(BaseModel):
    """Trimmed case view shown to the client — omits consultant internals."""

    id: UUID
    client_name: str
    visa_subclass: Optional[str] = None
    visa_name: Optional[str] = None
    stage: CaseStageLiteral
    documents: list[CaseDocumentOut]
    checklist: Optional[list[ChecklistItem]] = None

    model_config = {"from_attributes": True}


# --- Checklist --------------------------------------------------------------


class GenerateChecklistRequest(BaseModel):
    visa_subclass: Optional[str] = Field(
        default=None,
        description="Override the case's visa_subclass when picking a template.",
    )


class UpdateChecklistItemRequest(BaseModel):
    status: Optional[Literal["pending", "uploaded", "validated", "flagged"]] = None
    document_id: Optional[UUID] = None
    notes: Optional[str] = None
