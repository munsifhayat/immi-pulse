"""Community models — Spaces, Threads, Comments, Reports, Processing timelines."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID

from app.db.base import Base

# Content lifecycle. "held" is p6's addition and it is deliberately NOT a
# moderation verdict: it means an automatic check thought this needed a human
# before it went out. It sits between active and hidden — the author still sees
# it, the feed does not, the stats do not, and a moderator dismissing the report
# puts it straight back. Because every public query filters on "active", adding
# the value excludes held content everywhere by default, which is the safe
# direction for a status nobody has audited every call site for.
CONTENT_ACTIVE = "active"
CONTENT_HELD = "held"
THREAD_STATUSES = ("active", "held", "hidden", "removed")
REPORT_TARGET_TYPES = ("thread", "comment", "journey", "journey_comment")
REPORT_REASONS = ("spam", "harassment", "misleading_advice", "other")
REPORT_STATUSES = ("open", "actioned", "dismissed")

# Who filed a report. "auto" rows come from the anti-spam screen; they carry a
# reason string naming the pattern that fired, so the queue can explain itself.
REPORT_SOURCES = ("member", "auto")
REPORT_SOURCE_MEMBER = "member"
REPORT_SOURCE_AUTO = "auto"

# Community-submitted visa timeline outcomes. "waiting" = lodged, no decision
# yet (the survivorship-bias denominator); "granted"/"refused" are decided.
TIMELINE_OUTCOMES = ("waiting", "granted", "refused")
TIMELINE_STATUSES = ("active", "hidden", "removed")

# --- Community feed v2 (journeys = unified feed posts) -----------------------

# A feed post is either a milestone "timeline" or a free-text "question".
POST_TYPES = ("timeline", "question")

# Server-validated milestone vocabulary, ordered the way an Australian
# application actually flows. "Other" lets people record anything unusual
# without polluting the enum. Icon + colour mapping lives on the frontend.
MILESTONE_TYPES = (
    "Skills Assessment Lodged",
    "Skills Assessment Approved",
    "English Test Completed",
    "EOI Submitted",
    "Invitation Received",
    "Nomination Lodged",
    "Nomination Approved",
    "State Nomination",
    "Visa Lodged",
    "Medical Examination",
    "Police Checks",
    "S56 Request Received",
    "S56 Response Submitted",
    "Visa Granted",
    "Other",
)

# What a journey's votes/comments can hang off.
VOTE_TARGET_TYPES = ("journey", "comment")

# Rate-counter scopes. "account" caps one member's day; "ip" is the network
# backstop that keeps free account creation from defeating the account cap.
RATE_SCOPE_TYPES = ("account", "ip")

# What put a notification in someone's inbox. Deliberately only two kinds: this
# is a reply inbox, not an activity firehose. Votes are not notified — a room
# where a number going up pings you trains people to post for the number.
NOTIFICATION_TYPES = ("reply_to_post", "reply_to_comment")

# "hidden" is what moderation leaves behind: the row stays for audit, the member
# never sees it again and it stops counting toward unread.
NOTIFICATION_STATUSES = ("active", "hidden")

# Where a stats-bearing timeline row came from. This is a *provenance* label, not
# a quality label: "member" is first-party — someone told us about their own
# application; "forum" was collected from public immigration forums, anonymised
# and normalised (see scripts/seed_community_scraped.py). Both feed the public
# numbers, and every figure they feed states its composition in the open. The
# label exists so that sentence can be written truthfully.
TIMELINE_SOURCES = ("member", "forum")
TIMELINE_SOURCE_MEMBER = "member"
TIMELINE_SOURCE_FORUM = "forum"


class AnonIdentity(Base):
    """A pseudonymous community member — a browser's anonymous identity, or an account.

    NAMING DEBT (accepted deliberately): the table is still called
    ``anon_identities`` because every ``Journey``/``JourneyComment``/
    ``CommunityVote`` already FKs to ``identity_id``. Renaming it would touch
    far more than the clarity is worth, so the table grew into the account
    instead of a parallel ``community_accounts`` table being added beside it.
    Read "identity" as "community account" throughout.

    Lifecycle: a visitor arrives → a row is minted against their
    ``device_token`` with a generated unique ``handle`` + ``color`` → they read
    and write freely → when they sign up, that row is *adopted* as an account
    (keeping the handle and every prior post) and its ``device_token`` is
    released.

    **A row is addressed by a device token OR by a session, never both.** The
    invariant is: an account row never holds a ``device_token``. That is what
    stops a browser resolving to somebody else's account after they log out —
    the bug this split exists to close, where a signed-out visitor on a shared
    computer wrote timelines under the previous member's pseudonym. Signup
    releases the token; the browser re-bootstraps a fresh anonymous row on its
    next call, and login touches neither.

    ``email`` is **optional** and exists for exactly two reasons: password
    recovery and reply notifications. It is never displayed, never public, and
    never required to participate — for this audience an email address is often
    a real name and a real risk. No email means no recovery, stated plainly at
    signup. It must never appear in any public or consultant-facing serializer.
    """

    __tablename__ = "anon_identities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Nullable since the account/device split: NULL means "no browser speaks for
    # this row", which is the steady state of every account. Postgres permits
    # any number of NULLs under a UNIQUE index, so uniqueness still holds for
    # the rows that do carry one and ``uq_anon_identity_device_token`` stays.
    device_token = Column(String, nullable=True, unique=True, index=True)
    handle = Column(String, nullable=False, unique=True, index=True)
    color = Column(String, nullable=False)

    journeys_posted = Column(Integer, nullable=False, default=0)

    # --- Account columns (NULL while the row is still an unclaimed device) ---
    # Set once the member chooses a password; this is what turns the identity
    # into a durable, cross-device account. bcrypt-over-HMAC, same primitive as
    # the consultant console (core/jwt_auth.hash_password).
    password_hash = Column(String, nullable=True)
    # Email is split in two on purpose, and the difference is a security
    # boundary rather than bookkeeping.
    #
    # ``email_pending`` is what a member typed. It is NOT unique, because we do
    # not verify it: with one shared unique column, anyone could type a
    # stranger's address at signup and permanently occupy it, locking the real
    # owner out of ever attaching their own (account pre-hijacking —
    # Sudhodanan & Paverd, USENIX Security 2022, found this in 35 of 75 popular
    # services). An unverified claim must never be able to deny service.
    #
    # ``email_verified`` is proven ownership, and only it takes the unique slot.
    # Recovery keys off it; a pending address can recover only while exactly one
    # account claims it.
    email_pending = Column(String, nullable=True, index=True)
    email_verified = Column(String, nullable=True, unique=True, index=True)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    # Login throttling — reset on success, checked before verifying a password.
    failed_login_count = Column(Integer, nullable=False, default=0)
    locked_until = Column(DateTime(timezone=True), nullable=True)
    # Single-use, hashed password-recovery token (only usable when email is set).
    recovery_token_hash = Column(String, nullable=True, index=True)
    recovery_expires_at = Column(DateTime(timezone=True), nullable=True)

    # --- Trust ladder --------------------------------------------------------
    # Computed, never member-facing: no score, no leaderboard, no badge except
    # the registered-professional one (T4), which is a disclosure obligation
    # rather than a reward. Defaults to T1 because the column only means
    # anything once a password exists — a row with no password is read as T0
    # regardless of what is stored here (``tiers.effective_tier``).
    trust_tier = Column(Integer, nullable=False, default=1, server_default="1")
    # When the nightly recompute last looked at this row (that job is p6).
    tier_computed_at = Column(DateTime(timezone=True), nullable=True)
    # Reports against this member that a moderator upheld — the demotion signal.
    upheld_reports = Column(Integer, nullable=False, default=0, server_default="0")
    # When the most recent one landed. The recency clock: an upheld report keeps
    # an account out of T2/T3 for 90 days rather than for ever, so moderation is
    # a setback and not a permanent record.
    last_upheld_report_at = Column(DateTime(timezone=True), nullable=True)
    # Shadow limiting: the author still sees their own content, the feed does
    # not. Enforcement is p6; the column exists here so the ladder has somewhere
    # to write its conclusion.
    shadow_limited = Column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    # --- Notification preference ---------------------------------------------
    # Whether reply notifications may also go out by email. Defaults to true
    # because supplying an email at signup is *itself* the opt-in — the field is
    # offered with "so we can tell you when someone replies" attached, so a
    # second consent step would contradict what the member was just told. With
    # no email this column is inert: the send path requires an address first.
    # It exists so there is a real off-switch to hang an unsubscribe on.
    notify_replies_email = Column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    # Set when the device is claimed by a real (portal) account → uncaps posting
    # and lets the portal stitch the prior anonymous activity to the account.
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    ip_hash = Column(String, nullable=True, index=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    last_seen_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    @property
    def is_account(self) -> bool:
        """True once a password has been set — i.e. this row is a real account."""
        return bool(self.password_hash)


class RateCounter(Base):
    """One write-allowance bucket: (scope, action, day) → how many so far.

    This replaces a module-level dict. The dict was wrong in two ways that only
    show up in production: counters vanished on every dyno restart, and each
    dyno kept its own tally, so the effective limit was silently multiplied by
    the number of dynos. A member could exhaust their day, get a restart, and
    start over. Putting the count in Postgres makes the limit mean one thing
    across every process.

    Fixed daily buckets (``window_start`` = UTC midnight) rather than a rolling
    window, so an increment is a single ``INSERT … ON CONFLICT DO UPDATE``
    returning the new value: atomic, race-free, one round trip. A rolling window
    would need read-filter-write, which two concurrent requests can interleave.

    ``scope_type`` is ``account`` or ``ip``; both are checked on every write.
    The account scope shapes an individual's day, the IP scope is the backstop
    that stops free account creation from making the account cap meaningless.
    Rows are disposable — old windows can be swept at any time without loss.
    """

    __tablename__ = "rate_counters"
    __table_args__ = (
        UniqueConstraint(
            "scope_type",
            "scope_key",
            "action",
            "window_start",
            name="uq_rate_counter_scope_action_window",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scope_type = Column(String, nullable=False, index=True)  # account | ip
    scope_key = Column(String, nullable=False, index=True)  # identity id | ip hash
    action = Column(String, nullable=False)  # post | reply | report
    window_start = Column(DateTime(timezone=True), nullable=False, index=True)
    count = Column(Integer, nullable=False, default=0, server_default="0")
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class CommunityNotification(Base):
    """One "someone answered you" entry in a member's inbox.

    This is the loop the room lives or dies on: without it a person asks
    something, gets no signal that anyone replied, and never comes back. The
    in-app inbox is the *primary* channel — that is precisely what makes an
    optional email address workable, because there is always somewhere to see
    your replies even if we can never mail you.

    Recipient is an ``anon_identities`` row rather than an account specifically,
    because that table is both. A reply to a visitor who has not set a password
    yet still banks a notification against the row they already are, and it is
    waiting for them the moment they claim it — no backfill, no stitching.

    ``actor_handle``/``actor_color`` are snapshots, mirroring what ``Journey``
    and ``JourneyComment`` already do: the inbox must render without joining
    back to a row that may since have been deleted.

    Moderation: when the source comment or post is hidden or removed, the
    notification is hidden too (:func:`notifications.hide_for_target`). Reads
    *also* re-check the source rows' status, so content moderated by a path that
    forgets to call it still cannot be read out of an inbox. Two mechanisms on
    purpose — the explicit one keeps unread counts honest, the join is the one
    that cannot be forgotten.
    """

    __tablename__ = "community_notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    recipient_identity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anon_identities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # reply_to_post | reply_to_comment
    type = Column(String, nullable=False)

    # Source content. Both cascade: a deleted post takes its inbox entries with
    # it, since an inbox row pointing at nothing is worse than no row at all.
    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journeys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    comment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journey_comments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # The comment that was replied to, for ``reply_to_comment``. NULL when the
    # reply landed on the post itself.
    parent_comment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journey_comments.id", ondelete="SET NULL"),
        nullable=True,
    )

    actor_identity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anon_identities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    actor_handle = Column(String, nullable=False)
    actor_color = Column(String, nullable=False)

    # Short snippet of the reply + the post's title, so the inbox renders in one
    # query. Never the whole body — an inbox is a pointer, not a mirror.
    preview = Column(String, nullable=True)
    context_title = Column(String, nullable=True)

    status = Column(String, nullable=False, default="active", index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # When an email went out for this notification. The batching key: at most one
    # send per (recipient, journey, UTC day), so a question that catches fire
    # sends one email, not twenty. NULL means no email was sent for this row —
    # either it was batched away, the member has no address, or sending is off.
    email_sent_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


class Journey(Base):
    """A single feed post — a shared milestone timeline OR a question.

    Timeline posts carry an ordered list of :class:`JourneyMilestone` rows plus
    a coarse profile (stream/occupation/state/sponsor). Question posts carry a
    title + body. The lodged/decided span is *derived* from the milestones and
    mirrored into ``community_timelines`` so the existing percentile engine
    keeps working untouched.

    Seeded sample posts (``is_sample``) populate the feed and, since Phase 4,
    also feed the public statistics — but only under the condition that made
    including them defensible: every figure they contribute to states its
    composition in the open ("N reported by members, M collected from public
    forums"). Their mirror rows carry ``source="forum"`` so that sentence can be
    written from the data rather than asserted. Reversible with one setting —
    ``settings.community_stats_include_forum``.
    """

    __tablename__ = "community_journeys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anon_identities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    post_type = Column(String, nullable=False, default="timeline", index=True)

    # Classification / filtering
    subclass_slug = Column(String, nullable=True, index=True)  # e.g. "186"
    category_slug = Column(String, nullable=True, index=True)  # visa family / space

    # Coarse, non-identifying profile (timeline posts)
    stream = Column(String, nullable=True)        # DE | TRT | Labour Agreement | PT…
    # The coded occupation — a 6-digit ANZSCO code from ``occupations``, in the
    # edition the subclass reads (``VisaSubclass.anzsco_version``). This is what
    # cohort matching uses; it is required for every subclass that has a
    # nominated occupation and NULL for those that do not.
    occupation_code = Column(String, nullable=True, index=True)
    # Display snapshot of the occupation's name at the time of posting. Kept
    # beside the code, not replaced by it, for two reasons: the feed renders it
    # without a join, and it stays truthful if the department later renames or
    # retires the occupation. Rows written before the picker existed carry free
    # text here and a NULL code — that is history, not a bug to backfill, since
    # "Nurse" cannot be resolved to one of the eleven coded nursing occupations.
    occupation = Column(String, nullable=True)
    # A state or territory only — "Offshore" used to live in here too, which
    # conflated *where the applicant is* with *which state nominated them*. It
    # moved to ``lodgement_location``; the migration rewrites the old rows.
    state = Column(String, nullable=True)         # NSW | VIC | QLD…
    area = Column(String, nullable=True)          # metro | regional
    sponsor_type = Column(String, nullable=True)  # accredited | non_accredited | null

    # Were they in Australia when they lodged? The single most-requested field
    # on the competitor trackers, where members currently cram it into free
    # text. It splits waits sharply on several subclasses and is asked of
    # everyone, because every visa is lodged from somewhere.
    lodgement_location = Column(String, nullable=True)  # onshore | offshore

    # Nationality is collected for cohort matching and **never published**.
    # Members on the public trackers self-organise into national sub-groups
    # because processing genuinely differs, but a pseudonymous timeline plus a
    # nationality plus a lodgement date is a re-identifying triple in a small
    # cohort. It is excluded from every public serializer — see
    # ``CommunityService.journey_out`` and the test that asserts its absence.
    nationality = Column(String, nullable=True)

    # Self-lodged or through a registered agent. A distinct column on the
    # competitor's tracker, and the plausible explanation for a chunk of the
    # variance we cannot otherwise account for.
    lodged_via = Column(String, nullable=True)  # self | agent

    # "No CO contact. Direct from received to finalised." Roughly one timeline
    # post in five asserts an absence like this, and it is the densest claim in
    # a skilled timeline — it says the case ran clean.
    #
    # This is a *positive assertion*, not an absent milestone: without it, a
    # confirmed-clean run and a half-filled form are the same empty list. NULL
    # means "not stated", which is different again from False ("there was
    # contact") — hence a nullable Boolean rather than a default-false flag.
    direct_grant = Column(Boolean, nullable=True)

    outcome = Column(String, nullable=False, default="waiting", index=True)

    # Content
    title = Column(String, nullable=True)         # question posts
    note = Column(Text, nullable=True)            # caption / question body

    # Display snapshot (stable even if the identity later changes)
    handle = Column(String, nullable=False)
    color = Column(String, nullable=False)

    upvotes = Column(Integer, nullable=False, default=0)
    comment_count = Column(Integer, nullable=False, default=0)
    is_sample = Column(Boolean, nullable=False, default=False, index=True)
    status = Column(String, nullable=False, default="active", index=True)

    # Normalised hash of the body, for spotting the same text broadcast across
    # several threads (``antispam.fingerprint``). NULL when the body is too
    # short to fingerprint — short repeated replies ("any update?") are the
    # normal texture of a waiting room, not duplicate spam.
    content_fingerprint = Column(String, nullable=True, index=True)

    # Draft vs public. ``status`` is moderation's axis (active/hidden/removed);
    # this is the *author's* axis and the two are independent — a saved wait
    # check is a perfectly healthy row that its owner has simply not published.
    #
    # Defaults to True so every pre-existing row, and every post made through
    # the composer, behaves exactly as it did before drafts existed. Only the
    # wait-check save path mints an unpublished row. Publishing is a separate,
    # explicit act (``CommunityService.publish_journey``) — saving privately and
    # sharing publicly are different decisions and must stay different calls.
    is_published = Column(Boolean, nullable=False, default=True, index=True)
    published_at = Column(DateTime(timezone=True), nullable=True)

    # Derived span for the stats engine (recomputed from milestones)
    lodged_on = Column(Date, nullable=True)
    decided_on = Column(Date, nullable=True)
    processing_days = Column(Integer, nullable=True)

    # Provenance for aggregated/seeded posts. INTERNAL ONLY — never surfaced in
    # the public API. Set when a sample journey was aggregated from a public
    # community discussion (anonymised + paraphrased): lets us honour takedown
    # requests, audit sourcing, and distinguish aggregated rows from hand-seeded
    # ones. Always NULL for genuine first-party member submissions.
    source_url = Column(String, nullable=True)
    source_site = Column(String, nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class JourneyMilestone(Base):
    """One dated step inside a :class:`Journey` (ordered by ``ordinal``)."""

    __tablename__ = "community_journey_milestones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journeys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    milestone_type = Column(String, nullable=False)
    occurred_on = Column(Date, nullable=False)
    ordinal = Column(Integer, nullable=False, default=0)
    label = Column(String, nullable=True)  # optional custom label for "Other"


class JourneyComment(Base):
    """A flat (one-level) comment on a journey.

    ``parent_comment_id`` always points at a *top-level* message — the service
    flattens any deeper reply onto its top-level ancestor — so the conversation
    is "message → replies", never a branching tree.
    """

    __tablename__ = "community_journey_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journeys.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_comment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journey_comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    identity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anon_identities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    handle = Column(String, nullable=False)
    color = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    upvotes = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="active", index=True)
    # See Journey.content_fingerprint.
    content_fingerprint = Column(String, nullable=True, index=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


class CommunityVote(Base):
    """Dedup table — one row per (identity, target). Re-voting toggles off."""

    __tablename__ = "community_votes"
    __table_args__ = (
        UniqueConstraint(
            "identity_id",
            "target_type",
            "target_id",
            name="uq_community_vote_identity_target",
        ),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anon_identities.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_type = Column(String, nullable=False)  # journey | comment
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class CommunitySpace(Base):
    """A visa-category topic space (e.g., 'Skilled Migration', 'Partner Visas')."""

    __tablename__ = "community_spaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, nullable=True)
    member_count = Column(Integer, nullable=False, default=0)
    thread_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class CommunityThread(Base):
    __tablename__ = "community_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_spaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Author. Community posting is fully anonymous: author_user_id is always
    # NULL, and author_display_name holds whatever name the poster supplied
    # (or "Anonymous" when is_anonymous=True).
    author_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    author_display_name = Column(String, nullable=True)
    is_anonymous = Column(Boolean, nullable=False, default=True)
    author_ip_hash = Column(String, nullable=True, index=True)  # For rate limiting / abuse triage only

    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)

    upvotes = Column(Integer, nullable=False, default=0)
    reply_count = Column(Integer, nullable=False, default=0)
    view_count = Column(Integer, nullable=False, default=0)

    is_pinned = Column(Boolean, nullable=False, default=False)
    status = Column(String, nullable=False, default="active", index=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_comment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_comments.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    author_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    author_display_name = Column(String, nullable=True)
    is_anonymous = Column(Boolean, nullable=False, default=True)
    author_ip_hash = Column(String, nullable=True, index=True)

    body = Column(Text, nullable=False)
    upvotes = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="active", index=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )


class CommunityReport(Base):
    """A user-submitted report on a thread or comment."""

    __tablename__ = "community_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_type = Column(String, nullable=False)  # thread | comment
    target_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    reporter_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    # Which community member reported it, when one is resolvable. Needed to
    # weight the report by their trust tier — an established member's report is
    # a stronger signal than an anonymous one, and that is the difference
    # between a moderation queue that surfaces real problems and one that
    # surfaces whoever is angriest.
    reporter_identity_id = Column(
        UUID(as_uuid=True),
        ForeignKey("anon_identities.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reporter_ip_hash = Column(String, nullable=True)

    reason = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="open", index=True)
    # member | auto — auto rows are the anti-spam screen's holds.
    source = Column(
        String, nullable=False, default="member", server_default="member", index=True
    )
    # What this report counts for against the auto-hold threshold. Snapshotted
    # at report time rather than derived at read time, so a member's later
    # promotion or demotion cannot retroactively change what their old reports
    # were worth.
    weight = Column(Integer, nullable=False, default=1, server_default="1")

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    resolution_note = Column(Text, nullable=True)


class VisaSubclass(Base):
    """One row per visa subclass **+ stream** — the unit Home Affairs publishes.

    Home Affairs publishes processing times per (subclass, stream) pair, and so
    do we: 43 subclasses expand to 76 rows. A member picks a subclass, then a
    stream, and lands on exactly one row here. Rows are refreshed from the
    department's own JSON API — see ``scripts/fetch_dha_taxonomy.py`` and
    ``scripts/seed_visa_taxonomy.py``.

    Two keys, and the difference matters:

    ``slug``       what the member picked, e.g. ``186-direct-entry``. Stored on
                   ``Journey.subclass_slug``. Selects the official figures.
    ``cohort_key`` what the community statistics pool on. For 500 (7 streams
                   spanning 35x) it equals ``slug`` — merging them would be
                   malpractice. For 186 (3 streams within 10%) every stream
                   shares ``186``, because splitting a scarce sample for no
                   signal is the more expensive mistake. This is the value
                   written to ``CommunityTimeline.subclass_slug``.
    """

    __tablename__ = "visa_subclasses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Stable identifier used in URLs/queries, e.g. "189-points-tested".
    slug = Column(String, nullable=False, unique=True, index=True)
    code = Column(String, nullable=False, index=True)  # e.g. "189", "482"
    name = Column(String, nullable=False)
    stream = Column(String, nullable=True)
    # Links a subclass to its discussion space (community_spaces.slug).
    category_slug = Column(String, nullable=True, index=True)

    # The statistics cohort this row contributes to (see class docstring).
    cohort_key = Column(String, nullable=True, index=True)
    # Home Affairs' own identifiers. ``dha_subclass_code`` is NOT an integer:
    # "482-1", "858-3" (legacy Global Talent) and "858-4" (National Innovation)
    # are all real, and 858 answers to two different programs.
    dha_subclass_code = Column(String, nullable=True, index=True)
    dha_stream_code = Column(String, nullable=True)
    # 482/870 publish "Nomination" and "Sponsorship" as pseudo-streams. They are
    # lodgement stages with their own clocks, never a "which stream are you on?"
    # answer, so they are excluded from the picker.
    is_stage = Column(Boolean, nullable=False, default=False, server_default="false")

    # Does this visa have a *nominated occupation*? Populated by
    # ``scripts/seed_occupations.py`` from the department's own skilled
    # occupation list — a subclass no occupation is eligible for has no
    # occupation to nominate.
    #
    # This drives whether the share form asks for one at all, and "no" means
    # **hidden**, not "optional". A 600 Tourist or a partner-visa applicant has
    # no ANZSCO occupation; offering the field anyway invites a guess, and a
    # guessed occupation is worse than a null one because it pools that timeline
    # into a cohort it does not belong to.
    requires_occupation = Column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Which ANZSCO edition this subclass reads: "2022" for 186 and 482 (all of
    # CSOL), "2013" for every other skilled subclass, NULL where no occupation
    # applies. Home Affairs states this split verbatim on the occupation list
    # page and runs both editions concurrently.
    #
    # It is a column rather than a constant because it is *their* rule and it
    # will move: 416 occupations carry both codes and only 7 of them differ, so
    # a wrong edition is invisible in testing and permanently wrong in the data.
    # See ``Occupation.code_for_version``.
    anzsco_version = Column(String, nullable=True)

    # The rest of the "what does this visa actually need?" set. Same contract as
    # ``requires_occupation`` above: false means the form does not ask, not that
    # the answer is optional. Populated by ``scripts/seed_visa_taxonomy.py``.
    #
    # These are policy facts about the visa, not figures from the department's
    # feed, which is why the seeder carries them rather than the fetcher — there
    # is no DHA endpoint that says "190 needs a nominating state".
    #
    # Does a state or territory nominate this applicant? True for the points-
    # tested nomination visas (190, 491) and for employer-sponsored visas, where
    # the question means "which state is the job in".
    requires_state_nomination = Column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Is metro-vs-regional a real distinction for this visa? Only the regional
    # visas (190, 491, 494) turn on it. Asking a 482 applicant whether their
    # employer is regional collects an answer that predicts nothing.
    requires_region = Column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Does an accredited-sponsor status change the wait? Only 482 and 186 —
    # accredited sponsorship is a priority-processing arrangement, and it exists
    # nowhere else in the programme.
    requires_sponsor_type = Column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    official_p25_days = Column(Integer, nullable=True)
    official_p50_days = Column(Integer, nullable=True)
    official_p75_days = Column(Integer, nullable=True)
    official_p90_days = Column(Integer, nullable=True)
    official_updated = Column(String, nullable=True)  # human label, e.g. "26 June 2026"
    official_end_date = Column(String, nullable=True)  # finalisations counted to

    sort_order = Column(Integer, nullable=False, default=100)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    @property
    def group_key(self) -> str:
        """What a picker groups streams under — one entry per *program*.

        Not ``code``: subclass 858 covers both the legacy Global Talent visa and
        the current National Innovation visa, and both are streamless, so
        grouping on "858" would merge two programs whose waits differ by 3.5x
        into one indistinguishable entry.
        """
        return self.dha_subclass_code or self.code


class Occupation(Base):
    """One ANZSCO occupation from the Home Affairs skilled occupation list.

    714 rows, refreshed from the department's own page — see
    ``scripts/fetch_dha_occupations.py`` and ``scripts/seed_occupations.py``.

    This table exists to kill free text. Before it, ``Journey.occupation`` was an
    80-character box with the placeholder "e.g. Nurse, Developer", which made
    "Nurse", "nurse", "RN" and "Registered Nurse (Medical)" four separate
    cohorts — four samples of one where there should have been one sample of
    four. Occupation is the strongest predictor of a skilled-visa wait after the
    subclass itself, and it is worthless unless it is coded.

    **Two codes, not one.** Home Affairs runs two ANZSCO editions at once:
    2022 for subclass 186 and 482, 2013 for every other skilled subclass. 416
    occupations carry both and 409 of those agree, so storing one edition looks
    correct right up until one of the seven that disagree — Arborist, Flower
    Grower, Landscape Gardener, Management Consultant, Plumber (General),
    Statistician, Zoologist — silently lands in the wrong cohort. Resolve with
    ``code_for_version`` against ``VisaSubclass.anzsco_version``; never reach for
    one of the columns directly.
    """

    __tablename__ = "occupations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Natural key for the seeder, derived from the name. Occupation names are
    # unique across all 714 rows, and unlike the ANZSCO codes they exist for
    # every row — 255 occupations carry only a 2013 code and 43 only a 2022 one,
    # so neither code column can serve as the match key on its own.
    slug = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False, index=True)

    anzsco_2013_code = Column(String, nullable=True, index=True)
    anzsco_2022_code = Column(String, nullable=True, index=True)

    # First digit of the ANZSCO code. The picker groups on this: 714 rows (457
    # of them eligible for subclass 186 alone) is an unreadable flat list, and
    # the competing trackers ship exactly that, tagging every row "Other"
    # because they never extracted the group.
    major_group_code = Column(String, nullable=True, index=True)
    major_group_name = Column(String, nullable=True)

    # MLTSSL / STSOL / ROL / CSOL / "RSMS ROL" — an occupation is usually on
    # more than one.
    lists = Column(ARRAY(String), nullable=False, server_default="{}")
    # Bare subclass numbers ("186", "482", "491"). The picker filters on this so
    # a 189 applicant is never offered an occupation only a 482 can nominate.
    eligible_subclasses = Column(ARRAY(String), nullable=False, server_default="{}")

    # Stored, not yet surfaced. Whose positive skills assessment this occupation
    # needs — "VETASSESS", "ACS", "Engineers Australia". 24 rows name none.
    assessing_authority = Column(String, nullable=True)
    authority_url = Column(String, nullable=True)

    # Retired, never deleted — same contract as ``VisaSubclass``. A member's
    # timeline must not lose its occupation because the department pruned a list.
    is_active = Column(Boolean, nullable=False, default=True, server_default="true")
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    def code_for_version(self, version: Optional[str]) -> Optional[str]:
        """The ANZSCO code this occupation answers to under a given edition.

        Falls back to the other edition rather than returning NULL: 298 of 714
        occupations are single-edition, and a 189 applicant picking one of the
        43 that exist only under 2022 should still get a code stamped on their
        timeline. A code from the wrong edition is recoverable — the pair is
        stored — while a NULL is the free-text problem all over again.
        """
        if version == "2022":
            return self.anzsco_2022_code or self.anzsco_2013_code
        return self.anzsco_2013_code or self.anzsco_2022_code


class CommunityTimeline(Base):
    """An anonymous, community-submitted visa processing timeline.

    The spine of the "is my wait normal?" engine. ``granted_on``/``refused`` set
    ``outcome`` to a decided state and yield a processing duration; a NULL
    decision date means the applicant is still waiting (counted as the pending
    denominator so stats don't suffer survivorship bias).
    """

    __tablename__ = "community_timelines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subclass_slug = Column(String, nullable=False, index=True)

    # When a row is the materialised span of a shared Journey, this links back
    # to it so moderation of the journey can suppress its stats contribution.
    # NULL for legacy / directly-submitted timelines.
    journey_id = Column(
        UUID(as_uuid=True),
        ForeignKey("community_journeys.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    lodged_on = Column(Date, nullable=False)
    decided_on = Column(Date, nullable=True)  # grant/refusal date; NULL = waiting
    outcome = Column(String, nullable=False, default="waiting", index=True)

    # Provenance — "member" (first-party) or "forum" (collected from public
    # forums, anonymised). Both feed the public numbers; the API always reports
    # the split alongside the number so a reader can judge it for themselves.
    source = Column(
        String, nullable=False, default="member", server_default="member", index=True
    )

    country = Column(String, nullable=True)  # applicant country (optional, coarse)
    note = Column(String, nullable=True)  # short, optional free text

    author_ip_hash = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="active", index=True)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
