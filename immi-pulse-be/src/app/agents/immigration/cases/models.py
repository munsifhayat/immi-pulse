"""Case management models — Case, CaseDocument, CasePortalToken, CaseTimelineEvent."""

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

# Stage values mirror immi-pulse-fe/src/lib/journey-config.ts exactly so the
# 10-stage wizard writes and reads the same enum strings as the backend.
CASE_STAGES = (
    "inquiry",
    "consultation",
    "visa_pathway",
    "checklist",
    "document_collection",
    "document_review",
    "application_prep",
    "lodgement",
    "post_lodgement",
    "decision",
)

CASE_SOURCES = ("email", "manual", "web_form")
CASE_PRIORITIES = ("low", "normal", "high", "urgent")

DOCUMENT_STATUSES = ("pending", "validated", "flagged", "rejected")
DOCUMENT_UPLOADER_TYPES = ("client", "consultant")


class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=True, index=True)
    client_phone = Column(String, nullable=True)

    consultant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    visa_subclass = Column(String, nullable=True)
    visa_name = Column(String, nullable=True)
    stage = Column(String, nullable=False, default="inquiry", index=True)
    priority = Column(String, nullable=False, default="normal")

    source = Column(String, nullable=False, default="manual")
    source_message_id = Column(String, nullable=True, index=True)
    source_mailbox = Column(String, nullable=True)

    lodgement_date = Column(DateTime(timezone=True), nullable=True)
    decision_date = Column(DateTime(timezone=True), nullable=True)

    notes = Column(Text, nullable=True)
    metadata_json = Column("metadata", JSONB, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class CaseDocument(Base):
    __tablename__ = "case_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    document_type = Column(String, nullable=True)  # passport, bank_statement, etc.
    file_name = Column(String, nullable=False)
    s3_key = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    content_type = Column(String, nullable=True)

    uploaded_by_type = Column(String, nullable=False, default="client")
    uploaded_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    status = Column(String, nullable=False, default="pending", index=True)
    extracted_text = Column(Text, nullable=True)
    ai_analysis = Column(JSONB, nullable=True)

    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    review_notes = Column(Text, nullable=True)


class CasePortalToken(Base):
    """
    A single portal access grant for a client to upload documents to a case.

    The token itself is not stored — only the itsdangerous-signed token blob
    is handed to the client, and we verify it on the way in. What we DO store
    is `token_id` (the UUID embedded in the signed token) and a bcrypt hash
    of the 6-digit PIN so we can rate-limit and revoke.
    """

    __tablename__ = "case_portal_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pin_hash = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=False)
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    attempt_count = Column(Integer, nullable=False, default=0)
    revoked = Column(Boolean, nullable=False, default=False)
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class CaseTimelineEvent(Base):
    """Append-only audit trail for case actions — shown on the case detail page."""

    __tablename__ = "case_timeline_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_type = Column(String, nullable=False)  # "system" | "consultant" | "client"
    actor_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type = Column(String, nullable=False)  # "case_created", "stage_changed", "document_uploaded", ...
    event_payload = Column(JSONB, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
