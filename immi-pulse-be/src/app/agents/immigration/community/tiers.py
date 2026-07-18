"""Trust tiers and the write allowances that hang off them.

Pure policy: no database, no I/O, no imports from the service layer. Everything
here is a function of its arguments, so the whole ladder is unit-testable
without a session (``tests/agents/immigration/test_community_tiers.py``). The
enforcement that *uses* these numbers lives in ``community/service.py``.

The ladder, five rungs:

    T0  Visitor              no account — a device that has never set a password
    T1  New account          probation; the default the moment someone signs up
    T2  Established          earned; unlocks outbound links (gating is p6)
    T3  Trusted              earned over a real visa queue; flags auto-hide
    T4  Registered pro       an OMARA/MARN agent, disclosed — not a reward

Two things this module deliberately does NOT encode:

1. **Promotion criteria.** What earns T2 or T3 is a separate concern with its
   own nightly job. This module answers "given a tier, what may they do?" and
   nothing else.
2. **Email verification as a rung.** Verifying an email is an *attribute* that
   shortens probation, never a tier of its own. Making it a tier would quietly
   turn an optional field into a required one, and optional email is the
   decision the whole identity model rests on.

Two scopes are enforced, and they are not the same thing:

- **Per account** — the tier caps below. This is the control that shapes an
  individual member's day.
- **Per IP** — :data:`IP_CEILING`, a network-level backstop. It exists because
  accounts are free to create, so per-account caps alone do not bind. It is a
  ceiling, never a ban: the counter resets at UTC midnight and an operator can
  clear it outright (``service.reset_rate_counters``). This audience shares IPs
  far more than most — campuses, share houses, carrier CGNAT — so a hard block
  would land on exactly the people we want. See the note on IP_CEILING.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Final, Optional

# --- The ladder ---------------------------------------------------------------

T0_VISITOR: Final[int] = 0
T1_NEW: Final[int] = 1
T2_ESTABLISHED: Final[int] = 2
T3_TRUSTED: Final[int] = 3
T4_PROFESSIONAL: Final[int] = 4

MIN_TIER: Final[int] = T0_VISITOR
MAX_TIER: Final[int] = T4_PROFESSIONAL

TIER_NAMES: Final[dict[int, str]] = {
    T0_VISITOR: "Visitor",
    T1_NEW: "New account",
    T2_ESTABLISHED: "Established",
    T3_TRUSTED: "Trusted",
    T4_PROFESSIONAL: "Registered professional",
}

# The tier a fresh account starts on. Matches the ``trust_tier`` column default.
DEFAULT_ACCOUNT_TIER: Final[int] = T1_NEW


# --- Action families ----------------------------------------------------------
#
# Call sites name the concrete thing being written ("journey", "question",
# "comment"). Allowances are expressed in the two units a member actually thinks
# in — how much they can *say*, and how much they can *answer* — so the concrete
# actions collapse into families before a counter is ever touched. That keeps
# one knob per family instead of one per endpoint, and means adding a seventh
# kind of post does not add a seventh cap to reason about.

POST: Final[str] = "post"
REPLY: Final[str] = "reply"
REPORT: Final[str] = "report"

FAMILIES: Final[tuple[str, ...]] = (POST, REPLY, REPORT)

ACTION_FAMILY: Final[dict[str, str]] = {
    # Top-level contributions.
    "journey": POST,
    "question": POST,
    "timeline": POST,
    "thread": POST,
    # Answers.
    "comment": REPLY,
    # Moderation signal. Kept its own family on purpose: throttling reports the
    # way we throttle posts would suppress the thing that keeps the room clean.
    "report": REPORT,
}


def family_for(action: str) -> str:
    """Map a concrete write action onto its allowance family."""
    try:
        return ACTION_FAMILY[action]
    except KeyError as err:
        raise ValueError(f"Unknown community write action '{action}'") from err


# --- Caps ---------------------------------------------------------------------


@dataclass(frozen=True)
class Caps:
    """A daily write allowance. Frozen — a cap that can be mutated at runtime
    is a cap that will be mutated at runtime."""

    posts_per_day: int
    replies_per_day: int
    reports_per_day: int

    def for_action(self, action: str) -> int:
        """Allowance for a concrete action *or* a family name."""
        family = action if action in FAMILIES else family_for(action)
        if family == POST:
            return self.posts_per_day
        if family == REPLY:
            return self.replies_per_day
        return self.reports_per_day


# Per-account daily allowances.
#
# T1 (5 posts / 20 replies) is the specified anchor; everything else is set
# relative to it. The shape is deliberate: replies are always far more generous
# than posts, because a room where people answer each other is the goal and a
# reply is the low-risk act. Posts are where spam lives.
#
# T0 is tighter than T1 rather than zero. Writing without an account is on its
# way out — the composer gates it at the UI layer, and that gate is p5's — but
# turning the allowance to zero *here* would break every anonymous write in one
# step, in a phase whose job is scaffolding. The one-timeline rule
# (:data:`ANON_IP_TIMELINE_CAP`) already does the heavy lifting for visitors.
#
# T4 mirrors T3 rather than exceeding it. Being a registered agent is a
# disclosure obligation, not a licence to post more than a trusted member; the
# only thing T4 unlocks is the badge that says who you are.
_TIER_CAPS: Final[dict[int, Caps]] = {
    T0_VISITOR: Caps(posts_per_day=2, replies_per_day=10, reports_per_day=5),
    T1_NEW: Caps(posts_per_day=5, replies_per_day=20, reports_per_day=10),
    T2_ESTABLISHED: Caps(posts_per_day=15, replies_per_day=60, reports_per_day=20),
    T3_TRUSTED: Caps(posts_per_day=40, replies_per_day=200, reports_per_day=40),
    T4_PROFESSIONAL: Caps(posts_per_day=40, replies_per_day=200, reports_per_day=40),
}

# Network-level backstop, applied on top of the per-account cap.
#
# STARTING VALUE, not a tuned one. 25 posts / 60 replies is the figure the plan
# names; every rejection against it is logged so the first fortnight of real
# traffic can move it. Known tension, recorded here rather than discovered
# later: a lecture theatre or a share house behind one NAT can hold more than
# five active members, and this ceiling would land on the fifth. It resets every
# UTC midnight and is clearable by an operator, so the failure mode is "come
# back tomorrow or ask us", never "this address is banned".
IP_CEILING: Final[Caps] = Caps(
    posts_per_day=25, replies_per_day=60, reports_per_day=30
)

# Server-side backstop for the "one anonymous timeline" rule — how many real
# timelines one network may contribute before the sign-in gate appears. Lives
# here so every allowance number in the product is in one file, but it is NOT a
# rate counter: it counts materialised timeline rows, not writes in a window.
# Kept above 1 so a shared home or office IP is not blocked outright.
ANON_IP_TIMELINE_CAP: Final[int] = 2


def caps_for(tier: int) -> Caps:
    """Daily allowances for a tier. Out-of-range values clamp rather than raise.

    Clamping is the safe failure: a tier that somehow arrives as 99 (a bad
    migration, a hand-edited row) must not throw inside a write path, and a
    negative one must not hand out T4 allowances by accident.
    """
    return _TIER_CAPS[max(MIN_TIER, min(MAX_TIER, int(tier)))]


def effective_tier(*, has_account: bool, stored_tier: Optional[int]) -> int:
    """The tier that actually applies to a writer right now.

    ``trust_tier`` defaults to T1 on every row, including rows that are still
    just a device with no password. Reading the column alone would therefore
    hand a brand-new visitor the same allowance as a signed-up member, which is
    the opposite of what the ladder is for — so having an account is checked
    first and a passwordless row is T0 regardless of what the column says.
    """
    if not has_account:
        return T0_VISITOR
    if stored_tier is None:
        return DEFAULT_ACCOUNT_TIER
    return max(MIN_TIER, min(MAX_TIER, int(stored_tier)))


def tier_name(tier: int) -> str:
    return TIER_NAMES[max(MIN_TIER, min(MAX_TIER, int(tier)))]


# --- Windows ------------------------------------------------------------------


def day_window_start(now: Optional[datetime] = None) -> datetime:
    """UTC midnight for the day ``now`` falls in — the rate-counter bucket key.

    Fixed daily buckets rather than a rolling window: one row per
    (scope, action, day) that a single upsert can increment atomically, instead
    of a list of timestamps that has to be read, filtered and written back. The
    trade is a boundary effect (someone can spend today's allowance at 23:59 and
    tomorrow's at 00:01); for daily caps on a discussion forum that is an
    acceptable price for an enforcement path that cannot race.
    """
    moment = now or datetime.now(timezone.utc)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
