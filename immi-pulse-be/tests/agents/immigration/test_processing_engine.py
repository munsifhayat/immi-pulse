"""Unit tests for the community processing-time engine (pure logic, no DB)."""

from __future__ import annotations

import pytest

from app.agents.immigration.community import processing


# --- percentile -------------------------------------------------------------


def test_percentile_empty_is_none():
    assert processing.percentile([], 50) is None


def test_percentile_single_value():
    assert processing.percentile([42], 90) == 42.0


def test_percentile_endpoints_and_median():
    xs = [10, 20, 30, 40, 50]
    assert processing.percentile(xs, 0) == 10
    assert processing.percentile(xs, 100) == 50
    assert processing.percentile(xs, 50) == 30


def test_percentile_interpolates():
    # 90th percentile of 1..10 with linear interpolation = 9.1
    xs = list(range(1, 11))
    assert processing.percentile(xs, 90) == pytest.approx(9.1)


def test_percentile_is_order_independent():
    assert processing.percentile([50, 10, 30, 20, 40], 25) == 20


# --- compute_stats ----------------------------------------------------------


def test_compute_stats_empty_keeps_pending():
    stats = processing.compute_stats([], pending=7)
    assert stats["sample_size"] == 0
    assert stats["pending"] == 7
    assert stats["p50"] is None
    assert stats["fastest"] is None


def test_compute_stats_bands_and_edges():
    days = [30, 60, 90, 120, 150, 180, 210, 240]
    stats = processing.compute_stats(days, pending=12)
    assert stats["sample_size"] == 8
    assert stats["pending"] == 12
    assert stats["fastest"] == 30
    assert stats["slowest"] == 240
    # Monotonic, rounded integer bands.
    assert stats["p25"] <= stats["p50"] <= stats["p75"] <= stats["p90"]
    assert all(isinstance(stats[k], int) for k in ("p25", "p50", "p75", "p90"))


def test_compute_stats_ignores_negative_durations():
    stats = processing.compute_stats([-5, 10, 20, 30], pending=0)
    assert stats["sample_size"] == 3
    assert stats["fastest"] == 10


def test_share_decided_within():
    days = [10, 20, 30, 40]
    assert processing.share_decided_within(days, 25) == 50
    assert processing.share_decided_within(days, 5) == 0
    assert processing.share_decided_within(days, 100) == 100
    assert processing.share_decided_within([], 25) is None


# --- wait_verdict -----------------------------------------------------------

# A clean distribution: p50≈100, p75≈140, p90≈170 (approx).
SAMPLE = [30, 50, 70, 90, 100, 110, 130, 150, 170, 190]

# The tests below are about *band classification* — which tier a given elapsed
# wait lands in — so they lower the sufficiency floor rather than pad SAMPLE out
# to twenty values that would move the percentiles they assert against. The
# floor itself is covered separately, against the real default, further down.
BANDS = {"min_sample": 5}


def test_verdict_unknown_when_too_few():
    out = processing.wait_verdict(60, decided_days=[10, 20, 30], pending=0, **BANDS)
    assert out["tier"] == "unknown"
    assert "enough" in out["detail"].lower()


def test_verdict_on_track_below_median():
    out = processing.wait_verdict(40, decided_days=SAMPLE, pending=5, **BANDS)
    assert out["tier"] == "on_track"
    assert out["elapsed_days"] == 40
    assert out["sample_size"] == 10


def test_verdict_normal_between_median_and_p75():
    p50 = processing.compute_stats(SAMPLE)["p50"]
    p75 = processing.compute_stats(SAMPLE)["p75"]
    elapsed = (p50 + p75) // 2
    out = processing.wait_verdict(elapsed, decided_days=SAMPLE, **BANDS)
    assert out["tier"] == "normal"


def test_verdict_outlier_beyond_p90_mentions_pending():
    out = processing.wait_verdict(
        400, decided_days=SAMPLE, pending=9, subclass_label="189", **BANDS
    )
    assert out["tier"] == "outlier"
    assert "9 people" in out["detail"]
    assert "189" in out["detail"]


