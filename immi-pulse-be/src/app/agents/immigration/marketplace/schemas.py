"""Pydantic schemas for the Agents Marketplace feature."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.agents.immigration.marketplace.models import (
    AGENT_PROFILE_STATUSES,
    AGENT_PROFILE_TIERS,
    LISTING_TYPES,
)

AgentProfileStatusLiteral = Literal[
    "pending_review", "approved", "rejected", "suspended"
]
AgentProfileTierLiteral = Literal["verified", "recommended", "highly_recommended"]
ListingTypeLiteral = Literal["individual", "company"]

# Keep literals in sync with models.py at import time.
assert set(AGENT_PROFILE_STATUSES) == set(AgentProfileStatusLiteral.__args__)
assert set(AGENT_PROFILE_TIERS) == set(AgentProfileTierLiteral.__args__)
assert set(LISTING_TYPES) == set(ListingTypeLiteral.__args__)


# --- Apply / Update --------------------------------------------------------


class ApplyAgentProfileRequest(BaseModel):
    # Applicant identity (so we can create a User row if needed).
    email: str
    first_name: str
    last_name: str

    # Profile payload.
    listing_type: ListingTypeLiteral = "individual"
    firm_name: Optional[str] = None
    omara_number: str = Field(min_length=3, max_length=32)
    bio: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    specializations: Optional[list[str]] = None
    languages: Optional[list[str]] = None
    years_experience: Optional[int] = Field(default=None, ge=0, le=60)
    consultation_fee: Optional[float] = Field(default=None, ge=0)
    response_time_hours: Optional[int] = Field(default=None, ge=0, le=720)


class UpdateAgentProfileRequest(BaseModel):
    listing_type: Optional[ListingTypeLiteral] = None
    firm_name: Optional[str] = None
    omara_number: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    specializations: Optional[list[str]] = None
    languages: Optional[list[str]] = None
    years_experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    response_time_hours: Optional[int] = None


# --- Admin actions ---------------------------------------------------------


class ApproveAgentProfileRequest(BaseModel):
    tier: AgentProfileTierLiteral = "verified"
    featured: bool = False


class RejectAgentProfileRequest(BaseModel):
    reason: str


class SetTierRequest(BaseModel):
    tier: AgentProfileTierLiteral


class AdminAddAgentRequest(BaseModel):
    """Admin can directly add a consultant to the marketplace."""
    email: str
    first_name: str
    last_name: str
    listing_type: ListingTypeLiteral = "individual"
    firm_name: Optional[str] = None
    omara_number: str = Field(min_length=3, max_length=32)
    bio: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    specializations: Optional[list[str]] = None
    languages: Optional[list[str]] = None
    years_experience: Optional[int] = Field(default=None, ge=0, le=60)
    consultation_fee: Optional[float] = Field(default=None, ge=0)
    response_time_hours: Optional[int] = Field(default=None, ge=0, le=720)
    tier: AgentProfileTierLiteral = "verified"
    featured: bool = False


# --- Responses -------------------------------------------------------------


class AgentProfileOut(BaseModel):
    id: UUID
    user_id: UUID
    listing_type: str
    firm_name: Optional[str] = None
    omara_number: str
    bio: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    specializations: Optional[list[str]] = None
    languages: Optional[list[str]] = None
    years_experience: Optional[int] = None
    consultation_fee: Optional[float] = None
    response_time_hours: Optional[int] = None
    tier: AgentProfileTierLiteral
    status: AgentProfileStatusLiteral
    featured: bool
    avatar_color: Optional[str] = None
    rating: float
    review_count: int
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Flattened user fields (included in responses so the frontend can show
    # the agent name without a second query).
    display_name: Optional[str] = None
    email: Optional[str] = None

    model_config = {"from_attributes": True}


class ApplyAgentProfileResponse(BaseModel):
    profile: AgentProfileOut
    message: str = "Application submitted. You'll be notified once reviewed."
