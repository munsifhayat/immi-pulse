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

One thing this module deliberately does NOT encode:

- **Email verification as a rung.** Verifying an email is an *attribute* that
  shortens probation, never a tier of its own. Making it a tier would quietly
  turn an optional field into a required one, and optional email is the
  decision the whole identity model rests on.

Promotion criteria live here too, as :func:`compute_tier` — still pure, a
function of a :class:`TrustSignals` value. Gathering those signals needs the
database and lives in ``community/trust.py``; deciding what they *mean* does
not, and keeping the decision testable without a session is what lets the
ladder be argued about in a test file rather than in production.

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


def ip_ceiling_applies(tier: int) -> bool:
    """Whether :data:`IP_CEILING` should be enforced against this writer.

    **This is the resolution of the per-IP tension the epic left open**, and it
    is worth stating the argument rather than just the number.

    The ceiling exists because accounts are free, so per-account caps alone do
    not bind — one person can mint five accounts and get five allowances. But
    the ceiling is applied per *network*, and this audience shares networks far
    more than most: campuses, share houses, migrant hostels, carrier CGNAT.
    Five flatmates all waiting on 189s is a completely ordinary shape for a
    household here, and the ceiling as p2 shipped it would land on the fifth of
    them.

    The two obvious fixes are both bad. Raising the number weakens the only
    control that binds. Exempting anyone signed in defeats it entirely, because
    signing up is free — which is exactly why p2 rejected that option.

    What p6 has that p2 did not is an *earned* signal. T2 takes seven days,
    five contributions that survived moderation, and net-positive votes from
    other members. That is not a bar a spam ring clears at volume — it costs a
    week and real participation per account — but it is a bar five genuine
    flatmates clear individually within a fortnight. So the ceiling applies to
    T0 and T1, where abuse actually operates, and stops applying once an account
    has demonstrably behaved like a member.

    The failure mode stays soft either way: a T1 member on a busy network is
    told the network is busy and invited to come back tomorrow, and an operator
    can clear the bucket outright. Nothing here bans an address, and nothing
    here can.
    """
    return int(tier) < T2_ESTABLISHED


# --- Promotion, demotion, and what a tier unlocks -----------------------------

# T2 thresholds. Seven days is the plan's figure; a verified email shortens it,
# because an address that received and survived a round trip is a small but real
# cost that a disposable account does not pay. It shortens probation — it never
# skips it, and it is never required.
T2_MIN_AGE_DAYS: Final[int] = 7
T2_MIN_AGE_DAYS_VERIFIED_EMAIL: Final[int] = 3
T2_MIN_CONTRIBUTIONS: Final[int] = 5

# T3 thresholds. The completed-timeline requirement is the interesting one:
# tenure and post count are both farmable by anyone patient, but having lodged a
# visa and seen it decided is a fact only this community is in a position to
# observe, and it is the exact experience that makes someone worth trusting in a
# waiting room. It is why T3 cannot be bought with volume.
T3_MIN_AGE_DAYS: Final[int] = 90
T3_MIN_CONTRIBUTIONS: Final[int] = 25
T3_MIN_COMPLETED_TIMELINES: Final[int] = 1

# How long an upheld report keeps counting against promotion.
#
# The plan states T2 as "no upheld reports" and T3 as "zero upheld reports in
# 90 days". Read literally those are inconsistent — a member with one old upheld
# report would qualify for T3 while being permanently barred from T2, which is
# not a ladder. Resolved by applying the same 90-day recency window to both, so
# T3's requirements strictly imply T2's and the ladder is monotone. The lifetime
# count is not discarded: it drives shadow-limiting below, which is the right
# place for "this account has a history" to have teeth. A single upheld report
# should cost a member three months of link privileges, not their permanent
# record.
UPHELD_REPORT_WINDOW_DAYS: Final[int] = 90

# Lifetime upheld reports at which an account is shadow-limited: their content
# stays visible to them and stops reaching the feed. Three is a pattern, not an
# accident or a bad day.
SHADOW_LIMIT_UPHELD_THRESHOLD: Final[int] = 3


