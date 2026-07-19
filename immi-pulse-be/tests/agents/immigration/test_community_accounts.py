"""Pure-logic tests for pseudonymous community accounts.

No database and no HTTP — session-token round-tripping, recovery-token hashing,
email normalisation and the member-facing serializer. The flow itself (signup →
post → log in elsewhere → recover) lives in ``tests/e2e_community_accounts.py``.
"""

import os

os.environ["BREACH_CHECK_ENABLED"] = "false"

import uuid
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException

from app.agents.immigration.community.accounts import (
    SESSION_JWT_AUDIENCE,
    CommunityAccountService,
    _hash_recovery_token,
    decode_community_session_jwt,
    issue_community_session_jwt,
    normalize_email,
)
from app.agents.immigration.community.models import AnonIdentity
from app.core.config import get_settings


def _account(**kw) -> AnonIdentity:
    """An in-memory account row — never added to a session."""
    defaults = dict(
        id=uuid.uuid4(),
        device_token="dev-" + uuid.uuid4().hex,
        handle="BoldLagoon7745",
        color="#7A5AF8",
        password_hash="$2b$12$fakefakefakefakefakefake",
        email_pending=None,
        email_verified=None,
        email_verified_at=None,
        last_login_at=None,
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(kw)
    return AnonIdentity(**defaults)


# --- Session JWT --------------------------------------------------------------


def test_session_jwt_round_trips_to_the_account_id():
    account = _account()
    token, exp = issue_community_session_jwt(account)
    session = decode_community_session_jwt(token)
    assert session.account_id == account.id
    assert exp > datetime.now(timezone.utc)


def test_session_jwt_carries_the_community_audience():
    """Its own audience — a console or portal token must not open this door."""
    token, _ = issue_community_session_jwt(_account())
    payload = jwt.decode(
        token,
        get_settings().effective_jwt_secret,
        algorithms=["HS256"],
        audience=SESSION_JWT_AUDIENCE,
    )
    assert payload["aud"] == SESSION_JWT_AUDIENCE


def test_session_jwt_with_a_foreign_audience_is_rejected():
    """A portal-account token must not authenticate a community member."""
    now = datetime.now(timezone.utc)
    foreign = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(days=1)).timestamp()),
            "aud": "immi-pulse.portal-account.session",
        },
        get_settings().effective_jwt_secret,
        algorithm="HS256",
    )
    with pytest.raises(HTTPException) as err:
        decode_community_session_jwt(foreign)
    assert err.value.status_code == 401


def test_expired_session_jwt_is_rejected():
    now = datetime.now(timezone.utc)
    expired = jwt.encode(
        {
            "sub": str(uuid.uuid4()),
            "iat": int((now - timedelta(days=2)).timestamp()),
            "exp": int((now - timedelta(days=1)).timestamp()),
            "aud": SESSION_JWT_AUDIENCE,
        },
        get_settings().effective_jwt_secret,
        algorithm="HS256",
    )
    with pytest.raises(HTTPException) as err:
        decode_community_session_jwt(expired)
    assert err.value.status_code == 401


def test_tampered_session_jwt_is_rejected():
    token, _ = issue_community_session_jwt(_account())
    with pytest.raises(HTTPException):
        decode_community_session_jwt(token[:-4] + "aaaa")


# --- Recovery tokens ----------------------------------------------------------


def test_recovery_token_hash_is_stable_and_not_the_token():
    token = "a-recovery-token"
    assert _hash_recovery_token(token) == _hash_recovery_token(token)
    assert token not in _hash_recovery_token(token)


def test_recovery_token_hashes_differ_per_token():
    assert _hash_recovery_token("one") != _hash_recovery_token("two")


# --- Email normalisation ------------------------------------------------------


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("  Person@Example.COM ", "person@example.com"),
        ("", None),
        ("   ", None),
        (None, None),
    ],
)
def test_normalize_email(raw, expected):
    assert normalize_email(raw) == expected


# --- Member-facing serializer -------------------------------------------------


def test_account_out_never_carries_the_email_address():
    """The member knows what they typed; a serializer that never carries the
    value cannot leak it."""
    out = CommunityAccountService.account_out(
        _account(email_pending="secret@example.com")
    )
    assert "secret@example.com" not in str(out)
    assert "email" not in out  # only has_email / email_verified / can_recover
    assert out["has_email"] is True


def test_account_out_states_recovery_honestly():
    """No email means no recovery — the serializer has to say so plainly.

    Signup now requires an email, so this is the legacy-row case: identities
    claimed before the requirement landed.
    """
    assert (
        CommunityAccountService.account_out(_account())["can_recover"] is False
    )
    assert (
        CommunityAccountService.account_out(_account(email_pending="a@b.com"))[
            "can_recover"
        ]
        is True
    )


def test_unverified_email_still_allows_recovery():
    """Verification shortens probation later; it is not a recovery gate."""
    out = CommunityAccountService.account_out(_account(email_pending="a@b.com"))
    assert out["email_verified"] is False
    assert out["can_recover"] is True


def test_pending_email_is_not_treated_as_verified():
    """The whole point of the split: a typed address is a claim, not proof.

    Only ``email_verified`` may report verified, because only it carries the
    unique constraint that makes "this address is mine" enforceable.
    """
    pending = CommunityAccountService.account_out(
        _account(email_pending="claimed@example.com")
    )
    proven = CommunityAccountService.account_out(
        _account(email_verified="proven@example.com")
    )
    assert pending["email_verified"] is False
    assert proven["email_verified"] is True


def test_is_account_tracks_the_password():
    assert _account().is_account is True
    assert _account(password_hash=None).is_account is False
