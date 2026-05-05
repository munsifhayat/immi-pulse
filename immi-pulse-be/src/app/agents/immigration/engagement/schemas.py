"""Schemas for engagement letter templates, letters, and signing."""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Templates ───────────────────────────────────────────────────────────────

class FeeDefaults(BaseModel):
    professional_fee: Optional[Decimal] = Field(default=Decimal("0"), ge=0)
    disbursements: Optional[Decimal] = Field(default=Decimal("0"), ge=0)
    retainer: Optional[Decimal] = Field(default=Decimal("0"), ge=0)
    currency: str = "AUD"


class TemplateCreate(BaseModel):
    name: str = Field(default="Standard engagement letter", max_length=200)
    body_md: str = Field(min_length=1)
    fee_defaults: Optional[FeeDefaults] = None
    is_default: bool = True


class TemplatePatch(BaseModel):
    name: Optional[str] = Field(default=None, max_length=200)
    body_md: Optional[str] = None
    fee_defaults: Optional[FeeDefaults] = None
    is_default: Optional[bool] = None


class TemplateOut(BaseModel):
    id: UUID
    org_id: UUID
    name: str
    body_md: str
    fee_defaults: Optional[dict] = None
    is_default: bool
    created_at: datetime
    updated_at: Optional[datetime] = None


# ── Letters ────────────────────────────────────────────────────────────────

class FeeLine(BaseModel):
    label: str = Field(max_length=200)
    amount_aud: Decimal = Field(ge=0)
    kind: Literal["professional_fee", "disbursement", "retainer", "balance", "other"] = "other"


class ComposeLetterRequest(BaseModel):
    template_id: Optional[UUID] = None  # None → use the org's default template
    visa_subclass: Optional[str] = None
    visa_name: Optional[str] = None
    scope: Optional[str] = Field(default=None, max_length=2000)
    fee_lines: list[FeeLine] = Field(default_factory=list)
    extra_md: Optional[str] = Field(default=None, description="Custom paragraph appended to template body", max_length=4000)


class SendLetterRequest(BaseModel):
    """Render + send. Returns the public sign URL + PIN for the consultant to share."""
    compose: ComposeLetterRequest
    expires_in_days: int = Field(default=14, ge=1, le=60)


class SendLetterResponse(BaseModel):
    letter_id: UUID
    sign_url: str
    sign_pin: str  # plaintext, returned ONCE to the consultant; bcrypt-hashed in DB
    expires_at: datetime


class MarkSignedManuallyRequest(BaseModel):
    """Manual override: consultant attests letter was signed offline (paper, video call, etc.)"""
    signer_name: str = Field(min_length=1, max_length=200)
    method: Literal["manual_upload", "consultant_attest"] = "consultant_attest"
    reason: str = Field(min_length=1, max_length=500)
    uploaded_pdf_s3_key: Optional[str] = None  # if a paper PDF was uploaded


class LetterOut(BaseModel):
    id: UUID
    pre_case_id: UUID
    template_id: Optional[UUID] = None
    rendered_body_md: str
    fee_lines: list[dict] = Field(default_factory=list)
    status: str
    sent_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    sign_url: Optional[str] = None  # only when consultant calls "get send-info"
    sign_link_expires_at: Optional[datetime] = None
    created_at: datetime


# ── Public signing portal ──────────────────────────────────────────────────

class PublicLetterView(BaseModel):
    letter_id: UUID
    firm_name: str
    omara_number: Optional[str] = None
    abn: Optional[str] = None
    rendered_body_md: str
    rendered_html: Optional[str] = None
    fee_lines: list[dict]
    status: str  # "sent" | "signed" | "voided"


class PublicSignRequest(BaseModel):
    pin: str = Field(min_length=6, max_length=6)
    consent_given: bool
    signer_name: str = Field(min_length=1, max_length=200)
    method: Literal["typed_name", "drawn"]
    signature_image_b64: Optional[str] = None  # required when method == "drawn"


class PublicSignResponse(BaseModel):
    success: bool
    signed_at: datetime
    download_url: Optional[str] = None  # signed PDF download (future)
