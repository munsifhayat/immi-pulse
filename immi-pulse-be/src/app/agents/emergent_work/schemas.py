"""Emergent Work Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class EmergentWorkItemOut(BaseModel):
    id: UUID
    mailbox: str
    source_message_ids: list[str] = []
    thread_id: Optional[str] = None
    subject: str
    client_name: Optional[str] = None
    contract_reference: Optional[str] = None
    original_scope_summary: Optional[str] = None
    emergent_work_description: Optional[str] = None
    supporting_evidence: Optional[list[dict]] = None
    confidence_score: float
    ai_reasoning: Optional[str] = None
    recommended_action: Optional[str] = None
    processed_attachments: list[dict] = []
    status: str
    raised_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmergentWorkStatusUpdate(BaseModel):
    status: str  # "raised", "resolved", "dismissed"


class EmergentWorkReportOut(BaseModel):
    id: UUID
    report_time: datetime
    period_start: datetime
    period_end: datetime
    items_detected: Optional[int] = None
    summary_table: list[dict] = []
    summary_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class EmergentWorkStatsOut(BaseModel):
    total_detected: int
    raised: int
    resolved: int
    dismissed: int
    by_client: dict[str, int] = {}
