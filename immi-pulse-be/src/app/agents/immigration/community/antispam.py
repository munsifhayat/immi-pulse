"""Content pattern detection — links, contact details, and touting.

Pure functions over strings. No database, no session, no imports from the
service layer, so every rule here is unit-testable without a fixture
(``tests/agents/immigration/test_community_antispam.py``). The code that
*acts* on these signals lives in ``community/trust.py``.

Three jobs, and they are deliberately not the same job:

1. :func:`contact_signals` — outbound links, phone numbers and messaging
   handles. Gated **below T2**: a new account may not publish a way to be
   contacted off-platform. This is a tier gate, so it disappears the moment an
   account is established.

2. :func:`touting_signals` — someone offering to do immigration work for
   money. Held for review at **every tier**, because this is not merely spam:
   giving immigration assistance while unregistered is an offence under s276 of
   the Migration Act, and a room that hosts it is a room with a legal problem
   rather than a moderation one. A tenured account touting is, if anything,
   more dangerous than a new one, so tenure must not buy an exemption.

3. :func:`fingerprint` — a normalised hash of a body, so the same message
   pasted across many threads can be recognised as the same message.

Why patterns and not a URL parser: the criterion is "pattern-matched rather
than URL-parsed only" and the reason is that real spam does not present a
parseable URL. It writes ``example dot com``, ``example(.)com``,
``wa . me / 61400000000``. A parser sees prose; a human sees a phone number.
The obfuscation variants below are the ones that actually appear.

Every matcher returns a list of short human-readable reason strings rather than
a bool. A moderator opening the queue needs to know *why* something was held,
and "held automatically" with no reason is how an auto-hold queue becomes a
thing nobody trusts and nobody works.
"""

from __future__ import annotations

import hashlib
import re
from typing import Final

# --- Link detection -----------------------------------------------------------

# Common TLDs worth matching bare (no scheme, no www). Kept short on purpose:
# a long list matches ordinary words ("visa.co" is a link, "etc.au" is not
# something anyone types). These cover essentially all real forum link spam.
_BARE_TLDS: Final[str] = (
    r"com|net|org|io|co|me|info|biz|xyz|online|site|app|link|live|in|pk|ph|np|lk|au|uk|ca|nz"
)

_LINK_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    # Explicit scheme — the honest case.
    re.compile(r"\bhttps?://\S+", re.IGNORECASE),
    # www.something
    re.compile(r"\bwww\.[a-z0-9][a-z0-9\-]*\.[a-z]{2,}", re.IGNORECASE),
    # Bare domain: example.com, my-agency.co.uk
    re.compile(
        rf"\b[a-z0-9][a-z0-9\-]{{1,62}}(?:\.[a-z0-9\-]{{2,63}})*\.(?:{_BARE_TLDS})\b"
        r"(?:/\S*)?",
        re.IGNORECASE,
    ),
    # Obfuscated separators: "example dot com", "example(dot)com",
    # "example [.] com". This is what a spammer writes once they learn that
    # bare domains are caught.
    re.compile(
        r"\b[a-z0-9][a-z0-9\-]{1,62}\s*[(\[{]?\s*(?:\.|dot|d0t)\s*"
        r"[)\]}]?\s*(?:" + _BARE_TLDS + r")\b",
        re.IGNORECASE,
    ),
)

# Domains a member may link at any tier.
#
# A deliberate deviation from a flat "no links below T2", and the reasoning is
# worth stating: the single most useful thing one applicant can do for another
# is point at the department's own page. Those links are also the ones a tout
# will never post — nobody sells a visa service by linking to homeaffairs.gov.au.
# Allowing them costs nothing and removes the most common false positive the
# gate would otherwise produce, which is what stops a safety control from being
# experienced as an obstacle.
#
# Suffix-matched against the host, so "immi.homeaffairs.gov.au" is covered by
# "homeaffairs.gov.au" — and a lookalike like "homeaffairs.gov.au.evil.com" is
# NOT, because its host does not *end* with an allowed domain.
ALLOWED_LINK_DOMAINS: Final[tuple[str, ...]] = (
    "homeaffairs.gov.au",
    "immi.homeaffairs.gov.au",
    "abf.gov.au",
    "mara.gov.au",
    "legislation.gov.au",
    "border.gov.au",
    "dfat.gov.au",
    "australia.gov.au",
    "servicesaustralia.gov.au",
    "immi360.com.au",
)

_HOST_RE: Final[re.Pattern[str]] = re.compile(
    r"^(?:https?://)?(?:www\.)?([a-z0-9\-.]+)", re.IGNORECASE
)


