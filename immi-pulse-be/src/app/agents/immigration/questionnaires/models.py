"""Questionnaire builder — Questionnaire + QuestionnaireVersion + QuestionnaireResponse."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base

QUESTIONNAIRE_AUDIENCES = ("individual", "employer", "onshore", "offshore", "general")
FIELD_TYPES = (
    "short_text",
    "long_text",
    "yes_no",
    "single_select",
    "multi_select",
    "number",
    "date",
    "email",
    "phone",
)


class Questionnaire(Base):
    __tablename__ = "questionnaires"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    slug = Column(String, nullable=False, unique=True, index=True)
    audience = Column(String, nullable=False, default="general")
    is_active = Column(Boolean, nullable=False, default=True)
    current_version_id = Column(UUID(as_uuid=True), nullable=True)
    created_by_seat_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class QuestionnaireVersion(Base):
    """Snapshot of questionnaire schema. Responses snap to a specific version
    so editing a published questionnaire never breaks in-flight answers."""

    __tablename__ = "questionnaire_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    questionnaire_id = Column(
        UUID(as_uuid=True),
        ForeignKey("questionnaires.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_no = Column(Integer, nullable=False, default=1)
    schema = Column(JSONB, nullable=False)  # {"fields": [{...}]}
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    questionnaire_id = Column(
        UUID(as_uuid=True),
        ForeignKey("questionnaires.id", ondelete="CASCADE"),
        nullable=False,
    )
    version_id = Column(
        UUID(as_uuid=True),
        ForeignKey("questionnaire_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    answers = Column(JSONB, nullable=False)
    submitter_email = Column(String, nullable=False)
    submitter_name = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
