"""JWT authentication utilities for the multi-tenant console.

Issues a short-ish JWT containing user_id + active org context. The auth
dependency `current_seat` resolves the request -> Seat row, which gives us
both the user identity and the org tenant context.

Coexists with the X-API-Key middleware: API key validates the *service*,
JWT validates the *user* (and their tenant). Endpoints that need tenant
scoping inject `current_seat`.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.orgs.models import Organization, Seat
from app.agents.immigration.users.models import User
from app.core.config import get_settings
from app.db.session import get_db

logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
JWT_TTL_HOURS = 24 * 14  # 14 days


def _jwt_secret() -> str:
    return get_settings().effective_jwt_secret


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: Optional[str]) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def issue_token(user_id: UUID, seat_id: UUID, org_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": str(user_id),
        "seat_id": str(seat_id),
        "org_id": str(org_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=JWT_TTL_HOURS)).timestamp()),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALGORITHM])


class CurrentContext:
    """Bundle of resolved request context — user, seat, org."""

    def __init__(self, user: User, seat: Seat, org: Organization):
        self.user = user
        self.seat = seat
        self.org = org

    @property
    def user_id(self) -> UUID:
        return self.user.id

    @property
    def seat_id(self) -> UUID:
        return self.seat.id

    @property
    def org_id(self) -> UUID:
        return self.org.id


async def get_current_context(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> CurrentContext:
    """FastAPI dependency that resolves Authorization: Bearer <jwt> to a CurrentContext.

    Use this on all endpoints that need tenant scoping. The X-API-Key middleware
    has already validated the service before this runs.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Authorization: Bearer token")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")

    user_id = payload.get("user_id")
    seat_id = payload.get("seat_id")
    org_id = payload.get("org_id")
    if not (user_id and seat_id and org_id):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    seat = (await db.execute(select(Seat).where(Seat.id == seat_id))).scalar_one_or_none()
    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one_or_none()

    if not (user and seat and org):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User, seat, or org not found")
    if seat.user_id != user.id or seat.org_id != org.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Seat / org mismatch")
    if seat.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Seat is {seat.status}")

    return CurrentContext(user=user, seat=seat, org=org)


async def get_current_owner_or_admin(ctx: CurrentContext = Depends(get_current_context)) -> CurrentContext:
    if ctx.seat.role not in ("owner", "admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Owner or admin role required")
    return ctx
