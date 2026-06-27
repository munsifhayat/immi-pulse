"""Questionnaire schemas — builder + public submit."""

from datetime import datetime
from typing import Any, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator

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
OperatorLiteral = Literal[
    "equals",
    "not_equals",
    "is_one_of",
    "is_not_one_of",
    "is_empty",
    "is_not_empty",
    "contains",
]
VisibilityModeLiteral = Literal["always", "show_if", "hide_if"]
OutcomeFlagLiteral = Literal["urgent", "disqualified", "qualified", "more_info"]


class Rule(BaseModel):
    """A single condition referencing another field's value."""

    field_key: str = Field(min_length=1)
    operator: OperatorLiteral
    value: Optional[Any] = None


class VisibilityConfig(BaseModel):
    """Visibility config — when this field appears on the form."""

    mode: VisibilityModeLiteral = "always"
    rules: list[Rule] = Field(default_factory=list)


class FieldLogic(BaseModel):
    """Conditional behaviour wrapper attached to a field."""

    visibility: VisibilityConfig = Field(default_factory=VisibilityConfig)
    required_if: list[Rule] = Field(default_factory=list)


class QuestionField(BaseModel):
    key: str = Field(min_length=1)
    label: str = Field(min_length=1)
    type: FieldTypeLiteral
    required: bool = False
    options: Optional[list[str]] = None
    placeholder: Optional[str] = None
    helper_text: Optional[str] = None
    logic: Optional[FieldLogic] = None
    flags: Optional[list[OutcomeFlagLiteral]] = None


class QuestionnaireSchema(BaseModel):
    fields: list[QuestionField] = Field(default_factory=list)


def _validate_rule_references(fields: list[QuestionField]) -> None:
    """Every Rule.field_key must reference a field that exists in this form
    AND appears *earlier* than the field carrying the rule. Prevents both
    typos and forward-references that would let a field control its own
    visibility in a cycle.
    """
    keys_seen: set[str] = set()
    seen_keys: set[str] = set()

    # First pass — verify unique keys.
    for f in fields:
        if f.key in seen_keys:
            raise ValueError(f"Duplicate field key: {f.key}")
        seen_keys.add(f.key)

    # Second pass — verify rule references.
    for f in fields:
        all_rules: list[Rule] = []
        if f.logic:
            all_rules.extend(f.logic.visibility.rules)
            all_rules.extend(f.logic.required_if)
        for r in all_rules:
            if r.field_key == f.key:
                raise ValueError(
                    f"Field '{f.key}' has a rule referencing itself"
                )
            if r.field_key not in seen_keys:
                raise ValueError(
                    f"Field '{f.key}' has a rule referencing unknown key "
                    f"'{r.field_key}'"
                )
            if r.field_key not in keys_seen:
                raise ValueError(
                    f"Field '{f.key}' has a rule referencing '{r.field_key}', "
                    "which appears later in the form. Move the controlling "
                    "field above this one."
                )
        keys_seen.add(f.key)


class QuestionnaireCreate(BaseModel):
    name: str = Field(min_length=1)
    description: Optional[str] = None
    audience: AudienceLiteral = "general"
    fields: list[QuestionField] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check_rules(self) -> "QuestionnaireCreate":
        _validate_rule_references(self.fields)
        return self


class QuestionnaireUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    audience: Optional[AudienceLiteral] = None
    is_active: Optional[bool] = None
    fields: Optional[list[QuestionField]] = None

    @model_validator(mode="after")
    def _check_rules(self) -> "QuestionnaireUpdate":
        if self.fields is not None:
            _validate_rule_references(self.fields)
        return self


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
    org_omara_number: Optional[str] = None
    org_website: Optional[str] = None
    org_business_phone: Optional[str] = None
    org_contact_person: Optional[str] = None
    org_business_hours: Optional[str] = None
    org_social_links: Optional[dict[str, str]] = None
    fields: list[QuestionField]


class SubmitQuestionnaireRequest(BaseModel):
    submitter_email: EmailStr
    submitter_first_name: str = Field(min_length=1)
    submitter_last_name: str = Field(min_length=1)
    submitter_phone: str = Field(min_length=1)
    answers: dict[str, Any] = Field(default_factory=dict)


class SubmitQuestionnaireResponse(BaseModel):
    response_id: UUID
    pre_case_id: UUID
    message: str
