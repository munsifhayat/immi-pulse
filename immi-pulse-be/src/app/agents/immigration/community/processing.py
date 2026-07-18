"""Pure-logic processing-time engine — the heart of "is my wait normal?".

No database or framework imports live here so the percentile maths and the
reassurance verdict can be unit-tested in isolation. The service layer feeds it
plain lists of integer durations (days) pulled from ``CommunityTimeline`` rows.

Design rules baked in (from the community product plan):
  * Reassurance, not ranking — verdicts frame a position as *normalcy*.
  * Honest denominators — pending (still-waiting) counts travel with every stat
    so we never imply survivorship-biased speed.
  * No "fastest grant" leaderboard — ``fastest`` is shown only as a range edge.
  * **No bare numbers.** Every median carries its sample size, its pending
    count, its provenance split and whether we consider it sufficient. A figure
    that cannot say what it is made of does not get published.

A note on the survivorship bias this file only half-fixes. Community percentiles
are computed from *decided* cases, which understates real waits: fast grants
leave the queue and land in the sample, while the slow cases that would drag the
median up are still sitting in it. That is textbook right-censoring. The proper
correction is Kaplan–Meier, treating still-waiting cases as censored
observations. It is **deliberately deferred** (Phase 4 decision, recorded in
.phase/community-mvp/PROGRESS.md). What ships instead is the honest disclosure
of the denominator — ``pending`` beside every ``sample_size`` — so the number is
never presented as more than it is. ``pending`` is therefore not decoration; it
is the standing admission that the median is optimistic.
"""

from __future__ import annotations

from datetime import date
from typing import Optional, Sequence

# Milestone types that mark the start of the official wait, in priority order.
# The visa lodgement is the truest "clock start"; fall back progressively.
LODGED_MILESTONES = ("Visa Lodged", "Nomination Lodged", "Skills Assessment Lodged")
GRANTED_MILESTONE = "Visa Granted"

# Defaults mirroring app.core.config; passed in explicitly by the service so this
# module keeps its "no framework imports" property and stays unit-testable.
DEFAULT_MIN_SAMPLE = 20
DEFAULT_WINDOW_MONTHS = 12


def derive_span(
    milestones: Sequence[tuple[str, Optional[date]]],
    outcome: str,
) -> tuple[Optional[date], Optional[date], Optional[int]]:
    """Collapse an ordered milestone list into a (lodged, decided, days) span.

    Keeps the legacy percentile engine working: ``lodged`` is the earliest
    lodgement-type milestone (or the earliest milestone overall), ``decided`` is
    the grant date when the outcome is decided. Returns ``None`` parts when a
    span can't be formed (e.g. a question post or a profile with no dates).
    """
    dated = sorted(
        [(t, d) for t, d in milestones if d is not None], key=lambda x: x[1]
    )
    if not dated:
        return (None, None, None)

    lodged: Optional[date] = None
    for anchor in LODGED_MILESTONES:
        candidates = [d for t, d in dated if t == anchor]
        if candidates:
            lodged = min(candidates)
            break
    if lodged is None:
        lodged = dated[0][1]

    decided: Optional[date] = None
    if outcome == "granted":
        grants = [d for t, d in dated if t == GRANTED_MILESTONE]
        decided = max(grants) if grants else dated[-1][1]
    elif outcome == "refused":
        decided = dated[-1][1]

    days: Optional[int] = None
    if decided is not None and lodged is not None and decided >= lodged:
        days = (decided - lodged).days

    return (lodged, decided, days)


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


def provenance_block(
    *, member_reported: int = 0, forum_collected: int = 0
) -> dict:
    """The composition of a sample, as a payload the UI can render verbatim.

    Every Room figure travels with one of these. Publishing the split is the
    condition under which forum-collected timelines were allowed to count at
    all: a reader who thinks "collected from a forum" is weaker evidence than
    "reported by a member" can see exactly how much of the number is which, and
    discount it themselves. A total alone would hide that choice from them.
    """
    return {
        "member_reported": int(member_reported),
        "forum_collected": int(forum_collected),
        "total": int(member_reported) + int(forum_collected),
    }


def provenance_note(
    *, member_reported: int = 0, forum_collected: int = 0
) -> Optional[str]:
    """One plain sentence describing where a figure came from.

    Rendered beside the number. Returns ``None`` when there is nothing to
    describe, so a caller can never accidentally print "based on 0 timelines".
    """
    member = int(member_reported)
    forum = int(forum_collected)
    total = member + forum
    if total <= 0:
        return None

    def _tl(n: int) -> str:
        return f"{n:,} timeline" + ("" if n == 1 else "s")

    if forum == 0:
        return f"Based on {_tl(member)} reported by members."
    if member == 0:
        return f"Based on {_tl(forum)} collected from public immigration forums."
    return (
        f"Based on {_tl(total)} — {member:,} reported by members, "
        f"{forum:,} collected from public immigration forums."
    )


