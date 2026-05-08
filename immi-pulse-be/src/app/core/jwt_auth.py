"""JWT authentication utilities for the multi-tenant console.

Issues a short-ish JWT containing user_id + active org context. The auth
dependency `current_seat` resolves the request -> Seat row, which gives us
both the user identity and the org tenant context.

Coexists with the X-API-Key middleware: API key validates the *service*,
JWT validates the *user* (and their tenant). Endpoints that need tenant
scoping inject `current_seat`.
"""

import hashlib
import hmac
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


# ────────────────────────────────────────────────────────────────
# Password hashing — bcrypt + optional server-side pepper.
#
# Storage flow (signup):
#   plain ─► HMAC-SHA256(plain, pepper) ─► bcrypt(hmac, cost=12) ─► db
#
# Verification accepts both the peppered hash and legacy un-peppered
# hashes so existing users keep logging in. Use needs_rehash() on
# successful login and re-hash transparently — see auth/service.login.
#
# Why HMAC before bcrypt instead of just concat: bcrypt silently
# truncates input at 72 bytes; HMAC-SHA256 outputs a fixed 32 bytes,
# so long passwords stay fully covered. Spec: OWASP ASVS V2.4.5,
# NIST SP 800-63B §5.1.1.2.
# ────────────────────────────────────────────────────────────────


def _pepper_bytes() -> Optional[bytes]:
    p = get_settings().password_pepper
    return p.encode("utf-8") if p else None


def _prepare(plain: str) -> bytes:
    raw = plain.encode("utf-8")
    pepper = _pepper_bytes()
    if pepper:
        return hmac.new(pepper, raw, hashlib.sha256).digest()
    return raw


def hash_password(plain: str) -> str:
    rounds = max(10, get_settings().password_bcrypt_rounds)
    return bcrypt.hashpw(_prepare(plain), bcrypt.gensalt(rounds=rounds)).decode("utf-8")


def verify_password(plain: str, hashed: Optional[str]) -> bool:
    if not hashed:
        return False
    hashed_bytes = hashed.encode("utf-8")
    # Current format (peppered when configured)
    try:
        if bcrypt.checkpw(_prepare(plain), hashed_bytes):
            return True
    except Exception:
        pass
    # Legacy fallback: hashes created before the pepper was introduced
    if _pepper_bytes() is not None:
        try:
            return bcrypt.checkpw(plain.encode("utf-8"), hashed_bytes)
        except Exception:
            return False
    return False


def needs_rehash(plain: str, hashed: Optional[str]) -> bool:
    """True when the stored hash is a legacy/weaker variant and should be
    re-hashed on the user's next successful login.

    Triggers on (a) legacy un-peppered hash with a pepper now configured,
    or (b) bcrypt cost lower than the current configured rounds.
    """
    if not hashed:
        return False
    hashed_bytes = hashed.encode("utf-8")

    # (a) Legacy un-peppered hash that we now accept via the fallback.
    if _pepper_bytes() is not None:
        try:
            if bcrypt.checkpw(plain.encode("utf-8"), hashed_bytes):
                # Verifies under legacy path → upgrade.
                return True
        except Exception:
            return False

    # (b) Cost factor was bumped since this hash was written.
    try:
        # bcrypt hashes look like $2b$12$… — the segment between the 2nd
        # and 3rd '$' is the cost. Cheap to parse, no need for passlib.
        cost = int(hashed_bytes.split(b"$")[2])
        return cost < max(10, get_settings().password_bcrypt_rounds)
    except (IndexError, ValueError):
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
