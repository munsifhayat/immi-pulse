"""Org + Seat + invite schemas."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    niche: Optional[str] = None
    omara_number: Optional[str] = None

    # Practice profile
    website: Optional[str] = None
    business_phone: Optional[str] = None
    contact_person: Optional[str] = None
    business_hours: Optional[str] = None
    social_links: Optional[dict[str, str]] = None

    # Australian payment + business details
    abn: Optional[str] = None
    bsb: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    payid: Optional[str] = None
    bpay_biller_code: Optional[str] = None


class SeatOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    invited_email: Optional[str] = None
    role: str
    status: str
    omara_number: Optional[str] = None
    invited_at: Optional[datetime] = None
    joined_at: Optional[datetime] = None

    # Optional human display
    user_email: Optional[str] = None
    user_name: Optional[str] = None

    class Config:
        from_attributes = True


class InviteCreate(BaseModel):
    email: EmailStr
    role: Literal["admin", "consultant", "staff"] = "consultant"


class InviteOut(BaseModel):
    id: UUID
    email: str
    role: str
    token: str
    expires_at: datetime
    invite_link: str

    class Config:
        from_attributes = True


class AcceptInviteRequest(BaseModel):
    token: str
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class PlanOut(BaseModel):
    tier: str
    name: str
    description: str
    price_per_seat_aud_monthly: int
    price_label: str
    is_default_signup: bool
    is_custom: bool
    features: list[str]


class BillingSummary(BaseModel):
    tier: str
    status: str
    plan_name: str
    price_label: str
    price_per_seat_aud_monthly: int
    is_custom: bool
    trial_ends_at: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    total_seats: int
    role_counts: dict[str, int]  # per-role counts for display only (not billing input)
    monthly_total_aud: int
    features: list[str]
    # Currently-applied pilot/promo (null when none). Lets the FE render the
    # "applied" pill and a reset action without a second round-trip.
    pilot_code: Optional[str] = None
    pilot_name: Optional[str] = None


class SelectPlanRequest(BaseModel):
    tier: Literal["starter", "pro", "enterprise"]


class RedeemPromoRequest(BaseModel):
    code: str


class RedeemPromoResponse(BaseModel):
    applied: bool
    already_applied: bool
    credits_added: int = 0
    pilot_name: Optional[str] = None
    billing: BillingSummary


class ResetPromoResponse(BaseModel):
    reset: bool
    billing: BillingSummary