def compute_stats(
    decided_days: Sequence[int],
    pending: int = 0,
    *,
    member_reported: int = 0,
    forum_collected: int = 0,
    min_sample: int = DEFAULT_MIN_SAMPLE,
    window_months: int = DEFAULT_WINDOW_MONTHS,
) -> dict:
    """Aggregate community processing durations into percentile bands.

    ``decided_days`` are processing durations (in days) for *decided* cases;
    ``pending`` is the count of still-waiting applications for the same cohort.
    ``member_reported`` / ``forum_collected`` describe where the whole cohort
    (decided **and** pending) came from — they are the composition of the thing
    the reader is being shown, not of the percentile maths alone.

    ``sufficient`` is the gate the UI reads: below ``min_sample`` decided cases
    the percentiles are still returned (they are honest, just thin) but the
    caller is told not to present them as an answer.
    """
    decided = [d for d in decided_days if d is not None and d >= 0]
    sample = len(decided)
    provenance = provenance_block(
        member_reported=member_reported, forum_collected=forum_collected
    )
    base = {
        "sample_size": sample,
        "pending": pending,
        "sufficient": sample >= min_sample,
        "min_sample": min_sample,
        "window_months": window_months,
        "provenance": provenance,
        "provenance_note": provenance_note(
            member_reported=member_reported, forum_collected=forum_collected
        ),
    }
    if sample == 0:
        return {
            **base,
            "p25": None,
            "p50": None,
            "p75": None,
            "p90": None,
            "fastest": None,
            "slowest": None,
        }
    return {
        **base,
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
    member_reported: int = 0,
    forum_collected: int = 0,
    min_sample: int = DEFAULT_MIN_SAMPLE,
    window_months: int = DEFAULT_WINDOW_MONTHS,
) -> dict:
    """Classify an in-progress wait against the community distribution.

    Returns a tier + reassurance copy, the share of decided cases finalised by
    now, and the band thresholds the UI needs to draw the position bar.

    Below ``min_sample`` decided cases this returns the ``unknown`` tier rather
    than a thin median. The caller (``CommunityService.wait_check``) reads that
    as "fall back to the official bands" — so a person asking about a quiet visa
    gets a real, attributable answer instead of a number computed from four
    strangers.
    """
    stats = compute_stats(
        decided_days,
        pending=pending,
        member_reported=member_reported,
        forum_collected=forum_collected,
        min_sample=min_sample,
        window_months=window_months,
    )
    p50, p75, p90 = stats["p50"], stats["p75"], stats["p90"]
    share = share_decided_within(decided_days, elapsed_days)

    if not stats["sufficient"] or p50 is None:
        return {
            "tier": "unknown",
            "basis": "none",
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
        "basis": "community",
        "headline": _TIERS[tier],
        "detail": detail,
        "elapsed_days": elapsed_days,
        "share_decided_within": share,
        **stats,
    }


def wait_verdict_official(
    elapsed_days: int,
    *,
    official_p50: Optional[int],
    official_p90: Optional[int],
    subclass_label: str = "these",
    member_reported: int = 0,
    forum_collected: int = 0,
    min_sample: int = DEFAULT_MIN_SAMPLE,
    window_months: int = DEFAULT_WINDOW_MONTHS,
) -> dict:
    """Verdict from the official Home Affairs processing bands.

    Used when the community cohort is too thin to publish (``sufficient`` is
    false). It relies only on the department's published 50%/90% finalisation
    marks — real, attributable public figures — so the check still answers
    honestly before enough timelines have accumulated.

    The percentile fields carry the *official* bands, and ``basis`` says so. The
    community counts are still reported truthfully alongside: telling someone
    "official figures, and we have 7 community timelines which isn't enough yet"
    is more honest than reporting a zero we know to be wrong, and it is what
    invites them to add the eighth.

    Two fields that look contradictory and are not:
      * ``sample_size`` is **0** here on purpose — it counts the decided cases
        *behind the percentiles being shown*, and these percentiles are the
        department's, not the room's. Reporting anything else would credit
        community data for a number it did not produce.
      * ``provenance`` describes the community cohort that *exists* for this
        visa, used or not. That is what makes "we have 7, not enough yet"
        sayable.
    """
    base = {
        "elapsed_days": elapsed_days,
        "share_decided_within": None,
        "sample_size": 0,
        "pending": 0,
        "sufficient": False,
        "min_sample": min_sample,
        "window_months": window_months,
        "provenance": provenance_block(
            member_reported=member_reported, forum_collected=forum_collected
        ),
        "provenance_note": provenance_note(
            member_reported=member_reported, forum_collected=forum_collected
        ),
        "p25": None,
        "p50": official_p50,
        "p75": None,
        "p90": official_p90,
        "fastest": None,
        "slowest": None,
    }

    if official_p50 is None:
        return {
            "tier": "unknown",
            "basis": "none",
            "headline": _TIERS["unknown"],
            "detail": (
                "We don't have official or community figures for this visa yet. "
                "Share your timeline to help build the picture."
            ),
            **base,
        }

    if elapsed_days <= official_p50:
        tier = "on_track"
        detail = (
            f"Your wait is within the typical range. Officially, fewer than half of "
            f"{subclass_label} applications are finalised by this point — there's no "
            "signal here that anything is wrong."
        )
    elif official_p90 is not None and elapsed_days <= official_p90:
        tier = "longer"
        detail = (
            "On the longer side, but still within the normal range — official figures "
            f"show up to 90% of {subclass_label} applications are decided by around "
            "this point."
        )
    else:
        tier = "outlier"
        detail = (
            "Longer than the official guide for most recent cases. This does happen, "
            "and a long wait isn't a verdict on your case — it may be worth a gentle "
            "follow-up or a check-in with an OMARA-registered agent."
        )

    return {
        "tier": tier,
        "basis": "official",
        "headline": _TIERS[tier],
        "detail": detail,
        **base,
    }
