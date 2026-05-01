"""Auth schemas — signup, login, me."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    first_name: str
    last_name: Optional[str] = None
    firm_name: str = Field(min_length=1)
    promo_code: Optional[str] = None


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
