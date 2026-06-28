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


def test_verdict_unknown_when_too_few():
    out = processing.wait_verdict(60, decided_days=[10, 20, 30], pending=0)
    assert out["tier"] == "unknown"
    assert "enough" in out["detail"].lower()


def test_verdict_on_track_below_median():
    out = processing.wait_verdict(40, decided_days=SAMPLE, pending=5)
    assert out["tier"] == "on_track"
    assert out["elapsed_days"] == 40
    assert out["sample_size"] == 10


def test_verdict_normal_between_median_and_p75():
    p50 = processing.compute_stats(SAMPLE)["p50"]
    p75 = processing.compute_stats(SAMPLE)["p75"]
    elapsed = (p50 + p75) // 2
    out = processing.wait_verdict(elapsed, decided_days=SAMPLE)
    assert out["tier"] == "normal"


def test_verdict_outlier_beyond_p90_mentions_pending():
    out = processing.wait_verdict(400, decided_days=SAMPLE, pending=9, subclass_label="189")
    assert out["tier"] == "outlier"
    assert "9 people" in out["detail"]
    assert "189" in out["detail"]


def test_verdict_band_ordering_is_monotonic():
    """Increasing elapsed waits never produce a more reassuring tier."""
    order = {"on_track": 0, "normal": 1, "longer": 2, "outlier": 3}
    last = -1
    for elapsed in (10, 90, 130, 165, 300):
        tier = processing.wait_verdict(elapsed, decided_days=SAMPLE)["tier"]
        assert order[tier] >= last
        last = order[tier]
