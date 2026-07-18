"""Pure-logic tests for the trust ladder and its write allowances.

No database, no HTTP — ``tiers.py`` is deliberately free of both, so the whole
policy can be asserted here. The durable enforcement that consumes these
numbers (and the proof that a counter survives a process restart) lives in
``tests/e2e_community_ratelimit.py``.
"""

import os

os.environ["BREACH_CHECK_ENABLED"] = "false"

from datetime import datetime, timedelta, timezone

import pytest

from app.agents.immigration.community import tiers


# --- The ladder ---------------------------------------------------------------


def test_five_tiers_exist_in_order():
    assert (
        tiers.T0_VISITOR
        < tiers.T1_NEW
        < tiers.T2_ESTABLISHED
        < tiers.T3_TRUSTED
        < tiers.T4_PROFESSIONAL
    )
    assert len(tiers.TIER_NAMES) == 5


def test_every_tier_has_a_name():
    for tier in range(tiers.MIN_TIER, tiers.MAX_TIER + 1):
        assert tiers.tier_name(tier)


def test_email_verification_is_not_a_tier():
    """It shortens probation; it is never a rung.

    If verification ever became a tier, optional email would have quietly
    become required email — which is the one decision the whole identity model
    rests on.
    """
    names = " ".join(tiers.TIER_NAMES.values()).lower()
    assert "verified" not in names
    assert "email" not in names


# --- Caps ---------------------------------------------------------------------


def test_t1_caps_are_the_specified_anchor():
    caps = tiers.caps_for(tiers.T1_NEW)
    assert caps.posts_per_day == 5
    assert caps.replies_per_day == 20


def test_ip_ceiling_is_the_specified_starting_value():
    assert tiers.IP_CEILING.posts_per_day == 25
    assert tiers.IP_CEILING.replies_per_day == 60


def test_allowances_never_decrease_as_you_climb():
    previous = tiers.caps_for(tiers.T0_VISITOR)
    for tier in range(tiers.T1_NEW, tiers.MAX_TIER + 1):
        current = tiers.caps_for(tier)
        assert current.posts_per_day >= previous.posts_per_day
        assert current.replies_per_day >= previous.replies_per_day
        assert current.reports_per_day >= previous.reports_per_day
        previous = current


def test_visitor_is_strictly_tighter_than_a_new_account():
    """The point of signing up has to be visible in the allowance."""
    visitor = tiers.caps_for(tiers.T0_VISITOR)
    new = tiers.caps_for(tiers.T1_NEW)
    assert visitor.posts_per_day < new.posts_per_day
    assert visitor.replies_per_day < new.replies_per_day


def test_replies_are_always_more_generous_than_posts():
    """Answering people is the behaviour we want; posts are where spam lives."""
    for tier in range(tiers.MIN_TIER, tiers.MAX_TIER + 1):
        caps = tiers.caps_for(tier)
        assert caps.replies_per_day > caps.posts_per_day


def test_ip_ceiling_sits_above_a_single_new_account():
    """Otherwise one member alone would trip the whole network's backstop."""
    t1 = tiers.caps_for(tiers.T1_NEW)
    assert tiers.IP_CEILING.posts_per_day > t1.posts_per_day
    assert tiers.IP_CEILING.replies_per_day > t1.replies_per_day


def test_professional_does_not_outrank_trusted_on_volume():
    """T4 is a disclosure obligation, not a licence to post more."""
    assert tiers.caps_for(tiers.T4_PROFESSIONAL) == tiers.caps_for(tiers.T3_TRUSTED)


def test_caps_are_immutable():
    caps = tiers.caps_for(tiers.T1_NEW)
    with pytest.raises(Exception):
        caps.posts_per_day = 9999


def test_out_of_range_tiers_clamp_rather_than_raise():
    """A bad row must not throw inside a write path, nor promote by accident."""
    assert tiers.caps_for(99) == tiers.caps_for(tiers.T4_PROFESSIONAL)
    assert tiers.caps_for(-5) == tiers.caps_for(tiers.T0_VISITOR)


# --- Action families ----------------------------------------------------------