@dataclass(frozen=True)
class TrustSignals:
    """Everything :func:`compute_tier` is allowed to look at.

    Deliberately a flat value object with no database rows in it, so the whole
    promotion policy can be exercised from a test that constructs one by hand.
    """

    account_age_days: int = 0
    # Posts + comments that are still standing: drafts, hidden and removed
    # content do not count. Volume that moderation had to clean up is not
    # evidence of trustworthiness.
    surviving_contributions: int = 0
    # Upvotes received minus... nothing, for now: there is no downvote in this
    # product (two actions only, by decision). "Net-positive" therefore means
    # somebody, somewhere, found something they wrote worth marking.
    net_votes: int = 0
    upheld_reports: int = 0
    upheld_reports_recent: int = 0
    # Timelines this member has taken all the way to a decision. The T3 gate.
    completed_timelines: int = 0
    email_verified: bool = False
    # T4 is assigned by a human after OMARA/MARN checking (out of scope this
    # phase). It is never computed, only carried through.
    is_professional: bool = False


def compute_tier(signals: TrustSignals) -> int:
    """The tier these signals earn. Pure; no clock, no session, no I/O.

    Never returns T0: T0 means "no account at all", which is a property of the
    row rather than of behaviour and is decided by :func:`effective_tier`.
    """
    # Registered professionals keep their tier — the badge is a disclosure that
    # the reader is entitled to, not a reward that misbehaviour forfeits. A
    # professional who abuses the room gets shadow-limited and moderated like
    # anyone else; what must not happen is that the disclosure quietly
    # disappears while the person keeps posting.
    if signals.is_professional:
        return T4_PROFESSIONAL

    # Demotion, checked before promotion so it cannot be out-earned. An account
    # with a real history of upheld reports goes back to probation regardless of
    # tenure or volume.
    if signals.upheld_reports >= SHADOW_LIMIT_UPHELD_THRESHOLD:
        return T1_NEW

    clean = signals.upheld_reports_recent == 0

    if (
        clean
        and signals.account_age_days >= T3_MIN_AGE_DAYS
        and signals.surviving_contributions >= T3_MIN_CONTRIBUTIONS
        and signals.completed_timelines >= T3_MIN_COMPLETED_TIMELINES
    ):
        return T3_TRUSTED

    min_age = (
        T2_MIN_AGE_DAYS_VERIFIED_EMAIL
        if signals.email_verified
        else T2_MIN_AGE_DAYS
    )
    if (
        clean
        and signals.account_age_days >= min_age
        and signals.surviving_contributions >= T2_MIN_CONTRIBUTIONS
        and signals.net_votes > 0
    ):
        return T2_ESTABLISHED

    return T1_NEW


def may_post_contact_details(tier: int) -> bool:
    """Whether this tier may publish links, phone numbers or handles.

    The single highest-leverage control in the phase. Nearly all real
    immigration-forum spam is an unregistered agent posting a way to be
    contacted, which is simultaneously the top spam vector and the top s276
    legal vector — so one gate closes both.
    """
    return int(tier) >= T2_ESTABLISHED


# --- Report weighting ---------------------------------------------------------

# What one report from each tier is worth, and the total that holds content.
#
# The threshold is 5 rather than 3 so that no *single* report from a member can
# hold content on its own except from T3. A control where one established
# member silences another is a control that will be used to silence people, and
# in a room where members disagree about migration agents and outcomes, that
# would happen in the first week. Two established members, or five new ones, or
# one member the community has trusted for three months: those are all
# defensible. One annoyed person is not.
_REPORT_WEIGHTS: Final[dict[int, int]] = {
    T0_VISITOR: 1,
    T1_NEW: 1,
    T2_ESTABLISHED: 3,
    T3_TRUSTED: 10,
    T4_PROFESSIONAL: 10,
}

AUTO_HOLD_REPORT_WEIGHT: Final[int] = 5


def report_weight(tier: int) -> int:
    """How much one report from this tier counts toward an auto-hold."""
    return _REPORT_WEIGHTS[max(MIN_TIER, min(MAX_TIER, int(tier)))]


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