def test_verdict_band_ordering_is_monotonic():
    """Increasing elapsed waits never produce a more reassuring tier."""
    order = {"on_track": 0, "normal": 1, "longer": 2, "outlier": 3}
    last = -1
    for elapsed in (10, 90, 130, 165, 300):
        tier = processing.wait_verdict(elapsed, decided_days=SAMPLE, **BANDS)["tier"]
        assert order[tier] >= last
        last = order[tier]


def test_community_verdict_reports_community_basis():
    out = processing.wait_verdict(40, decided_days=SAMPLE, **BANDS)
    assert out["basis"] == "community"


def test_unknown_verdict_reports_none_basis():
    out = processing.wait_verdict(60, decided_days=[10, 20, 30], **BANDS)
    assert out["tier"] == "unknown"
    assert out["basis"] == "none"


# --- wait_verdict_official (cold-start fallback) -----------------------------


def test_official_on_track_below_p50():
    out = processing.wait_verdict_official(
        90, official_p50=180, official_p90=360, subclass_label="189"
    )
    assert out["tier"] == "on_track"
    assert out["basis"] == "official"
    assert out["sample_size"] == 0  # never implies a community sample
    assert out["pending"] == 0
    assert out["p50"] == 180
    assert out["p90"] == 360
    assert out["p25"] is None and out["p75"] is None


def test_official_longer_between_p50_and_p90():
    out = processing.wait_verdict_official(270, official_p50=180, official_p90=360)
    assert out["tier"] == "longer"
    assert out["basis"] == "official"


def test_official_outlier_beyond_p90():
    out = processing.wait_verdict_official(500, official_p50=180, official_p90=360)
    assert out["tier"] == "outlier"
    assert out["basis"] == "official"


def test_official_unknown_when_no_p50():
    out = processing.wait_verdict_official(100, official_p50=None, official_p90=None)
    assert out["tier"] == "unknown"
    assert out["basis"] == "none"


def test_official_verdict_monotonic():
    order = {"on_track": 0, "longer": 2, "outlier": 3}
    last = -1
    for elapsed in (10, 180, 300, 400):
        tier = processing.wait_verdict_official(
            elapsed, official_p50=180, official_p90=360
        )["tier"]
        assert order[tier] >= last
        last = order[tier]


# ===========================================================================
# Phase 4 — honest numbers: sufficiency floor, provenance, censoring
# ===========================================================================

# --- the n = 20 floor -------------------------------------------------------


def _n(count: int, start: int = 60, step: int = 7) -> list[int]:
    """A monotone run of ``count`` plausible durations."""
    return [start + i * step for i in range(count)]


def test_sufficiency_floor_defaults_to_twenty():
    assert processing.DEFAULT_MIN_SAMPLE == 20


def test_nineteen_decided_cases_is_not_sufficient():
    stats = processing.compute_stats(_n(19))
    assert stats["sample_size"] == 19
    assert stats["sufficient"] is False
    # The percentiles are still computed — they are honest, merely thin. What
    # changes is that the caller is told not to present them as an answer.
    assert stats["p50"] is not None


def test_twenty_decided_cases_is_sufficient():
    stats = processing.compute_stats(_n(20))
    assert stats["sample_size"] == 20
    assert stats["sufficient"] is True


def test_thin_cohort_yields_unknown_tier_at_default_floor():
    """Nineteen real grants is still not enough to tell someone what is normal."""
    out = processing.wait_verdict(100, decided_days=_n(19))
    assert out["tier"] == "unknown"
    assert out["basis"] == "none"
    assert out["sufficient"] is False


def test_sufficient_cohort_yields_a_real_verdict():
    out = processing.wait_verdict(70, decided_days=_n(20))
    assert out["tier"] != "unknown"
    assert out["basis"] == "community"
    assert out["sufficient"] is True


# --- provenance -------------------------------------------------------------


def test_provenance_block_totals():
    p = processing.provenance_block(member_reported=75, forum_collected=66)
    assert p == {"member_reported": 75, "forum_collected": 66, "total": 141}


def test_provenance_note_states_the_split():
    note = processing.provenance_note(member_reported=75, forum_collected=66)
    assert "141" in note
    assert "75" in note
    assert "66" in note
    assert "forum" in note.lower()


def test_provenance_note_member_only_does_not_mention_forums():
    note = processing.provenance_note(member_reported=30, forum_collected=0)
    assert "forum" not in note.lower()
    assert "30" in note


