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
    """An in-memory account row — never added to a session.

    ``device_token`` defaults to None because that is the shape of every
    account: signup releases the browser's token, so an account is reached by
    handle + password and never by a device. See the invariant on
    :class:`AnonIdentity`.
    """
    defaults = dict(
        id=uuid.uuid4(),
        device_token=None,
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


# --- The account/device split -------------------------------------------------
#
# One row used to be both the browser and the account, welded by
# ``device_token NOT NULL UNIQUE``. Everything below guards the seam that
# separated them; each assertion maps to a bug that shipped because it did not
# hold.


def test_device_token_is_nullable_but_still_unique():
    """NULL is now a legal device token, and it must stay uniquely constrained.

    Nullable is what lets an account exist with no browser attached. Unique is
    what still stops two browsers sharing one anonymous row — Postgres permits
    any number of NULLs under a UNIQUE index, so both properties hold at once
    and ``uq_anon_identity_device_token`` did not have to be dropped.
    """
    column = AnonIdentity.__table__.c.device_token
    assert column.nullable is True
    assert column.unique is True


def test_session_response_carries_no_device_token():
    """A session says who you are, never whose browser this is.

    Echoing the account's token here is precisely how two browsers logging into
    one account collapsed onto a single identity, and how a browser that later
    signed out kept writing under the member's pseudonym. The field is gone, so
    no client can reintroduce the behaviour by reading it.
    """
    from app.agents.immigration.community.schemas import CommunitySessionOut

    assert "device_token" not in CommunitySessionOut.model_fields


def test_identity_serializer_reports_no_device_token_for_an_account():
    """Even asked directly for it, an account has no browser to name."""
    from app.agents.immigration.community.service import CommunityService

    out = CommunityService.identity_out(_account(), include_token=True)
    assert out["device_token"] is None
    assert out["has_account"] is True
