"""
Client portal auth — signed tokens + PIN + short-lived session JWT.

Flow
----
1. A consultant generates a portal grant for a case. The server creates a
   `case_portal_tokens` row and hands back:
     - a url-safe signed token that encodes {case_id, token_id}
     - a freshly generated 6-digit PIN
     - an expiry date
   The bcrypt hash of the PIN is stored on the row; the PIN itself is shown
   to the consultant once and never persisted in plaintext.

2. The client opens /client-portal/<token>, enters the PIN, and we call
   `verify_portal_token_and_pin`. On success we return a short-lived session
   JWT (default 15 min) that the browser uses for subsequent upload/read
   calls against the case.
"""

import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import bcrypt
import jwt
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.cases.models import CasePortalToken
from app.core.config import get_settings

PORTAL_SALT = "immi-pulse.client-portal"
SESSION_JWT_ALGO = "HS256"
SESSION_JWT_AUDIENCE = "immi-pulse.client-portal.session"


# --------------- PIN helpers ---------------------------------------------------


def generate_pin() -> str:
    """Return a 6-digit zero-padded PIN."""
    return f"{secrets.randbelow(10**6):06d}"


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pin(pin: str, pin_hash: str) -> bool:
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), pin_hash.encode("utf-8"))
    except ValueError:
        return False


# --------------- Signed token helpers ----------------------------------------


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(
        secret_key=get_settings().portal_secret_key,
        salt=PORTAL_SALT,
    )


def sign_portal_token(token_id: UUID, case_id: UUID) -> str:
    return _serializer().dumps({"token_id": str(token_id), "case_id": str(case_id)})


@dataclass
class PortalTokenPayload:
    token_id: UUID
    case_id: UUID


class PortalTokenInvalid(Exception):
    pass


class PortalTokenExpired(Exception):
    pass


def decode_portal_token(token: str) -> PortalTokenPayload:
    settings = get_settings()
    max_age = settings.portal_token_max_age_days * 24 * 3600
    try:
        payload: dict[str, Any] = _serializer().loads(token, max_age=max_age)
    except SignatureExpired as err:
        raise PortalTokenExpired() from err
    except BadSignature as err:
        raise PortalTokenInvalid() from err

    try:
        return PortalTokenPayload(
            token_id=UUID(payload["token_id"]),
            case_id=UUID(payload["case_id"]),
        )
    except (KeyError, ValueError) as err:
        raise PortalTokenInvalid() from err


# --------------- Session JWT --------------------------------------------------


@dataclass
class PortalSession:
    case_id: UUID
    token_id: UUID
    exp: datetime


def issue_session_jwt(case_id: UUID, token_id: UUID) -> tuple[str, datetime]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(minutes=settings.portal_session_ttl_minutes)
    payload = {
        "sub": str(case_id),
        "tid": str(token_id),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "aud": SESSION_JWT_AUDIENCE,
    }
    encoded = jwt.encode(
        payload,
        settings.portal_session_jwt_secret,
        algorithm=SESSION_JWT_ALGO,
    )
    return encoded, exp


def decode_session_jwt(token: str) -> PortalSession:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.portal_session_jwt_secret,
            algorithms=[SESSION_JWT_ALGO],
            audience=SESSION_JWT_AUDIENCE,
        )
    except jwt.ExpiredSignatureError as err:
        raise PortalTokenExpired() from err
    except jwt.InvalidTokenError as err:
        raise PortalTokenInvalid() from err

    try:
        return PortalSession(
            case_id=UUID(payload["sub"]),
            token_id=UUID(payload["tid"]),
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
    except (KeyError, ValueError) as err:
        raise PortalTokenInvalid() from err


# --------------- Full verification flow --------------------------------------


class PortalAuthError(Exception):
    """Raised when a portal verification attempt fails."""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


async def verify_portal_token_and_pin(
    db: AsyncSession,
    token: str,
    pin: str,
) -> tuple[PortalTokenPayload, CasePortalToken]:
    """
    Validate the signed token + PIN and return the payload & DB row.

    Raises PortalAuthError on any failure. The caller is responsible for
    committing any attempt-count increments.
    """
    settings = get_settings()

    try:
        payload = decode_portal_token(token)
    except PortalTokenExpired as err:
        raise PortalAuthError("expired", "This link has expired.") from err
    except PortalTokenInvalid as err:
        raise PortalAuthError("invalid", "This link is invalid.") from err

    row = await db.get(CasePortalToken, payload.token_id)
    if row is None or row.case_id != payload.case_id:
        raise PortalAuthError("invalid", "This link is invalid.")

    if row.revoked:
        raise PortalAuthError("revoked", "This link has been revoked.")

    now = datetime.now(timezone.utc)
    if row.expires_at <= now:
        raise PortalAuthError("expired", "This link has expired.")

    if row.attempt_count >= settings.portal_pin_max_attempts:
        row.revoked = True
        await db.flush()
        raise PortalAuthError(
            "locked",
            "Too many incorrect attempts. Contact your consultant for a new link.",
        )

    if not verify_pin(pin, row.pin_hash):
        row.attempt_count = (row.attempt_count or 0) + 1
        if row.attempt_count >= settings.portal_pin_max_attempts:
            row.revoked = True
        await db.flush()
        raise PortalAuthError("bad_pin", "Incorrect PIN.")

    row.last_used_at = now
    await db.flush()
    return payload, row


async def load_session_case_id(db: AsyncSession, session_jwt: str) -> UUID:
    """
    Decode a session JWT, verify the backing token row is still valid, and
    return the case id. Raises PortalAuthError on any failure.
    """
    try:
        session = decode_session_jwt(session_jwt)
    except PortalTokenExpired as err:
        raise PortalAuthError("expired", "Your session has expired.") from err
    except PortalTokenInvalid as err:
        raise PortalAuthError("invalid", "Invalid session.") from err

    result = await db.execute(
        select(CasePortalToken).where(CasePortalToken.id == session.token_id)
    )
    row = result.scalar_one_or_none()
    if row is None or row.revoked or row.case_id != session.case_id:
        raise PortalAuthError("invalid", "Invalid session.")

    now = datetime.now(timezone.utc)
    if row.expires_at <= now:
        raise PortalAuthError("expired", "This link has expired.")

    return session.case_id