def test_provenance_note_forum_only_says_so_plainly():
    note = processing.provenance_note(member_reported=0, forum_collected=12)
    assert "forum" in note.lower()
    assert "12" in note


def test_provenance_note_is_none_when_there_is_nothing_to_describe():
    """Never render "based on 0 timelines" — say nothing instead."""
    assert processing.provenance_note(member_reported=0, forum_collected=0) is None


def test_every_stat_payload_carries_its_provenance():
    """A Room figure must never travel without saying what it is made of."""
    stats = processing.compute_stats(
        _n(25), pending=8, member_reported=20, forum_collected=13
    )
    assert stats["provenance"]["total"] == 33
    assert stats["provenance"]["member_reported"] == 20
    assert stats["provenance"]["forum_collected"] == 13
    assert stats["provenance_note"] is not None
    assert stats["pending"] == 8


def test_verdict_carries_provenance_through():
    out = processing.wait_verdict(
        70, decided_days=_n(20), member_reported=15, forum_collected=5
    )
    assert out["provenance"]["total"] == 20
    assert "forum" in out["provenance_note"].lower()


def test_official_fallback_still_reports_the_room_composition():
    """Falling back does not mean pretending the room is empty."""
    out = processing.wait_verdict_official(
        100, official_p50=180, official_p90=360, member_reported=7, forum_collected=0
    )
    assert out["basis"] == "official"
    # sample_size stays 0: these percentiles are the department's, not ours.
    assert out["sample_size"] == 0
    assert out["p50"] == 180
    # ...but the seven timelines we do have are still reported honestly.
    assert out["provenance"]["total"] == 7
    assert out["sufficient"] is False


# --- right-censoring: the bias the pending count exists to disclose ----------


def test_decided_only_median_is_optimistic_when_slow_cases_are_still_waiting():
    """The core statistical dishonesty this phase discloses rather than fixes.

    A cohort where the fast cases have been granted and the slow ones are still
    in the queue: computing a median from decided cases alone reports a wait
    that no longer describes anyone's real prospects, because the very cases
    that would drag it upward are excluded *by virtue of being slow*.

    Kaplan-Meier is the correct fix and is deliberately deferred (see the module
    docstring). What must hold today is that the payload cannot be read without
    seeing the omission: ``pending`` is large, it travels with the median, and
    the verdict copy names it.
    """
    # 30 grants, all fast. 120 people still waiting, all already past the
    # decided median — every one of them will land above it when granted.
    decided_fast = _n(30, start=60, step=2)  # 60..118 days
    still_waiting = 120

    stats = processing.compute_stats(decided_fast, pending=still_waiting)
    decided_median = stats["p50"]

    # If the pending cases were decided today, at their *current* elapsed wait,
    # the median would move materially. This is the bias, quantified.
    pending_elapsed = [400] * still_waiting
    naive_median = processing.percentile(decided_fast, 50)
    censoring_aware_median = processing.percentile(
        list(decided_fast) + pending_elapsed, 50
    )
    assert censoring_aware_median > naive_median * 2, (
        "fixture is not exercising censoring — the two medians must differ "
        "materially or this test proves nothing"
    )

    # The disclosure contract: the optimistic median never travels alone.
    assert stats["pending"] == 120
    assert stats["sample_size"] == 30
    assert decided_median is not None

    out = processing.wait_verdict(
        420, decided_days=decided_fast, pending=still_waiting, subclass_label="189"
    )
    assert out["tier"] == "outlier"
    assert "120 people" in out["detail"], (
        "a median computed from fast grants alone must state how many slow "
        "cases it left out"
    )


def test_pending_count_survives_an_empty_decided_sample():
    """Nobody granted yet, plenty waiting — the waiting must still be visible."""
    stats = processing.compute_stats([], pending=44)
    assert stats["sample_size"] == 0
    assert stats["pending"] == 44
    assert stats["sufficient"] is False
    assert stats["p50"] is None


# --- the 12-month window is declared in the payload -------------------------


def test_window_months_travels_with_every_figure():
    stats = processing.compute_stats(_n(20), window_months=12)
    assert stats["window_months"] == 12
    assert processing.DEFAULT_WINDOW_MONTHS == 12