def test_every_concrete_action_maps_to_a_family():
    for action, family in tiers.ACTION_FAMILY.items():
        assert family in tiers.FAMILIES
        assert tiers.family_for(action) == family


def test_all_post_kinds_share_one_allowance():
    for action in ("journey", "question", "timeline", "thread"):
        assert tiers.family_for(action) == tiers.POST


def test_reports_are_their_own_family():
    """Throttling reports like posts would suppress the moderation signal."""
    assert tiers.family_for("report") == tiers.REPORT
    assert tiers.REPORT not in (tiers.POST, tiers.REPLY)


def test_unknown_action_is_rejected_loudly():
    with pytest.raises(ValueError):
        tiers.family_for("nonsense")


def test_for_action_accepts_both_concrete_actions_and_families():
    caps = tiers.caps_for(tiers.T1_NEW)
    assert caps.for_action("question") == caps.for_action(tiers.POST) == 5
    assert caps.for_action("comment") == caps.for_action(tiers.REPLY) == 20


# --- Effective tier -----------------------------------------------------------


def test_a_passwordless_row_is_t0_whatever_the_column_says():
    """``trust_tier`` defaults to 1 on every row, including bare devices."""
    assert (
        tiers.effective_tier(has_account=False, stored_tier=tiers.DEFAULT_ACCOUNT_TIER)
        == tiers.T0_VISITOR
    )
    assert (
        tiers.effective_tier(has_account=False, stored_tier=tiers.T3_TRUSTED)
        == tiers.T0_VISITOR
    )


def test_an_account_gets_its_stored_tier():
    assert (
        tiers.effective_tier(has_account=True, stored_tier=tiers.T2_ESTABLISHED)
        == tiers.T2_ESTABLISHED
    )


def test_an_account_with_no_stored_tier_starts_on_probation():
    assert (
        tiers.effective_tier(has_account=True, stored_tier=None) == tiers.DEFAULT_ACCOUNT_TIER
    )
    assert tiers.DEFAULT_ACCOUNT_TIER == tiers.T1_NEW


def test_effective_tier_clamps_a_corrupt_value():
    assert tiers.effective_tier(has_account=True, stored_tier=99) == tiers.T4_PROFESSIONAL
    assert tiers.effective_tier(has_account=True, stored_tier=-1) == tiers.T0_VISITOR


# --- Windows ------------------------------------------------------------------


def test_window_start_is_utc_midnight():
    start = tiers.day_window_start(
        datetime(2026, 7, 18, 23, 59, 59, tzinfo=timezone.utc)
    )
    assert (start.hour, start.minute, start.second, start.microsecond) == (0, 0, 0, 0)
    assert start.tzinfo is timezone.utc
    assert start.date().isoformat() == "2026-07-18"


def test_same_day_moments_share_a_bucket():
    morning = tiers.day_window_start(datetime(2026, 7, 18, 0, 1, tzinfo=timezone.utc))
    evening = tiers.day_window_start(datetime(2026, 7, 18, 23, 58, tzinfo=timezone.utc))
    assert morning == evening


def test_midnight_starts_a_new_bucket():
    before = tiers.day_window_start(
        datetime(2026, 7, 18, 23, 59, tzinfo=timezone.utc)
    )
    after = tiers.day_window_start(datetime(2026, 7, 19, 0, 0, tzinfo=timezone.utc))
    assert after - before == timedelta(days=1)


def test_naive_datetimes_are_read_as_utc():
    """A naive value must not silently shift the bucket by the host's offset."""
    naive = tiers.day_window_start(datetime(2026, 7, 18, 12, 0))
    aware = tiers.day_window_start(datetime(2026, 7, 18, 12, 0, tzinfo=timezone.utc))
    assert naive == aware


def test_non_utc_input_is_converted_not_truncated():
    """13:00 in UTC+11 is 02:00 UTC — the same day, but only if we convert."""
    tz = timezone(timedelta(hours=11))
    start = tiers.day_window_start(datetime(2026, 7, 18, 13, 0, tzinfo=tz))
    assert start == datetime(2026, 7, 18, 0, 0, tzinfo=timezone.utc)
