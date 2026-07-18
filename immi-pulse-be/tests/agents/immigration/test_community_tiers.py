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


# --- Promotion policy (p6) ----------------------------------------------------
#
# compute_tier is pure, so the whole ladder can be argued about here rather than
# discovered in production. Every test below constructs the signals by hand.


def _signals(**overrides) -> tiers.TrustSignals:
    """A member who has cleanly earned T2, unless a test says otherwise."""
    base = dict(
        account_age_days=10,
        surviving_contributions=6,
        net_votes=3,
        upheld_reports=0,
        upheld_reports_recent=0,
        completed_timelines=0,
        email_verified=False,
        is_professional=False,
    )
    base.update(overrides)
    return tiers.TrustSignals(**base)


def test_a_brand_new_account_is_t1():
    assert tiers.compute_tier(_signals(account_age_days=0, surviving_contributions=0,
                                       net_votes=0)) == tiers.T1_NEW


def test_the_baseline_member_earns_t2():
    assert tiers.compute_tier(_signals()) == tiers.T2_ESTABLISHED


@pytest.mark.parametrize(
    "missing",
    [
        {"account_age_days": 6},          # a day short of the tenure bar
        {"surviving_contributions": 4},   # one contribution short
        {"net_votes": 0},                 # nobody has found anything useful yet
    ],
)
def test_every_t2_requirement_is_load_bearing(missing):
    """Each condition alone must be able to withhold T2.

    Without this, a criterion could quietly stop being checked and the suite
    would stay green — the failure mode where a gate exists in the docstring
    and nowhere else.
    """
    assert tiers.compute_tier(_signals(**missing)) == tiers.T1_NEW


def test_a_verified_email_shortens_probation_but_does_not_skip_it():
    four_days = _signals(account_age_days=4, email_verified=True)
    assert tiers.compute_tier(four_days) == tiers.T2_ESTABLISHED
    # Still not instant: verification shortens the wait, it does not remove it.
    two_days = _signals(account_age_days=2, email_verified=True)
    assert tiers.compute_tier(two_days) == tiers.T1_NEW


def _t3_signals(**overrides) -> tiers.TrustSignals:
    base = dict(account_age_days=120, surviving_contributions=30, completed_timelines=1)
    base.update(overrides)
    return _signals(**base)


def test_t3_needs_tenure_volume_and_a_finished_visa_queue():
    assert tiers.compute_tier(_t3_signals()) == tiers.T3_TRUSTED


def test_t3_is_refused_without_a_completed_timeline():
    """The anti-farming gate: tenure and volume alone must not reach T3.

    Sitting out a visa queue is the one signal a patient script cannot
    manufacture, which is exactly why it is the T3 requirement.
    """
    assert tiers.compute_tier(_t3_signals(completed_timelines=0)) == tiers.T2_ESTABLISHED


def test_a_recent_upheld_report_blocks_both_promotions():
    assert tiers.compute_tier(_t3_signals(upheld_reports=1, upheld_reports_recent=1)) == (
        tiers.T1_NEW
    )
    assert tiers.compute_tier(_signals(upheld_reports=1, upheld_reports_recent=1)) == (
        tiers.T1_NEW
    )


def test_an_old_upheld_report_stops_counting():
    """Moderation is a setback, not a permanent record.

    The lifetime count is still 1 — it has simply aged out of the window — and
    the member can be established again. A single upheld call, which is
    sometimes wrong, must not cost someone the room for ever.
    """
    aged_out = _signals(upheld_reports=1, upheld_reports_recent=0)
    assert tiers.compute_tier(aged_out) == tiers.T2_ESTABLISHED


def test_the_ladder_is_monotone():
    """Anything that earns T3 must also satisfy T2.

    Reading the written criteria literally (T2 "no upheld reports" vs T3 "none
    in 90 days") gives a ladder where a member could qualify for T3 and be
    barred from T2. That is not a ladder, so both use the same recency window —
    and this test is what stops the inconsistency being reintroduced.
    """
    t3 = _t3_signals(upheld_reports=1, upheld_reports_recent=0)
    assert tiers.compute_tier(t3) == tiers.T3_TRUSTED
    assert tiers.may_post_contact_details(tiers.compute_tier(t3))


def test_a_pattern_of_upheld_reports_returns_an_account_to_probation():
    demoted = _t3_signals(
        upheld_reports=tiers.SHADOW_LIMIT_UPHELD_THRESHOLD,
        upheld_reports_recent=0,
    )
    assert tiers.compute_tier(demoted) == tiers.T1_NEW


def test_a_professional_keeps_the_disclosure_tier():
    """T4 is a disclosure the reader is owed, not a reward for behaving.

    An agent who misbehaves gets shadow-limited and moderated like anyone else;
    what must never happen is the badge saying who they are quietly falling off
    while they keep posting.
    """
    assert tiers.compute_tier(_signals(is_professional=True, upheld_reports=5)) == (
        tiers.T4_PROFESSIONAL
    )


# --- What a tier unlocks ------------------------------------------------------


def test_contact_details_unlock_at_t2():
    assert not tiers.may_post_contact_details(tiers.T0_VISITOR)
    assert not tiers.may_post_contact_details(tiers.T1_NEW)
    assert tiers.may_post_contact_details(tiers.T2_ESTABLISHED)
    assert tiers.may_post_contact_details(tiers.T3_TRUSTED)
    assert tiers.may_post_contact_details(tiers.T4_PROFESSIONAL)


def test_the_ip_ceiling_stops_binding_at_t2():
    """The resolution of the shared-IP tension.

    T0/T1 is where free account creation makes per-account caps meaningless, so
    the network backstop applies there. An established account has paid a week
    and real participation, which five flatmates each manage and a spam ring
    does not — so the ceiling stops landing on the household.
    """
    assert tiers.ip_ceiling_applies(tiers.T0_VISITOR)
    assert tiers.ip_ceiling_applies(tiers.T1_NEW)
    assert not tiers.ip_ceiling_applies(tiers.T2_ESTABLISHED)
    assert not tiers.ip_ceiling_applies(tiers.T3_TRUSTED)


# --- Weighted reports ---------------------------------------------------------


def test_report_weight_rises_with_standing():
    assert tiers.report_weight(tiers.T1_NEW) == 1
    assert tiers.report_weight(tiers.T2_ESTABLISHED) == 3
    assert tiers.report_weight(tiers.T3_TRUSTED) >= tiers.AUTO_HOLD_REPORT_WEIGHT


def test_one_trusted_report_holds_content_on_its_own():
    """"T3 reports auto-hide", expressed as a weight rather than a special case."""
    assert tiers.report_weight(tiers.T3_TRUSTED) >= tiers.AUTO_HOLD_REPORT_WEIGHT


def test_no_single_established_report_can_hold_content():
    """One annoyed member must not be able to silence another.

    In a room where people disagree about agents and outcomes, a control where
    a single report hides a post would be used to settle arguments within the
    week. Two established members, or five new ones, is a defensible bar; one
    person is not.
    """
    assert tiers.report_weight(tiers.T2_ESTABLISHED) < tiers.AUTO_HOLD_REPORT_WEIGHT
    assert 2 * tiers.report_weight(tiers.T2_ESTABLISHED) >= tiers.AUTO_HOLD_REPORT_WEIGHT


def test_new_accounts_need_a_real_consensus_to_hold_anything():
    assert (
        tiers.AUTO_HOLD_REPORT_WEIGHT / tiers.report_weight(tiers.T1_NEW) >= 5
    )
