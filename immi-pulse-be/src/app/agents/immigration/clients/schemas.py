"""Schemas for the Clients API."""

from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class ClientListItem(BaseModel):
    id: UUID
    primary_email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    last_activity_at: Optional[datetime] = None
    query_count: int = 0
    precase_count: int = 0
    case_count: int = 0
    archived_count: int = 0
    latest_status: Optional[str] = None  # query | precase | case | none


class ClientCreate(BaseModel):
    primary_email: EmailStr
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=40)
    country: Optional[str] = Field(None, max_length=80)


class ClientPatch(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    phone: Optional[str] = Field(None, max_length=40)
    country: Optional[str] = Field(None, max_length=80)


class ClientHistoryItem(BaseModel):
    kind: Literal["query", "precase", "letter_sent", "letter_signed", "payment", "case_opened", "case_stage", "manual_note"]
    occurred_at: datetime
    title: str
    detail: Optional[str] = None
    ref_id: Optional[UUID] = None  # foreign key into the relevant table (precase_id, case_id, etc.)


class ClientDetail(BaseModel):
    id: UUID
    primary_email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    first_seen_at: Optional[datetime] = None
    created_at: datetime

    queries: list[dict]            # list of inbox/precase summaries
    precases: list[dict]           # qualified precases
    cases: list[dict]              # opened cases
    history: list[ClientHistoryItem]


class SendQuestionnaireRequest(BaseModel):
    questionnaire_id: UUID
    personal_note: Optional[str] = Field(None, max_length=2000)


class SendQuestionnaireResponse(BaseModel):
    public_link: str
    note: str


class OpenCaseDirectRequest(BaseModel):
    """Manual override: skip the entire pre-case ladder, just open a case for this client.

    Used when consultant has already engaged with the client offline (e.g. relative
    case, walk-in, paper engagement signed in person).
    """
    visa_subclass: Optional[str] = Field(None, max_length=20)
    visa_name: Optional[str] = Field(None, max_length=120)
    notes: Optional[str] = Field(None, max_length=4000)
    skip_reason: Optional[str] = Field(None, max_length=500)


class OpenCaseDirectResponse(BaseModel):
    case_id: UUID
