"""Client = a global individual (visa applicant). Linked to many Orgs via ClientOrgLink.

`ClientPortalAccount` is the per-agent login identity for the client portal. It is
deliberately **org-scoped** (UNIQUE(org_id, email)) — not globally unique — so the
same person can hold separate portal accounts with different agents. The global
`Client` row stays as the CRM dedup record; the portal account is the credential.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base

PORTAL_ACCOUNT_STATUSES = ("invited", "active", "disabled")


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    primary_email = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    country = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class ClientOrgLink(Base):
    """Bridge — one Client can engage many Orgs; this is the per-org boundary."""

    __tablename__ = "client_org_links"
    __table_args__ = (UniqueConstraint("client_id", "org_id", name="uq_client_org"),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    primary_seat_id = Column(UUID(as_uuid=True), nullable=True)
    status = Column(String, nullable=False, default="active")
    first_seen_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class ClientPortalAccount(Base):
    """Per-agent portal login identity for a client.

    Created at QUALIFY. One account per (org, email) — the same person can hold
    separate accounts with different agents, and the same agent reuses one
    account across multiple applications.
    """

    __tablename__ = "client_portal_accounts"
    __table_args__ = (
        UniqueConstraint("org_id", "email", name="uq_portal_account_org_email"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email = Column(String, nullable=False, index=True)
    password_hash = Column(String, nullable=True)

    # Fernet-encrypted temporary password so the consultant's "Client access" card
    # can re-reveal / re-share it until the client sets their own. Cleared on reset.
    temp_password_encrypted = Column(String, nullable=True)

    status = Column(String, nullable=False, default="invited")
    must_reset = Column(Boolean, nullable=False, default=True)

    failed_login_count = Column(Integer, nullable=False, default=0)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
