"""Pydantic schemas for the client portal (public) + consultant credential views."""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ── Consultant-facing: the "Client access" card ──────────────────────────────


class ClientAccessOut(BaseModel):
    """What the consultant sees after qualify / on the pre-case right rail.

    `temp_password` is present only while the account still has an unredeemed
    temporary password (cleared once the client sets their own).
    """

    account_id: UUID
    client_id: UUID
    email: str
    temp_password: Optional[str] = None
    status: str
    must_reset: bool
    last_login_at: Optional[datetime] = None
    portal_path: str           # e.g. /portal/gideon-james-migration
    portal_url: str            # absolute, frontend-origin
    share_message: str


# ── Public portal: auth ──────────────────────────────────────────────────────


class PortalOrgInfo(BaseModel):
    org_slug: str
    firm_name: str
    omara_number: Optional[str] = None


class PortalLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class PortalMeOut(BaseModel):
    account_id: UUID
    email: str
    name: Optional[str] = None
    status: str
    must_reset: bool
    firm_name: str
    org_slug: str


class PortalLoginResponse(BaseModel):
    access_token: str
    expires_at: datetime
    must_reset: bool
    account: PortalMeOut


class SetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class SimpleOk(BaseModel):
    ok: bool = True
    message: Optional[str] = None


# ── Public portal: applications ──────────────────────────────────────────────


class PortalFact(BaseModel):
    label: str
    value: str


class PortalTodo(BaseModel):
    type: Literal["sign", "upload", "respond", "info"]
    title: str
    subtitle: Optional[str] = None
    done: bool = False


class PortalChecklistItem(BaseModel):
    id: str
    label: str
    description: Optional[str] = None
    document_type: Optional[str] = None
    required: bool = False
    status: str = "pending"
    document_id: Optional[UUID] = None


class PortalDocument(BaseModel):
    id: UUID
    file_name: str
    document_type: Optional[str] = None
    status: str
    uploaded_by_type: str
    uploaded_at: Optional[datetime] = None


class PortalLetterInfo(BaseModel):
    letter_id: UUID
    status: str
    can_sign: bool
    rendered_body_md: str
    fee_lines: list[dict[str, Any]] = []
    firm_name: str
    omara_number: Optional[str] = None
    abn: Optional[str] = None
    sent_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None


class PortalTimelineItem(BaseModel):
    key: str
    title: str
    date: Optional[datetime] = None
    hint: Optional[str] = None
    state: Literal["done", "now", "future"]


class PortalApplicationSummary(BaseModel):
    application_id: UUID          # the pre-case id (stable spine)
    case_id: Optional[UUID] = None
    title: str
    subclass: Optional[str] = None
    stage_label: str
    status: str                   # combined precase/case status
    progress_pct: int
    step_index: int
    step_total: int
    needs_count: int
    is_complete: bool
    updated_at: Optional[datetime] = None


class PortalApplicationDetail(PortalApplicationSummary):
    summary_text: Optional[str] = None
    facts: list[PortalFact] = []
    todos: list[PortalTodo] = []
    letter: Optional[PortalLetterInfo] = None
    checklist: list[PortalChecklistItem] = []
    documents: list[PortalDocument] = []
    timeline: list[PortalTimelineItem] = []


class PortalSignRequest(BaseModel):
    signer_name: str = Field(min_length=1, max_length=200)
    method: Literal["typed_name", "drawn"] = "typed_name"
    signature_image_b64: Optional[str] = None
    consent_given: bool


class PortalSignResponse(BaseModel):
    success: bool
    signed_at: datetime
