"""User model — shared across case management, marketplace, and community admin."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.base import Base


class User(Base):
    """
    A user of the IMMI-PULSE platform.

    Roles:
      - consultant: OMARA-registered migration agent using the console dashboard.
                    Authenticated via the external TDOP service; `tdop_user_id`
                    links the row to the upstream identity.
      - admin:      Internal IMMI-PULSE staff moderating marketplace approvals and
                    community reports.

    Community members do not get a User row — community posting is fully
    anonymous, rate-limited by IP hash.
    """

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, nullable=False, unique=True, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    role = Column(String, nullable=False, default="consultant")
    tdop_user_id = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="active")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