def _host_of(candidate: str) -> str:
    match = _HOST_RE.match(candidate.strip())
    if not match:
        return ""
    return match.group(1).rstrip(".").lower()


def is_allowed_link(candidate: str) -> bool:
    """True when a matched link points at an official reference source."""
    host = _host_of(candidate)
    if not host:
        return False
    return any(
        host == allowed or host.endswith("." + allowed)
        for allowed in ALLOWED_LINK_DOMAINS
    )


def find_links(text: str) -> list[str]:
    """Every link-shaped run in ``text`` that is not on the allowlist.

    Allowed links are **removed from the text** before the remaining patterns
    run, rather than filtered out of the results afterwards. Filtering
    afterwards does not work: the patterns overlap, so a permitted
    ``immi.homeaffairs.gov.au`` is also matched as a bare ``gov.au`` by the
    obfuscation pattern, and the allowlist check on that fragment fails. Cutting
    the allowed span out first means there is nothing left for a narrower
    pattern to find inside it.
    """
    if not text:
        return []

    remaining = text
    for match in reversed(list(_LINK_PATTERNS[0].finditer(text))):
        if is_allowed_link(match.group(0)):
            remaining = remaining[: match.start()] + " " + remaining[match.end() :]
    for pattern in (_LINK_PATTERNS[1], _LINK_PATTERNS[2]):
        for match in reversed(list(pattern.finditer(remaining))):
            if is_allowed_link(match.group(0)):
                remaining = (
                    remaining[: match.start()] + " " + remaining[match.end() :]
                )

    found: list[str] = []
    seen: set[str] = set()
    for pattern in _LINK_PATTERNS:
        for match in pattern.finditer(remaining):
            raw = match.group(0).strip().rstrip(".,;:!?)")
            key = raw.lower()
            if key in seen:
                continue
            seen.add(key)
            if is_allowed_link(raw):
                continue
            found.append(raw)
    return found


# --- Phone numbers ------------------------------------------------------------

# Australian mobiles (04xx / +614xx), international +NN, and any run of 8+
# digits that has been broken up with spaces, dots or dashes. The last one is
# broad on purpose: it is the shape of a phone number written to dodge a filter,
# and a visa subclass ("189", "482") or a date is far too short to trip it.
_PHONE_PATTERNS: Final[tuple[re.Pattern[str], ...]] = (
    re.compile(r"(?:\+|00)\s?\d{1,3}[\s.\-()]?\d{2,4}[\s.\-()]?\d{3,4}[\s.\-()]?\d{0,4}"),
    re.compile(r"\b0[2-9]\d{1,2}[\s.\-]?\d{3}[\s.\-]?\d{3,4}\b"),
    # A grouped run, but only when at least one group is four digits long.
    #
    # The obvious version of this rule — three groups of 3-4 digits — flags
    # "189 190 491", which in this room is somebody listing the subclasses they
    # are weighing up, not a phone number. Requiring a four-digit group
    # separates them: every real Australian mobile and landline has one, and a
    # list of visa subclasses never does.
    re.compile(
        r"\b(?:\d{4}[\s.\-]\d{3,4}[\s.\-]\d{3,4}"
        r"|\d{3,4}[\s.\-]\d{4}[\s.\-]\d{3,4}"
        r"|\d{3,4}[\s.\-]\d{3,4}[\s.\-]\d{4})\b"
    ),
)

# A run of digits this long is a phone number, an account number or an ID —
# never a visa subclass, a year, or a number of days.
_LONG_DIGIT_RUN: Final[re.Pattern[str]] = re.compile(r"\b\d{9,}\b")


def find_phone_numbers(text: str) -> list[str]:
    """Phone-shaped runs in ``text``."""
    if not text:
        return []
    found: list[str] = []
    seen: set[str] = set()
    for pattern in (*_PHONE_PATTERNS, _LONG_DIGIT_RUN):
        for match in pattern.finditer(text):
            raw = match.group(0).strip()
            digits = re.sub(r"\D", "", raw)
            # Below eight digits it is a date, a subclass or a price.
            if len(digits) < 8:
                continue
            if digits in seen:
                continue
            seen.add(digits)
            found.append(raw)
    return found


# --- Messaging handles --------------------------------------------------------

