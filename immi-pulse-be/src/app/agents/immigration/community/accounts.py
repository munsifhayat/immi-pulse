"""Pseudonymous community accounts — signup, login, recovery, session.

One account, Reddit-style: an **assigned** handle (never chosen — chosen names
leak identity), a member-set password, and an **optional** email used only for
password recovery and reply notifications.

The account IS the existing ``AnonIdentity`` row. A visitor's device already
has one, carrying their handle and any posts they made before signing up, so
"signing up" is really "claiming" — set a password on the row you already are.
Nothing migrates, nothing is stitched, and the member keeps their history.

Session tokens use their own audience (``immi-pulse.community.session``) and
resolve via :func:`require_community_account`, which deliberately does **not**
go through ``get_current_context``: community members have no seat and no org,
so the console's tenant-scoped dependency cannot be reused for them.

Threat notes:
- Recovery responds identically whether or not the address is known, so the
  endpoint cannot be used to test which emails have accounts.
- Login is throttled per account with a lockout window; the error message is
  the same for "no such handle" and "wrong password".
- The breach check inside ``assert_password_acceptable`` already fails open on
  timeout (``password_policy.is_breached``), so a Pwned Passwords outage
  degrades to "allowed" rather than blocking signup.
"""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional
from uuid import UUID

import jwt
from fastapi import Depends, Header, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community.models import AnonIdentity
from app.core.config import get_settings
from app.core.jwt_auth import hash_password, verify_password
from app.core.password_policy import PasswordPolicyError, assert_password_acceptable
from app.db.session import get_db

SESSION_JWT_ALGO = "HS256"
SESSION_JWT_AUDIENCE = "immi-pulse.community.session"
SESSION_TTL_DAYS = 90  # People check back monthly over a 14-month wait.

# Device-token cookie. Safari's ITP deletes script-writable storage after seven
# days without a visit — catastrophic for a product whose users return monthly —
# so the durable copy is a server-set HttpOnly cookie, which ITP does not touch
# and XSS cannot read. The X-Device-Token header path keeps working alongside it.
DEVICE_COOKIE_NAME = "ip_device"
DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400  # ~13 months

MAX_FAILED_LOGINS = 8
LOCKOUT_MINUTES = 15
RECOVERY_TTL_MINUTES = 60

# Deliberately identical for unknown handle and wrong password.
_BAD_CREDENTIALS = "That handle and password don't match."


# --------------- Session JWT --------------------------------------------------


@dataclass
class CommunitySession:
    account_id: UUID
    exp: datetime


def _session_secret() -> str:
    return get_settings().effective_jwt_secret


def issue_community_session_jwt(account: AnonIdentity) -> tuple[str, datetime]:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(days=SESSION_TTL_DAYS)
    payload = {
        "sub": str(account.id),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "aud": SESSION_JWT_AUDIENCE,
    }
    return jwt.encode(payload, _session_secret(), algorithm=SESSION_JWT_ALGO), exp


def decode_community_session_jwt(token: str) -> CommunitySession:
    try:
        payload = jwt.decode(
            token,
            _session_secret(),
            algorithms=[SESSION_JWT_ALGO],
            audience=SESSION_JWT_AUDIENCE,
        )
    except jwt.ExpiredSignatureError as err:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Your session has expired."
        ) from err
    except jwt.InvalidTokenError as err:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.") from err

    try:
        return CommunitySession(
            account_id=UUID(payload["sub"]),
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
        )
    except (KeyError, ValueError, TypeError) as err:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.") from err


# --------------- FastAPI dependencies ----------------------------------------


