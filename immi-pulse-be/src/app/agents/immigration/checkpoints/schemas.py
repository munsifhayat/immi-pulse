"""Checkpoint schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

CheckpointTypeLiteral = Literal[
    "consultation_fee",
    "retainer",
    "milestone",
    "lodgement_fee",
    "custom",
]
CheckpointStatusLiteral = Literal["draft", "sent", "paid", "refunded", "waived", "canceled"]


class CheckpointCreate(BaseModel):
    case_id: Optional[UUID] = None
    pre_case_id: Optional[UUID] = None
    type: CheckpointTypeLiteral = "custom"
    title: str = Field(min_length=1)
    description: Optional[str] = None
    amount_aud: Decimal = Field(ge=0)
    blocking: bool = False


class CheckpointOut(BaseModel):
    id: UUID
    case_id: Optional[UUID] = None
    pre_case_id: Optional[UUID] = None
    type: str
    title: str
    description: Optional[str] = None
    amount_aud: Decimal
    blocking: bool
    status: str
    payment_link_url: Optional[str] = None
    sent_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
