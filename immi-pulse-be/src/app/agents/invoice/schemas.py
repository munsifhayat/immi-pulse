"""Invoice agent Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class InvoiceDetectionOut(BaseModel):
    id: UUID
    mailbox: str
    message_id: str
    thread_id: Optional[str] = None
    from_email: str
    from_name: Optional[str] = None
    subject: str
    received_at: datetime
    is_invoice: bool
    confidence_score: float
    ai_reasoning: Optional[str] = None
    attachment_names: list[str] = []
    detected_invoice_type: Optional[str] = None
    action: str
    moved_to_folder: Optional[str] = None
    moved_at: Optional[datetime] = None
    error_message: Optional[str] = None
    manually_reviewed: bool = False
    review_action: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class InvoiceReviewRequest(BaseModel):
    action: str  # "confirmed", "rejected", "moved_manually"


class InvoiceStatsOut(BaseModel):
    total_processed: int
    invoices_detected: int
    moved: int
    flagged: int
    accuracy_estimate: Optional[float] = None
    by_mailbox: dict[str, int] = {}