async def require_community_account(
    authorization: Annotated[Optional[str], Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> AnonIdentity:
    """Resolve ``Authorization: Bearer <community-jwt>`` to a live account.

    No seat, no org, no tenant — a community member has none of those. This is
    why ``get_current_context`` cannot be reused here.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, "Missing Authorization: Bearer token"
        )
    session = decode_community_session_jwt(authorization.split(" ", 1)[1].strip())

    account = (
        await db.execute(select(AnonIdentity).where(AnonIdentity.id == session.account_id))
    ).scalar_one_or_none()
    if account is None or not account.password_hash:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.")
    return account


async def optional_community_account(
    authorization: Annotated[Optional[str], Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> Optional[AnonIdentity]:
    """Same as :func:`require_community_account` but returns None instead of 401.

    For read surfaces that are open to everyone yet render differently when
    signed in (the feed marking your own posts, for instance).
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        return await require_community_account(authorization=authorization, db=db)
    except HTTPException:
        return None


# --------------- Device cookie -----------------------------------------------


def device_token_from_request(request: Request) -> Optional[str]:
    """Device token from the header first, then the HttpOnly cookie.

    Header-first keeps existing clients (localStorage + ``X-Device-Token``)
    working unchanged while the cookie becomes the durable copy.
    """
    header = request.headers.get("x-device-token")
    if header and header.strip():
        return header.strip()
    cookie = request.cookies.get(DEVICE_COOKIE_NAME)
    return cookie.strip() if cookie and cookie.strip() else None


def set_device_cookie(response: Response, token: str) -> None:
    """Persist the device token server-side.

    Frontend and backend are on different origins, so this needs
    ``SameSite=None; Secure`` plus ``credentials: 'include'`` client-side and a
    non-wildcard CORS origin (``settings.effective_cors_origins`` already names
    them). Over plain http on localhost browsers drop a Secure cookie, so dev
    falls back to Lax — the header path still carries the token there.
    """
    secure = not get_settings().frontend_url.startswith("http://localhost")
    response.set_cookie(
        key=DEVICE_COOKIE_NAME,
        value=token,
        max_age=DEVICE_COOKIE_MAX_AGE,
        httponly=True,
        secure=secure,
        samesite="none" if secure else "lax",
        path="/",
    )


# --------------- Recovery tokens ---------------------------------------------


def _hash_recovery_token(token: str) -> str:
    """Recovery tokens are stored hashed — a DB read must not yield a live one."""
    return hashlib.sha256(f"immi-pulse.community.recovery.{token}".encode()).hexdigest()


def normalize_email(email: Optional[str]) -> Optional[str]:
    if email is None:
        return None
    cleaned = email.strip().lower()
    return cleaned or None


# --------------- Errors -------------------------------------------------------


class AccountError(Exception):
    """Signup/login/recovery failure whose message is safe to show the member."""

    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


# --------------- Service ------------------------------------------------------


class CommunityAccountService:
    """Signup, login and recovery over the ``anon_identities`` account row."""

    @staticmethod
    async def get_by_handle(db: AsyncSession, handle: str) -> Optional[AnonIdentity]:
        """Handle lookup is case-insensitive — people retype handles by hand."""
        result = await db.execute(
            select(AnonIdentity).where(
                func.lower(AnonIdentity.handle) == handle.strip().lower()
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_email(db: AsyncSession, email: str) -> Optional[AnonIdentity]:
        """Find the account that owns an address, if that is unambiguous.

        Verified wins outright — it is unique, so at most one row can hold it.
        Otherwise fall back to a pending claim, but only when exactly one
        account has claimed it. Pending addresses are deliberately not unique
        (see the model), so "two people typed the same address" is a state that
        can happen; resolving it by picking one would hand a stranger's account
        to whoever guessed the address. Ambiguity resolves to nobody.
        """
        clean = normalize_email(email)
        if not clean:
            return None

        verified = (
            await db.execute(
                select(AnonIdentity).where(AnonIdentity.email_verified == clean)
            )
        ).scalar_one_or_none()
        if verified is not None:
            return verified

        pending = (
            (
                await db.execute(
                    select(AnonIdentity)
                    .where(AnonIdentity.email_pending == clean)
                    .limit(2)
                )
            )
            .scalars()
            .all()
        )
        return pending[0] if len(pending) == 1 else None

    @staticmethod
    async def signup(
        db: AsyncSession,
        *,
        identity: AnonIdentity,
        password: str,
        email: str,
    ) -> AnonIdentity:
        """Claim ``identity`` as an account by setting a password on it.

        ``identity`` is the row this device already owns, so the handle and any
        posts already made under it carry straight over — that is the whole
        reason the account lives on this table.

        Email is **required and unverified**: the member types it, we take it,
        and they are signed in immediately. Verification is a later, optional
        step that upgrades ``email_pending`` to ``email_verified`` and unlocks
        recovery. The address is stored as pending precisely so that requiring
        it cannot be turned into a denial-of-service against the real owner.
        """
        if identity.password_hash:
            raise AccountError(
                "This device already has an account. Log in instead.",
                status.HTTP_409_CONFLICT,
            )

        clean_email = normalize_email(email)
        if not clean_email:
            raise AccountError(
                "An email address is required.", status.HTTP_400_BAD_REQUEST
            )

        # Never let the password contain the handle or the email local-part.
        compare = [identity.handle, clean_email.split("@", 1)[0]]
        try:
            await assert_password_acceptable(password, also_compare=compare)
        except PasswordPolicyError as err:
            raise AccountError(str(err), status.HTTP_400_BAD_REQUEST) from err

        # Only a *verified* address blocks reuse. Refusing on a pending one
        # would rebuild the pre-hijacking hole this split exists to close.
        taken = (
            await db.execute(
                select(AnonIdentity).where(AnonIdentity.email_verified == clean_email)
            )
        ).scalar_one_or_none()
        if taken is not None:
            raise AccountError(
                "That email is already linked to an account. "
                "Log in, or use password recovery.",
                status.HTTP_409_CONFLICT,
            )

        identity.password_hash = hash_password(password)
        identity.email_pending = clean_email
        identity.last_login_at = datetime.now(timezone.utc)
        identity.failed_login_count = 0
        identity.locked_until = None
        await db.flush()
        return identity

    @staticmethod
    async def login(
        db: AsyncSession, *, handle: str, password: str
    ) -> AnonIdentity:
        """Verify handle + password. Throttled; failures are indistinguishable."""
        account = await CommunityAccountService.get_by_handle(db, handle)
        if account is None or not account.password_hash:
            raise AccountError(_BAD_CREDENTIALS, status.HTTP_401_UNAUTHORIZED)

        now = datetime.now(timezone.utc)
        locked_until = account.locked_until
        if locked_until is not None:
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=timezone.utc)
            if locked_until > now:
                raise AccountError(
                    "Too many failed attempts. Try again in a few minutes.",
                    status.HTTP_429_TOO_MANY_REQUESTS,
                )

        if not verify_password(password, account.password_hash):
            account.failed_login_count = (account.failed_login_count or 0) + 1
            if account.failed_login_count >= MAX_FAILED_LOGINS:
                account.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
                account.failed_login_count = 0
            await db.flush()
            raise AccountError(_BAD_CREDENTIALS, status.HTTP_401_UNAUTHORIZED)

        account.failed_login_count = 0
        account.locked_until = None
        account.last_login_at = now
        account.last_seen_at = now
        await db.flush()
        return account

    @staticmethod
    async def begin_recovery(db: AsyncSession, *, email: str) -> Optional[str]:
        """Mint a single-use recovery token, or return None if there's nothing to recover.

        The caller must respond identically either way — a differing response
        would turn this into an oracle for which emails hold accounts, and for
        this audience that is a real-world risk, not a theoretical one.
        """
        clean = normalize_email(email)
        if not clean:
            return None
        account = await CommunityAccountService.get_by_email(db, clean)
        if account is None or not account.password_hash:
            return None

        token = secrets.token_urlsafe(32)
        account.recovery_token_hash = _hash_recovery_token(token)
        account.recovery_expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=RECOVERY_TTL_MINUTES
        )
        await db.flush()
        return token

    @staticmethod
    async def complete_recovery(
        db: AsyncSession, *, token: str, new_password: str
    ) -> AnonIdentity:
        """Consume a recovery token and set a new password."""
        token_hash = _hash_recovery_token(token.strip())
        account = (
            await db.execute(
                select(AnonIdentity).where(
                    AnonIdentity.recovery_token_hash == token_hash
                )
            )
        ).scalar_one_or_none()
        if account is None:
            raise AccountError(
                "That recovery link is invalid or has already been used.",
                status.HTTP_400_BAD_REQUEST,
            )

        expires = account.recovery_expires_at
        if expires is not None and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires is None or expires < datetime.now(timezone.utc):
            account.recovery_token_hash = None
            account.recovery_expires_at = None
            await db.flush()
            raise AccountError(
                "That recovery link has expired. Request a new one.",
                status.HTTP_400_BAD_REQUEST,
            )

        try:
            await assert_password_acceptable(
                new_password, also_compare=[account.handle]
            )
        except PasswordPolicyError as err:
            raise AccountError(str(err), status.HTTP_400_BAD_REQUEST) from err

        account.password_hash = hash_password(new_password)
        account.recovery_token_hash = None
        account.recovery_expires_at = None
        account.failed_login_count = 0
        account.locked_until = None
        account.last_login_at = datetime.now(timezone.utc)
        await db.flush()
        return account

    @staticmethod
    def account_out(account: AnonIdentity) -> dict:
        """The member's own view of their account.

        ``has_email`` rather than the address itself: the member already knows
        what they typed, and a serializer that never carries the value cannot
        leak it. ``can_recover`` states the consequence of that choice plainly.
        """
        return {
            "handle": account.handle,
            "color": account.color,
            "has_email": bool(account.email_verified or account.email_pending),
            "email_verified": bool(account.email_verified),
            "can_recover": bool(account.email_verified or account.email_pending),
            "created_at": account.created_at,
            "last_login_at": account.last_login_at,
        }


async def send_recovery_email(*, to: str, handle: str, token: str) -> None:
    """Send the recovery link. Neutral subject — inboxes are shared.

    Imported lazily and looked up through the module so tests can monkeypatch
    ``app.integrations.resend.templates`` and capture instead of send.
    """
    from app.integrations.resend import templates as email_templates

    settings = get_settings()
    link = f"{settings.frontend_url.rstrip('/')}/community/recover?token={token}"
    await email_templates.send_generic(
        to=to,
        subject="Reset your immi360 password",
        eyebrow_text="Account recovery",
        headline="Reset your password",
        body_html=(
            f"<p>Your handle is <strong>{handle}</strong>.</p>"
            "<p>This link works once and expires in an hour. "
            "If you didn't ask for it, you can ignore this email.</p>"
        ),
        cta_label="Choose a new password",
        cta_url=link,
        preheader="Reset your immi360 password.",
    )
