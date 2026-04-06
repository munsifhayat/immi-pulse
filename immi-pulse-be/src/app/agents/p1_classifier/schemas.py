"""P1 Classifier Pydantic schemas."""

from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class P1JobOut(BaseModel):
    id: UUID
    mailbox: str
    message_id: str
    thread_id: Optional[str] = None
    from_email: str
    from_name: Optional[str] = None
    subject: str
    received_at: datetime
    priority: str
    is_urgent: bool
    confidence_score: float
    ai_reasoning: Optional[str] = None
    category: Optional[str] = None
    client_name: Optional[str] = None
    contract_location: Optional[str] = None
    job_description: Optional[str] = None
    ai_summary: Optional[str] = None
    response_deadline: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    is_responded: bool = False
    is_overdue: bool = False
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class P1StatusUpdate(BaseModel):
    status: str  # "responded", "resolved", "escalated"


class DailySummaryOut(BaseModel):
    id: UUID
    summary_date: date
    summary_time: time
    summary_type: str
    total_p1_jobs: Optional[int] = None
    responded_count: Optional[int] = None
    overdue_count: Optional[int] = None
    summary_table: list[dict] = []
    summary_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class P1StatsOut(BaseModel):
    total_p1: int
    responded_in_sla: int
    overdue: int
    avg_response_time_minutes: Optional[float] = None
    by_client: dict[str, int] = {}
