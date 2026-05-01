"""Org + Seat + invite schemas."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    niche: Optional[str] = None
    omara_number: Optional[str] = None


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
