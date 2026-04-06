"""Microsoft integration models — OAuth connections and monitored mailboxes."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db.base import Base


class MicrosoftConnection(Base):
    __tablename__ = "microsoft_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(String, nullable=False)
    tenant_name = Column(String, nullable=True)
    connected_by = Column(String, nullable=True)
    oauth_state = Column(String, nullable=True)
    status = Column(String, nullable=False, default="pending")  # pending, active, disconnected
    connected_at = Column(DateTime(timezone=True), nullable=True)
    disconnected_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    mailboxes = relationship("MonitoredMailbox", back_populates="connection", cascade="all, delete-orphan")


class MonitoredMailbox(Base):
    __tablename__ = "monitored_mailboxes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(as_uuid=True), ForeignKey("microsoft_connections.id"), nullable=False)
    email = Column(String, unique=True, nullable=False)
    display_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    subscription_id = Column(String, nullable=True)
    subscription_expiry = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    connection = relationship("MicrosoftConnection", back_populates="mailboxes")