# Note what is deliberately NOT here: the bare *name* of a messaging app.
#
# "Whatsapp" appearing in a body is not a contact detail. "My agent only ever
# messages me on WhatsApp" is an ordinary sentence in this room — people
# describe their dealings with agents constantly, and that description is often
# the most useful thing in the thread. Refusing to publish it because it names
# an app would block the exact content the room exists for.
#
# The solicitation form ("whatsapp me", "dm me") is caught by the touting
# patterns instead, which is the stronger place for it: touting applies at
# every tier, so an established account cannot use the phrasing either.
_HANDLE_PATTERNS: Final[tuple[tuple[re.Pattern[str], str], ...]] = (
    (
        re.compile(r"\b(?:wa\.me|t\.me|m\.me|chat\.whatsapp\.com)\b", re.I),
        "messaging link",
    ),
    # @handle — instagram/telegram style. Two or more chars so a stray "@" or an
    # "@ 5pm" does not match.
    (re.compile(r"(?<![\w.])@[a-z0-9_.]{2,}", re.I), "@handle"),
    # Email addresses, including the "name at domain dot com" dodge.
    (re.compile(r"\b[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}\b", re.I), "email address"),
    (
        re.compile(
            rf"\b[a-z0-9._%+\-]+\s+(?:at|\(at\)|\[at\])\s+[a-z0-9.\-]+\s*"
            rf"(?:\.|dot)\s*(?:{_BARE_TLDS})\b",
            re.I,
        ),
        "email address",
    ),
)


def find_handles(text: str) -> list[str]:
    """Messaging handles / apps / email addresses named in ``text``."""
    if not text:
        return []
    found: list[str] = []
    seen: set[str] = set()
    for pattern, label in _HANDLE_PATTERNS:
        for match in pattern.finditer(text):
            raw = match.group(0).strip()
            key = f"{label}:{raw.lower()}"
            if key in seen:
                continue
            seen.add(key)
            found.append(raw)
    return found


def contact_signals(text: str) -> list[str]:
    """Reasons this text publishes a way to be contacted off-platform.

    The gate below T2. Empty list means nothing was found.
    """
    reasons: list[str] = []
    links = find_links(text)
    if links:
        reasons.append(f"outbound link ({links[0][:60]})")
    phones = find_phone_numbers(text)
    if phones:
        reasons.append(f"phone number ({phones[0][:32]})")
    handles = find_handles(text)
    if handles:
        reasons.append(f"contact handle ({handles[0][:40]})")
    return reasons


# --- Touting ------------------------------------------------------------------
#
# The highest-value check in the phase: it covers the top spam vector and the
# top legal vector at once. Grouped by what the phrase actually is, because a
# moderator reading the queue needs the category, not the regex.

_TOUTING_PATTERNS: Final[tuple[tuple[re.Pattern[str], str], ...]] = (
    # "I can lodge / file / prepare / handle your visa"
    (
        re.compile(
            r"\b(?:i|we)\s+(?:can|will|could|shall)\s+(?:\w+\s+){0,3}?"
            r"(?:lodge|file|submit|prepare|handle|process|arrange|sort)\b"
            r"(?:\s+\w+){0,3}?\s+(?:your|ur|the)\s+"
            # Subclass numbers are in this list because "I can lodge your 189"
            # is how the offer is actually phrased here. Nobody writes "I can
            # lodge your visa application" when the whole room speaks in
            # subclass numbers.
            r"(?:visa|application|eoi|nomination|case|paperwork|file|forms?|pr|\d{3})\b",
            re.I,
        ),
        "offer to lodge on someone's behalf",
    ),
    (
        re.compile(
            r"\b(?:i|we)\s+(?:can|will)\s+(?:help|assist|guide|support)\s+"
            r"(?:you\s+)?(?:with\s+)?(?:your\s+)?"
            r"(?:visa|application|lodgement|lodgment|pr|migration)\b"
            r"[^.!?\n]{0,60}?\b(?:fee|charge|cost|price|payment|\$|aud|inr|usd)\b",
            re.I,
        ),
        "paid assistance offer",
    ),
    # Explicit fee / price talk attached to a service
    (
        re.compile(
            r"\b(?:my|our)\s+(?:fee|fees|charge|charges|rate|rates|price|pricing)\b",
            re.I,
        ),
        "quoting a fee",
    ),
    (
        re.compile(
            r"\b(?:for\s+(?:a\s+)?(?:small|nominal|reasonable|low|minimal)\s+fee|"
            r"affordable\s+(?:price|fee|rate|service)|"
            r"(?:cheapest|lowest)\s+(?:price|fee|rate))\b",
            re.I,
        ),
        "quoting a fee",
    ),
    (
        re.compile(
            r"(?:\$|\bAUD?\s?|\bINR\s?|\bUSD\s?|\bPKR\s?|\bRs\.?\s?)\s?\d{2,6}"
            r"[^.!?\n]{0,50}?\b(?:visa|pr|application|lodge|lodgement|lodgment|"
            r"consult|service|package|processing)\b",
            re.I,
        ),
        "price attached to a visa service",
    ),
    (
        re.compile(
            r"\b(?:visa|pr|migration|immigration)\b[^.!?\n]{0,50}?"
            r"(?:\$|\bAUD?\s?|\bINR\s?|\bUSD\s?)\s?\d{2,6}\b",
            re.I,
        ),
        "price attached to a visa service",
    ),
    # Solicitation to move the conversation off-platform
    (
        re.compile(
            r"\b(?:dm|pm|inbox|whats\s?app|telegram|message|msg|text|call|"
            r"contact|ping|reach)\s+me\b",
            re.I,
        ),
        "solicitation to be contacted privately",
    ),
    (
        re.compile(
            r"\b(?:contact|reach|call|message|msg|text|ping)\s+(?:me|us)\s+"
            r"(?:on|at|via|through)\b",
            re.I,
        ),
        "solicitation to be contacted privately",
    ),
    (
        re.compile(
            r"\b(?:send|drop)\s+(?:me\s+)?(?:a\s+)?(?:dm|pm|message|msg|mail|email)\b",
            re.I,
        ),
        "solicitation to be contacted privately",
    ),
    # Guarantees — always false, and the classic unregistered-agent pitch
    (
        re.compile(
            r"\b(?:100\s?%|guaranteed|guarantee[sd]?\s+(?:visa|pr|grant|approval)|"
            r"sure\s?shot|no\s+(?:visa\s+)?no\s+fee)\b"
            r"(?:[^.!?\n]{0,40}?\b(?:visa|pr|grant|approval|success|result)\b)?",
            re.I,
        ),
        "guaranteed-outcome claim",
    ),
    # Advertising a practice
    (
        re.compile(
            r"\b(?:we\s+(?:are|r)\s+(?:a\s+)?(?:registered\s+)?"
            r"(?:migration|immigration|visa)\s+"
            r"(?:agent|agents|consultant|consultants|company|firm|agency)|"
            r"(?:migration|immigration|visa)\s+"
            r"(?:consultancy|services|agency)\b[^.!?\n]{0,40}?\b(?:contact|call|dm|whats\s?app|email)\b)",
            re.I,
        ),
        "advertising an immigration practice",
    ),
)


