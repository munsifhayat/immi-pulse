"""Auth schemas — signup, login, me."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str
    last_name: Optional[str] = None
    firm_name: str = Field(min_length=1)
    phone: Optional[str] = None
    promo_code: Optional[str] = None

    # Step 2 (optional) — practice profile captured during signup so we can render
    # the firm's public profile without forcing a follow-up settings trip.
    website: Optional[str] = None
    business_phone: Optional[str] = None
    contact_person: Optional[str] = None
    business_hours: Optional[str] = None
    social_links: Optional[dict[str, str]] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: UUID
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    class Config:
        from_attributes = True


class OrgOut(BaseModel):
    id: UUID
    name: str
    niche: Optional[str] = None
    omara_number: Optional[str] = None
    country: str

    # Practice profile (captured at signup Step 2)
    website: Optional[str] = None
    business_phone: Optional[str] = None
    contact_person: Optional[str] = None
    business_hours: Optional[str] = None
    social_links: Optional[dict[str, str]] = None

    # Australian payment + business details (optional — fill in Settings → Bank & ABN)
    abn: Optional[str] = None
    bsb: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_account_name: Optional[str] = None
    payid: Optional[str] = None
    bpay_biller_code: Optional[str] = None

    class Config:
        from_attributes = True


class SubscriptionOut(BaseModel):
    tier: str
    status: str
    seat_count: int
    trial_ends_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WalletOut(BaseModel):
    balance: int
    monthly_grant: int

    class Config:
        from_attributes = True


class SeatOut(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    role: str
    status: str
    invited_email: Optional[str] = None
    omara_number: Optional[str] = None

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    token: str
    user: UserOut
    org: OrgOut
    seat: SeatOut
    subscription: SubscriptionOut
    wallet: WalletOut


class MeResponse(BaseModel):
    user: UserOut
    org: OrgOut
    seat: SeatOut
    subscription: SubscriptionOut
    wallet: WalletOut
