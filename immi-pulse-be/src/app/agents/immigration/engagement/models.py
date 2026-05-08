"""Engagement letter — native, in-product, ETA 1999 (Cth) compliant.

Three tables:
- EngagementLetterTemplate: per-org template with markdown body + fee defaults
- EngagementLetter: per-precase rendered letter, public sign token, signed PDF S3 ref
- SignatureEvent: audit trail (IP, user-agent, hash, timestamp) for the e-signature
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base import Base

LETTER_STATUSES = (
    "draft",            # consultant composing, not sent
    "sent",             # emailed to client, awaiting signature
    "signed",           # client signed (or consultant marked manually)
    "voided",           # consultant cancelled before signature
    "superseded",       # replaced by a newer letter on same pre-case
)

SIGNATURE_METHODS = (
    "typed_name",       # Sarah typed her full legal name
    "drawn",            # client drew signature on canvas
    "manual_upload",    # consultant uploaded a signed PDF (paper signature)
    "consultant_attest",# consultant attested signature happened (last-resort manual)
)


class EngagementLetterTemplate(Base):
    """Per-org template that renders into a letter for a specific pre-case."""

    __tablename__ = "engagement_letter_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String, nullable=False, default="Standard engagement letter")
    body_md = Column(Text, nullable=False)
    # Variables available: {{client_name}}, {{visa_subclass}}, {{visa_name}},
    # {{scope}}, {{professional_fee}}, {{disbursements}}, {{retainer}},
    # {{firm_name}}, {{omara_number}}, {{abn}}
    fee_defaults = Column(JSONB, nullable=True)  # {professional_fee, disbursements, retainer, currency}
    is_default = Column(Boolean, nullable=False, default=True)
    created_by_seat_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class EngagementLetter(Base):
    """A specific letter sent to a client for one pre-case."""

    __tablename__ = "engagement_letters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pre_case_id = Column(
        UUID(as_uuid=True),
        ForeignKey("pre_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    template_id = Column(
        UUID(as_uuid=True),
        ForeignKey("engagement_letter_templates.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Snapshotted at send time so future template edits don't change a sent letter
    rendered_body_md = Column(Text, nullable=False)
    rendered_html = Column(Text, nullable=True)  # cached render for the signing portal
    fee_lines = Column(JSONB, nullable=True)     # [{label, amount_aud, kind}]

    status = Column(String, nullable=False, default="draft")

    # Public signing — token + PIN.
    # `sign_pin_hash` is bcrypt(PIN), used to verify what the client types.
    # `sign_pin_encrypted` is Fernet(PIN) so a consultant can recover the
    # plaintext to read it out manually if the email never reached the client.
    sign_token = Column(String, nullable=True, unique=True, index=True)
    sign_pin_hash = Column(String, nullable=True)
    sign_pin_encrypted = Column(Text, nullable=True)
    sign_attempt_count = Column(Numeric(3, 0), nullable=False, default=0)
    sign_link_expires_at = Column(DateTime(timezone=True), nullable=True)

    # S3 keys for signed PDF + audit certificate (both rendered after signature)
    signed_pdf_s3 = Column(String, nullable=True)
    audit_cert_s3 = Column(String, nullable=True)

    sent_at = Column(DateTime(timezone=True), nullable=True)
    signed_at = Column(DateTime(timezone=True), nullable=True)
    voided_at = Column(DateTime(timezone=True), nullable=True)

    created_by_seat_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class SignatureEvent(Base):
    """Audit row created when a letter is signed — supports ETA 1999 (Cth) requirements.

    Captures: identity (typed name + signature image hash), intent (consent flag),
    method, IP, UA, hash of rendered_body_md at sign time. Append-only.
    """

    __tablename__ = "signature_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    letter_id = Column(
        UUID(as_uuid=True),
        ForeignKey("engagement_letters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    method = Column(String, nullable=False)
    signer_name = Column(String, nullable=False)
    signature_image_s3 = Column(String, nullable=True)  # null for typed_name only
    body_hash_sha256 = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    consent_text = Column(Text, nullable=False)  # exact text the user agreed to
    consent_given = Column(Boolean, nullable=False, default=True)
    signed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # When method == "manual_upload" or "consultant_attest", record who marked it
    recorded_by_seat_id = Column(UUID(as_uuid=True), nullable=True)
    manual_reason = Column(Text, nullable=True)