def touting_signals(text: str) -> list[str]:
    """Reasons this text reads as someone selling immigration assistance.

    Held for review at every tier — see the module docstring for why tenure
    buys no exemption here.
    """
    if not text:
        return []
    reasons: list[str] = []
    for pattern, label in _TOUTING_PATTERNS:
        if pattern.search(text) and label not in reasons:
            reasons.append(label)
    return reasons


# --- Similarity ---------------------------------------------------------------

# Bodies shorter than this are never fingerprinted. "Thanks!", "same here",
# "following", "any update?" are the normal texture of a waiting-room forum and
# repeat honestly across dozens of threads; treating them as duplicate spam
# would hold the most ordinary contributions in the room. Copy-paste touting is
# never this short — it has to contain the pitch.
MIN_FINGERPRINT_CHARS: Final[int] = 40

_NON_WORD: Final[re.Pattern[str]] = re.compile(r"[^a-z0-9]+")


def normalise(text: str) -> str:
    """Lowercased, punctuation-stripped, whitespace-collapsed.

    Enough to see through the trivial edits a spammer makes between pastes
    (casing, trailing emoji, an extra exclamation mark) without pretending to
    be a real similarity metric. Anything cleverer belongs behind a model, not
    in a write path that has to answer in single-digit milliseconds.
    """
    return _NON_WORD.sub(" ", (text or "").lower()).strip()


def fingerprint(text: str) -> str | None:
    """A stable hash of ``text``'s normalised form, or None if it is too short."""
    normalised = normalise(text)
    if len(normalised) < MIN_FINGERPRINT_CHARS:
        return None
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()[:32]


# --- Velocity -----------------------------------------------------------------

# Defaults for "N writes in W seconds"; the live values come from settings
# (``community_velocity_max_writes`` / ``community_velocity_window_seconds``),
# because these are the numbers real traffic should move. Declared here anyway
# so every anti-spam threshold in the product is readable in one file.
#
# It counts *landed* writes, not attempts: the rate counters deliberately do not
# count rejected attempts (p2 key decision), so this is the control that notices
# a burst rather than a sustained day.
VELOCITY_WINDOW_SECONDS: Final[int] = 60
VELOCITY_MAX_WRITES: Final[int] = 8

# The same body appearing in this many distinct threads is a broadcast, not a
# conversation. Three, because two can be a coincidence — the same honest answer
# given to two people asking the same thing — and three is where that stops
# being plausible.
SIMILARITY_MIN_THREADS: Final[int] = 3
