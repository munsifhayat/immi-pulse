"""Pure-logic processing-time engine — the heart of "is my wait normal?".

No database or framework imports live here so the percentile maths and the
reassurance verdict can be unit-tested in isolation. The service layer feeds it
plain lists of integer durations (days) pulled from ``CommunityTimeline`` rows.

Design rules baked in (from the community product plan):
  * Reassurance, not ranking — verdicts frame a position as *normalcy*.
  * Honest denominators — pending (still-waiting) counts travel with every stat
    so we never imply survivorship-biased speed.
  * No "fastest grant" leaderboard — ``fastest`` is shown only as a range edge.
"""

from __future__ import annotations

from typing import Optional, Sequence


def percentile(values: Sequence[int], p: float) -> Optional[float]:
    """Linear-interpolated percentile (p in 0..100). None for empty input."""
    xs = sorted(values)
    n = len(xs)
    if n == 0:
        return None
    if n == 1:
        return float(xs[0])
    rank = (p / 100.0) * (n - 1)
    lo = int(rank)
    hi = min(lo + 1, n - 1)
    frac = rank - lo
    return xs[lo] + (xs[hi] - xs[lo]) * frac


def _round_or_none(value: Optional[float]) -> Optional[int]:
    return None if value is None else int(round(value))


def compute_stats(decided_days: Sequence[int], pending: int = 0) -> dict:
    """Aggregate community processing durations into percentile bands.

    ``decided_days`` are processing durations (in days) for *decided* cases;
    ``pending`` is the count of still-waiting applications for the same cohort.
    """
    decided = [d for d in decided_days if d is not None and d >= 0]
    sample = len(decided)
    if sample == 0:
        return {
            "sample_size": 0,
            "pending": pending,
            "p25": None,
            "p50": None,
            "p75": None,
            "p90": None,
            "fastest": None,
            "slowest": None,
        }
    return {
        "sample_size": sample,
        "pending": pending,
        "p25": _round_or_none(percentile(decided, 25)),
        "p50": _round_or_none(percentile(decided, 50)),
        "p75": _round_or_none(percentile(decided, 75)),
        "p90": _round_or_none(percentile(decided, 90)),
        "fastest": min(decided),
        "slowest": max(decided),
    }


def share_decided_within(decided_days: Sequence[int], elapsed_days: int) -> Optional[int]:
    """Percent of decided cases finalised within ``elapsed_days`` (0..100)."""
    decided = [d for d in decided_days if d is not None and d >= 0]
    if not decided:
        return None
    within = sum(1 for d in decided if d <= elapsed_days)
    return int(round(100 * within / len(decided)))


# Verdict tiers, ordered from most to least reassuring. Each maps to a copy
# block; the UI colour-codes by ``tier``.
_TIERS = {
    "on_track": "On track",
    "normal": "Completely normal",
    "longer": "On the longer side",
    "outlier": "Longer than most",
    "unknown": "Not enough data yet",
}


def wait_verdict(
    elapsed_days: int,
    *,
    decided_days: Sequence[int],
    pending: int = 0,
    subclass_label: str = "these",
) -> dict:
    """Classify an in-progress wait against the community distribution.

    Returns a tier + reassurance copy, the share of decided cases finalised by
    now, and the band thresholds the UI needs to draw the position bar.
    """
    stats = compute_stats(decided_days, pending=pending)
    p50, p75, p90 = stats["p50"], stats["p75"], stats["p90"]
    share = share_decided_within(decided_days, elapsed_days)

    if stats["sample_size"] < 5 or p50 is None:
        return {
            "tier": "unknown",
            "headline": _TIERS["unknown"],
            "detail": (
                "We don't have enough reported timelines for this visa yet to "
                "say what's typical. Share yours to help build the picture."
            ),
            "elapsed_days": elapsed_days,
            "share_decided_within": share,
            **stats,
        }

    pending_note = (
        f" Around {pending} people who lodged a {subclass_label} application "
        "are still waiting too."
        if pending
        else ""
    )

    if elapsed_days <= p50:
        tier = "on_track"
        detail = (
            f"Your wait is within the typical range. Most {subclass_label} "
            "applications are still in progress at this point — there's no "
            "signal here that anything is wrong." + pending_note
        )
    elif p75 is not None and elapsed_days <= p75:
        tier = "normal"
        detail = (
            "A little past the median, but comfortably inside the usual range. "
            "Plenty of applications take this long." + pending_note
        )
    elif p90 is not None and elapsed_days <= p90:
        tier = "longer"
        detail = (
            "On the longer side, yet still within the normal range — roughly "
            "1 in 4 cases take at least this long." + pending_note
        )
    else:
        tier = "outlier"
        detail = (
            "Longer than most recent grants. This does happen, and a long wait "
            "isn't a verdict on your case. It may be worth a gentle follow-up, "
            "or a check-in with an OMARA-registered agent." + pending_note
        )

    return {
        "tier": tier,
        "headline": _TIERS[tier],
        "detail": detail,
        "elapsed_days": elapsed_days,
        "share_decided_within": share,
        **stats,
    }
