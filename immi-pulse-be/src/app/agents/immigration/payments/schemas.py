"""Payments schemas."""

from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

PaymentMethodLiteral = Literal[
    "stripe_card",
    "stripe_becs",
    "bank_transfer",
    "payid",
    "bpay",
    "cash",
    "cheque",
    "waived",
    "other",
]


class RecordPaymentRequest(BaseModel):
    checkpoint_id: Optional[UUID] = None
    pre_case_id: Optional[UUID] = None
    case_id: Optional[UUID] = None
    method: PaymentMethodLiteral
    amount_aud: Decimal = Field(ge=0)
    reference: Optional[str] = Field(None, max_length=200)
    received_at: datetime
    notes: Optional[str] = Field(None, max_length=2000)


class PaymentRecordOut(BaseModel):
    id: UUID
    checkpoint_id: Optional[UUID] = None
    pre_case_id: Optional[UUID] = None
    case_id: Optional[UUID] = None
    method: str
    amount_aud: Decimal
    reference: Optional[str] = None
    received_at: datetime
    notes: Optional[str] = None
    receipt_number: Optional[str] = None
    created_at: datetime


class SkipPaymentRequest(BaseModel):
    """Manual override: skip the payment step entirely (e.g. relative case, pro-bono).

    Records a $0 'waived' payment row to maintain audit trail.
    """
    pre_case_id: UUID
    reason: str = Field(min_length=1, max_length=500)


class SkipPaymentResponse(BaseModel):
    payment_record_id: UUID
    pre_case_id: UUID
    new_status: str
