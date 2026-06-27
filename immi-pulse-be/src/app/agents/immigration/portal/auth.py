"""Client-portal *account* auth — persistent, org-scoped login identity.

This replaces the per-action PIN flow (`core/portal_auth.py`) as the primary path.
A client logs in at `/portal/{org_slug}` with email + password and receives a
session JWT (audience `immi-pulse.portal-account.session`) carrying the account id
and org id. The dependency `require_portal_account` resolves that JWT to the
`ClientPortalAccount` row.

Temporary passwords are generated to satisfy `core/password_policy.py`, hashed at
rest via the same bcrypt+pepper used for consultants, and additionally stored
Fernet-encrypted so the consultant's "Client access" card can re-reveal/re-share
them until the client sets their own (then we clear the encrypted copy).
"""

import re
import secrets
import string
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional
from uuid import UUID

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.clients.models import ClientPortalAccount
from app.agents.immigration.orgs.models import Organization
from app.core.config import get_settings
from app.core.encryption import get_token_encryption
from app.db.session import get_db

SESSION_JWT_ALGO = "HS256"
SESSION_JWT_AUDIENCE = "immi-pulse.portal-account.session"

# Avoid ambiguous characters in generated temp passwords (0/O, 1/l/I).
_PWD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
_PWD_SYMBOLS = "!@#$%*?"


# --------------- Temp password + slug helpers --------------------------------


def generate_temp_password(length: int = 12) -> str:
    """A 12+ char password that passes `password_policy.validate_complexity`."""
    core = "".join(secrets.choice(_PWD_ALPHABET) for _ in range(length - 2))
    # Guarantee a digit + symbol so it never looks "all letters".
    return (
        core
        + secrets.choice("23456789")
        + secrets.choice(_PWD_SYMBOLS)
    )


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "firm"


async def ensure_portal_slug(db: AsyncSession, org: Organization) -> str:
    """Return the org's portal slug, generating + persisting a unique one if absent."""
    if org.portal_slug:
        return org.portal_slug
    base = slugify(org.name)[:40]
    slug = base
    n = 2
    while True:
        existing = (
            await db.execute(select(Organization.id).where(Organization.portal_slug == slug))
        ).scalar_one_or_none()
        if existing is None:
            break
        slug = f"{base}-{n}"
        n += 1
    org.portal_slug = slug
    await db.flush()
    return slug


def encrypt_temp_password(plain: str) -> str:
    return get_token_encryption().encrypt(plain)


def decrypt_temp_password(ciphertext: Optional[str]) -> Optional[str]:
    if not ciphertext:
        return None
    try:
        return get_token_encryption().decrypt(ciphertext) or None
    except Exception:
        return None


# --------------- Session JWT --------------------------------------------------


@dataclass
class PortalAccountSession:
    account_id: UUID
    org_id: UUID
    exp: datetime


def issue_account_session_jwt(account: ClientPortalAccount) -> tuple[str, datetime]:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=settings.portal_account_session_ttl_hours)
    payload = {
        "sub": str(account.id),
        "org": str(account.org_id),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "aud": SESSION_JWT_AUDIENCE,
    }
    token = jwt.encode(payload, settings.portal_session_jwt_secret, algorithm=SESSION_JWT_ALGO)
    return token, exp


def decode_account_session_jwt(token: str) -> PortalAccountSession:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.portal_session_jwt_secret,
            algorithms=[SESSION_JWT_ALGO],
            audience=SESSION_JWT_AUDIENCE,
        )
    except jwt.ExpiredSignatureError as err:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired.") from err
    except jwt.InvalidTokenError as err:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.") from err

    try:
        return PortalAccountSession(
            account_id=UUID(payload["sub"]),
            org_id=UUID(payload["org"]),
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
    except (KeyError, ValueError) as err:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.") from err


# --------------- FastAPI dependency ------------------------------------------


async def require_portal_account(
    authorization: Annotated[Optional[str], Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> ClientPortalAccount:
    """Resolve `Authorization: Bearer <portal-account-jwt>` to a live account."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing Authorization: Bearer token")
    token = authorization.split(" ", 1)[1].strip()
    session = decode_account_session_jwt(token)

    account = (
        await db.execute(
            select(ClientPortalAccount).where(ClientPortalAccount.id == session.account_id)
        )
    ).scalar_one_or_none()
    if account is None or account.org_id != session.org_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.")
    if account.status == "disabled":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been disabled.")
    return account
