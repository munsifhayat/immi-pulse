"""Password policy + breach-list check.

Implements NIST SP 800-63B §5.1.1.2: prefer length over composition rules,
and reject passwords known to be in breach corpora.

The breach check uses Have I Been Pwned's k-anonymity API:
only the first 5 chars of the SHA-1 leave the server, so the password
itself is never transmitted. If the API is unreachable or slow, we fail
*open* (allow signup) rather than block legitimate users on a 3rd-party
outage. Disable the check entirely via BREACH_CHECK_ENABLED=false.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from typing import Optional

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128  # Bcrypt-via-HMAC removes the 72-byte cap, but cap input anyway


class PasswordPolicyError(ValueError):
    """Raised when a password fails policy. Message is safe to surface to the user."""


def validate_complexity(plain: str) -> None:
    """Synchronous, offline checks. Raise PasswordPolicyError on failure."""
    if not plain:
        raise PasswordPolicyError("Password is required.")
    if len(plain) < PASSWORD_MIN_LENGTH:
        raise PasswordPolicyError(
            f"Password must be at least {PASSWORD_MIN_LENGTH} characters."
        )
    if len(plain) > PASSWORD_MAX_LENGTH:
        raise PasswordPolicyError(
            f"Password is too long ({PASSWORD_MAX_LENGTH} character maximum)."
        )
    # NIST discourages composition rules — but we do reject the obvious
    # "all the same character" shapes that tools generate by accident.
    if len(set(plain)) < 4:
        raise PasswordPolicyError("Password is too repetitive. Try something less guessable.")
    if re.fullmatch(r"\d+", plain):
        raise PasswordPolicyError("Password cannot be only numbers.")


async def is_breached(plain: str) -> bool:
    """Check Pwned Passwords. Returns True only when we *know* it's breached.
    Network/timeout errors return False (fail open) to avoid blocking signup
    on a third-party outage. The password itself never leaves the server.
    """
    settings = get_settings()
    if not settings.breach_check_enabled:
        return False

    sha1 = hashlib.sha1(plain.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]
    url = f"https://api.pwnedpasswords.com/range/{prefix}"

    try:
        async with httpx.AsyncClient(timeout=settings.breach_check_timeout_seconds) as client:
            resp = await client.get(url, headers={"Add-Padding": "true"})
            resp.raise_for_status()
    except (httpx.HTTPError, asyncio.TimeoutError) as exc:
        logger.warning("Pwned Passwords lookup failed; allowing signup. err=%s", exc)
        return False

    for line in resp.text.splitlines():
        # Lines look like: "0018A45C4D1DEF81644B54AB7F969B88D65:3"
        line_suffix, _, count = line.partition(":")
        if line_suffix.strip().upper() == suffix and (count.strip().isdigit() and int(count) > 0):
            return True
    return False


async def assert_password_acceptable(plain: str, *, also_compare: Optional[list[str]] = None) -> None:
    """Full pipeline: complexity + breach + similarity to user-provided
    identifiers (email local-part, name). Raises PasswordPolicyError.
    """
    validate_complexity(plain)

    lowered = plain.lower()
    for ref in also_compare or []:
        if ref and len(ref) >= 4 and ref.lower() in lowered:
            raise PasswordPolicyError(
                "Password is too similar to your name or email. Choose something different."
            )

    if await is_breached(plain):
        raise PasswordPolicyError(
            "This password appears in known data breaches. Please choose a different one."
        )
