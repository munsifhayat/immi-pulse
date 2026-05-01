"""PreCase schemas — inbox list + detail + decisions."""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class PreCaseListItem(BaseModel):
    id: UUID
    status: str
    ai_status: str
    ai_summary: Optional[str] = None
    ai_suggested_outcome: Optional[str] = None
    ai_confidence: Optional[float] = None
    questionnaire_name: Optional[str] = None
    client_id: Optional[UUID] = None
    client_email: Optional[str] = None
    client_name: Optional[str] = None
    submitted_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    created_at: datetime


class PreCaseDetail(BaseModel):
    id: UUID
    status: str
    ai_status: str
    ai_summary: Optional[str] = None
    ai_suggested_outcome: Optional[str] = None
    ai_extracted: Optional[dict[str, Any]] = None
    ai_confidence: Optional[float] = None
    questionnaire_id: Optional[UUID] = None
    questionnaire_name: Optional[str] = None
    questionnaire_fields: list[dict[str, Any]] = []
    client_id: Optional[UUID] = None
    client_email: Optional[str] = None
    client_name: Optional[str] = None
    answers: dict[str, Any] = {}
    submitted_at: Optional[datetime] = None
    promoted_case_id: Optional[UUID] = None
    created_at: datetime


class PromoteResponse(BaseModel):
    case_id: UUID


class PreCaseDecision(BaseModel):
    action: Literal["archive", "mark_unread", "mark_read"]
