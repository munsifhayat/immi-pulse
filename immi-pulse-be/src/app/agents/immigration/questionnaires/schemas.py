"""Questionnaire schemas — builder + public submit."""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

FieldTypeLiteral = Literal[
    "short_text",
    "long_text",
    "yes_no",
    "single_select",
    "multi_select",
    "number",
    "date",
    "email",
    "phone",
]
AudienceLiteral = Literal["individual", "employer", "onshore", "offshore", "general"]


class QuestionField(BaseModel):
    key: str = Field(min_length=1)
    label: str = Field(min_length=1)
    type: FieldTypeLiteral
    required: bool = False
    options: Optional[list[str]] = None
    placeholder: Optional[str] = None
    helper_text: Optional[str] = None


class QuestionnaireSchema(BaseModel):
    fields: list[QuestionField] = Field(default_factory=list)


class QuestionnaireCreate(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None
    audience: AudienceLiteral = "general"
    fields: list[QuestionField] = Field(default_factory=list)


class QuestionnaireUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    audience: Optional[AudienceLiteral] = None
    is_active: Optional[bool] = None
    fields: Optional[list[QuestionField]] = None


class QuestionnaireOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    slug: str
    audience: str
    is_active: bool
    created_at: datetime
    fields: list[QuestionField] = Field(default_factory=list)
    response_count: int = 0
    public_url: Optional[str] = None


class QuestionnaireListItem(BaseModel):
    id: UUID
    name: str
    slug: str
    audience: str
    is_active: bool
    created_at: datetime
    field_count: int
    response_count: int


# Public submission

class PublicQuestionnaireOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    org_name: str
    fields: list[QuestionField]


class SubmitQuestionnaireRequest(BaseModel):
    submitter_email: EmailStr
    submitter_name: Optional[str] = None
    answers: dict[str, Any] = Field(default_factory=dict)


class SubmitQuestionnaireResponse(BaseModel):
    response_id: UUID
    pre_case_id: UUID
    message: str
