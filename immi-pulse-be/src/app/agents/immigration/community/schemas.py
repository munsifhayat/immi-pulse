"""Pydantic schemas for the Community feature."""

from datetime import date, datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.agents.immigration.community.models import (
    MILESTONE_TYPES,
    NOTIFICATION_TYPES,
    POST_TYPES,
    REPORT_REASONS,
    REPORT_STATUSES,
    REPORT_TARGET_TYPES,
    THREAD_STATUSES,
    TIMELINE_OUTCOMES,
)

ThreadStatusLiteral = Literal["active", "held", "hidden", "removed"]
ReportTargetLiteral = Literal["thread", "comment", "journey", "journey_comment"]
ReportReasonLiteral = Literal["spam", "harassment", "misleading_advice", "other"]
ReportStatusLiteral = Literal["open", "actioned", "dismissed"]
ThreadSortLiteral = Literal["new", "top", "trending"]
TimelineOutcomeLiteral = Literal["waiting", "granted", "refused"]
TrendLiteral = Literal["faster", "slower", "steady"]
WaitTierLiteral = Literal["on_track", "normal", "longer", "outlier", "unknown"]
WaitBasisLiteral = Literal["community", "official", "none"]
PostTypeLiteral = Literal["timeline", "question"]
NotificationTypeLiteral = Literal["reply_to_post", "reply_to_comment"]

assert set(THREAD_STATUSES) == set(ThreadStatusLiteral.__args__)
assert set(REPORT_TARGET_TYPES) == set(ReportTargetLiteral.__args__)
assert set(REPORT_REASONS) == set(ReportReasonLiteral.__args__)
assert set(REPORT_STATUSES) == set(ReportStatusLiteral.__args__)
assert set(TIMELINE_OUTCOMES) == set(TimelineOutcomeLiteral.__args__)
assert set(POST_TYPES) == set(PostTypeLiteral.__args__)
assert set(NOTIFICATION_TYPES) == set(NotificationTypeLiteral.__args__)


# --- Spaces ------------------------------------------------------------------


class CommunitySpaceOut(BaseModel):
    id: UUID
    slug: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    member_count: int
    thread_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateCommunitySpaceRequest(BaseModel):
    slug: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9\-]+$")
    name: str = Field(min_length=2, max_length=120)
    description: Optional[str] = None
    icon: Optional[str] = None


# --- Threads -----------------------------------------------------------------


class CreateThreadRequest(BaseModel):
    space_slug: str
    title: str = Field(min_length=4, max_length=200)
    body: str = Field(min_length=1, max_length=10000)
    is_anonymous: bool = True
    author_display_name: Optional[str] = Field(default=None, max_length=60)


class ThreadOut(BaseModel):
    id: UUID
    space_id: UUID
    space_slug: Optional[str] = None
    space_name: Optional[str] = None
    author_display_name: Optional[str] = None
    is_anonymous: bool
    title: str
    body: str
    upvotes: int
    reply_count: int
    view_count: int
    is_pinned: bool
    status: ThreadStatusLiteral
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ThreadWithCommentsOut(ThreadOut):
    comments: list["CommentOut"] = []


# --- Comments ----------------------------------------------------------------


class CreateCommentRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    parent_comment_id: Optional[UUID] = None
    is_anonymous: bool = True
    author_display_name: Optional[str] = Field(default=None, max_length=60)


class CommentOut(BaseModel):
    id: UUID
    thread_id: UUID
    parent_comment_id: Optional[UUID] = None
    author_display_name: Optional[str] = None
    is_anonymous: bool
    body: str
    upvotes: int
    status: ThreadStatusLiteral
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Reports -----------------------------------------------------------------


class ReportRequest(BaseModel):
    reason: ReportReasonLiteral
    description: Optional[str] = Field(default=None, max_length=1000)


class ReportOut(BaseModel):
    id: UUID
    target_type: ReportTargetLiteral
    target_id: UUID
    reason: ReportReasonLiteral
    description: Optional[str] = None
    status: ReportStatusLiteral
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_note: Optional[str] = None

    # Populated on the admin queue so a moderator can see what was reported
    # (a snippet of the content, its current status, and the author handle)
    # without a separate lookup. Null on the public report-created response.
    target_preview: Optional[str] = None
    target_status: Optional[str] = None
    target_handle: Optional[str] = None

    # "member" or "auto". An automatic hold and a member's report need visibly
    # different handling in the queue: one is a machine's guess that a human is
    # being asked to confirm, the other is a person telling us something. A
    # moderator who cannot tell them apart will work them at the same speed,
    # which is the wrong speed for both.
    source: str = "member"
    # What this report counted for against the auto-hold threshold, snapshotted
    # when it was filed.
    weight: int = 1

    model_config = {"from_attributes": True}


class ModerationActionRequest(BaseModel):
    action: Literal["hide", "remove", "dismiss"]
    note: Optional[str] = Field(default=None, max_length=1000)


# --- Stats -------------------------------------------------------------------


class CommunityStatsOut(BaseModel):
    total_spaces: int
    total_threads: int
    total_comments: int


# --- Processing times & timelines -------------------------------------------


class VisaSubclassOut(BaseModel):
    """One selectable visa: a subclass **+ stream** pair, as Home Affairs
    publishes them.

    The client builds its two-step picker by grouping on ``group_key`` — 43
    groups across 76 rows. Group on ``code`` instead and you get 42, because
    subclass 858 answers to two different programs: legacy Global Talent
    (lodged before 6 Dec 2024, p50 426 days) and the current National Innovation
    visa (p50 122 days). Both are streamless, so a member could not tell them
    apart in a stream dropdown — they have to be separate groups.

    ``is_stage`` rows (482/870 nomination and sponsorship) are lodgement stages
    rather than answers to "which stream are you on?", so the picker filters
    them out.
    """

    slug: str
    code: str
    name: str
    # Home Affairs' own program discriminator: "189", "482-1", "858-3", "858-4".
    # Not an integer — never parse it as one.
    group_key: str
    stream: Optional[str] = None
    category_slug: Optional[str] = None
    is_stage: bool = False
    # Does this visa have a nominated occupation? Drives whether the share form
    # shows the occupation picker *at all*. False means hidden, not optional —
    # a 600 Tourist applicant has no ANZSCO occupation, and a field they must
    # guess at pools their timeline into a cohort it does not belong to.
    requires_occupation: bool = False
    # "2013" | "2022" | null. Which ANZSCO edition this subclass reads. Clients
    # do not resolve codes themselves — the occupations endpoint returns the
    # already-resolved ``anzsco_code`` — but this makes the choice visible.
    anzsco_version: Optional[str] = None
    official_p50_days: Optional[int] = None
    official_p90_days: Optional[int] = None
    official_updated: Optional[str] = None

    model_config = {"from_attributes": True}


class OccupationOut(BaseModel):
    """One ANZSCO occupation, resolved against the visa that asked for it.

    ``anzsco_code`` is the field to store and compare on. It is resolved
    server-side from the subclass's ANZSCO edition — 2022 for subclass 186 and
    482, 2013 for every other skilled subclass — because both editions travel
    in the payload and picking the wrong one is silent: 416 occupations carry
    both codes and only 7 disagree. Clients must never choose between the two
    columns themselves.

    Group on ``major_group_code`` when rendering. A flat list of 714 (457 for
    subclass 186 alone) is the pattern the competing trackers ship and the one
    to beat.
    """

    slug: str
    name: str
    # Already resolved for the requested subclass. Store this.
    anzsco_code: Optional[str] = None
    anzsco_version: Optional[str] = None
    # Both editions travel so a client can show "221111 (2013) / 221111 (2022)"
    # on the seven divergent occupations without a second request.
    anzsco_2013_code: Optional[str] = None
    anzsco_2022_code: Optional[str] = None
    major_group_code: Optional[str] = None
    major_group_name: Optional[str] = None
    lists: list[str] = Field(default_factory=list)
    eligible_subclasses: list[str] = Field(default_factory=list)
    assessing_authority: Optional[str] = None
    authority_url: Optional[str] = None


class ProvenanceOut(BaseModel):
    """What a community figure is made of.

    Ships with every Room number. Forum-collected timelines were allowed to
    count toward public statistics on exactly one condition — that the split is
    always visible — so this is not optional metadata; it is the term of that
    decision, encoded in the payload.
    """

    member_reported: int = 0
    forum_collected: int = 0
    total: int = 0


class CommunityDurationStats(BaseModel):
    """Percentile bands computed live from community timelines (all in days).

    ``sufficient`` is the field a client must branch on. When it is false, the
    percentiles are thin and must not be rendered as an answer — show
    ``provenance_note`` and the official block instead.
    """

    sample_size: int
    pending: int
    sufficient: bool = False
    min_sample: int = 20
    window_months: int = 12
    provenance: ProvenanceOut = Field(default_factory=ProvenanceOut)
    provenance_note: Optional[str] = None
    p25: Optional[int] = None
    p50: Optional[int] = None
    p75: Optional[int] = None
    p90: Optional[int] = None
    fastest: Optional[int] = None
    slowest: Optional[int] = None


class OfficialFiguresOut(BaseModel):
    """The Department of Home Affairs published bands, with their as-at date.

    These are ingested from the department's own processing-times API, so
    ``as_at`` and ``counted_to`` are their labels, not ours: "26 June 2026" and
    "31 May 2026" respectively — a figure published in late June counts
    finalisations only to the end of May, and saying so is what makes it honest.
    ``is_live`` is true once a row carries a real as-at date.

    All four percentiles travel because Home Affairs publishes all four, and the
    25th/75th are what make a distribution legible rather than two lonely points.
    """

    p25_days: Optional[int] = None
    p50_days: Optional[int] = None
    p75_days: Optional[int] = None
    p90_days: Optional[int] = None
    as_at: Optional[str] = None
    counted_to: Optional[str] = None
    source: str = "Department of Home Affairs"
    is_live: bool = False


class ProcessingStatOut(BaseModel):
    """One row of the official-vs-community processing-times board."""

    slug: str
    code: str
    name: str
    stream: Optional[str] = None
    category_slug: Optional[str] = None

    official_p50_days: Optional[int] = None
    official_p90_days: Optional[int] = None
    official_updated: Optional[str] = None

    # The two blocks a client must render together — never one without the
    # other. ``community`` is the pre-Phase-4 alias of ``room``, kept so the
    # existing frontend keeps working through the transition.
    official: OfficialFiguresOut = Field(default_factory=OfficialFiguresOut)
    room: CommunityDurationStats
    community: CommunityDurationStats
    trend: TrendLiteral = "steady"


class SubmitTimelineRequest(BaseModel):
    subclass_slug: str
    lodged_on: date
    outcome: TimelineOutcomeLiteral = "waiting"
    decided_on: Optional[date] = None
    country: Optional[str] = Field(default=None, max_length=60)
    note: Optional[str] = Field(default=None, max_length=280)

    @model_validator(mode="after")
    def _check_dates(self) -> "SubmitTimelineRequest":
        today = date.today()
        if self.lodged_on > today:
            raise ValueError("Lodgement date cannot be in the future.")
        if self.outcome == "waiting":
            # A still-waiting timeline never carries a decision date.
            self.decided_on = None
        else:
            if self.decided_on is None:
                raise ValueError("A decided outcome requires a decision date.")
            if self.decided_on < self.lodged_on:
                raise ValueError("Decision date cannot precede lodgement.")
            if self.decided_on > today:
                raise ValueError("Decision date cannot be in the future.")
        return self


class TimelineOut(BaseModel):
    id: UUID
    subclass_slug: str
    lodged_on: date
    decided_on: Optional[date] = None
    outcome: TimelineOutcomeLiteral
    processing_days: Optional[int] = None
    country: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WaitCheckOut(BaseModel):
    """Result of the "is my wait normal?" check for an in-progress application."""

    subclass_slug: str
    subclass_label: str
    elapsed_days: int

    tier: WaitTierLiteral
    basis: WaitBasisLiteral = "community"
    headline: str
    detail: str
    share_decided_within: Optional[int] = None

    sample_size: int
    pending: int
    sufficient: bool = False
    min_sample: int = 20
    window_months: int = 12
    provenance: ProvenanceOut = Field(default_factory=ProvenanceOut)
    provenance_note: Optional[str] = None
    p25: Optional[int] = None
    p50: Optional[int] = None
    p75: Optional[int] = None
    p90: Optional[int] = None
    fastest: Optional[int] = None
    slowest: Optional[int] = None

    official_p50_days: Optional[int] = None
    official_p90_days: Optional[int] = None
    official_updated: Optional[str] = None

    # Explicit blocks. A client renders both or neither: the official figure
    # without the community's is a marketing claim, and the community's without
    # the official one is a crowd-sourced number with nothing to check it
    # against. ``room`` is the superseded name of ``community``, still emitted
    # so a client mid-deploy keeps working.
    official: OfficialFiguresOut = Field(default_factory=OfficialFiguresOut)
    community: CommunityDurationStats
    room: CommunityDurationStats


class SaveWaitCheckRequest(BaseModel):
    """Save a wait check as the member's own, unpublished, timeline.

    Running the check needs no account and no body at all — this is the separate,
    later act of keeping the result. It publishes nothing.
    """

    subclass_slug: str = Field(..., min_length=1, max_length=64)
    lodged_on: date
    note: Optional[str] = Field(default=None, max_length=2000)
    milestones: list["MilestoneIn"] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check(self) -> "SaveWaitCheckRequest":
        if self.lodged_on > date.today():
            raise ValueError("Lodgement date cannot be in the future.")
        return self


class PublishJourneyRequest(BaseModel):
    """The second consent, and the only way a saved timeline reaches the feed.

    ``consent_public`` must be sent as true. Requiring an affirmative field
    rather than treating the call itself as consent means a mis-wired client
    cannot publish someone's private timeline by accident — the intent has to be
    stated, not merely implied by which URL was hit.
    """

    consent_public: bool = False

    @model_validator(mode="after")
    def _check(self) -> "PublishJourneyRequest":
        if not self.consent_public:
            raise ValueError(
                "Publishing to the feed needs explicit consent."
            )
        return self


class AddMilestonesRequest(BaseModel):
    """Add later steps (medical, s56, grant) to a timeline you own."""

    milestones: list["MilestoneIn"] = Field(..., min_length=1)
    outcome: Optional[TimelineOutcomeLiteral] = None


# --- Community feed v2: identity, journeys, milestones, comments, votes ------


class IdentityOut(BaseModel):
    """The device's anonymous identity. ``device_token`` is returned only on
    bootstrap/reroll so the client can persist it; reads omit it."""

    handle: str
    color: str
    initials: str
    journeys_posted: int
    is_claimed: bool  # True once linked to a real account → posting uncapped
    can_post_timeline: bool
    device_token: Optional[str] = None
    # True once a password has been set — the device is a real account and can
    # sign in elsewhere. Drives "claim this" vs "log in" in the composer.
    has_account: bool = False


# --- Community accounts (pseudonymous signup / login / recovery) -------------


class CommunitySignupRequest(BaseModel):
    """Claim this device's identity as an account.

    One password field, no confirm-password — a show-password toggle is the
    better affordance and confirmation fields add friction for no real gain.

    Email is **required** and deliberately unverified: the member types it and
    is signed in immediately. The address is confirmed by retyping it on the
    client (a typo guard, not a verification step), because an unverified
    address that is also mistyped is silently unrecoverable. It lands in
    ``email_pending`` until ownership is actually proven.
    """

    password: str = Field(min_length=8, max_length=128)
    email: EmailStr


class CommunityLoginRequest(BaseModel):
    handle: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class CommunityRecoverRequest(BaseModel):
    email: EmailStr


class CommunityResetPasswordRequest(BaseModel):
    token: str = Field(min_length=8, max_length=256)
    password: str = Field(min_length=8, max_length=128)


class CommunityAccountOut(BaseModel):
    """The member's own view of their account. Deliberately carries no email
    address — only whether one exists — so the value cannot leak through here."""

    handle: str
    color: str
    has_email: bool
    email_verified: bool
    can_recover: bool
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None


class CommunitySessionOut(BaseModel):
    """Issued on signup, login and password reset — a session, and nothing else.

    Carries **no** device token on purpose. Echoing one made every client
    overwrite the browser's identity with the account's, which merged two
    browsers into one identity and left a signed-out visitor still writing as
    the last member to use the machine. The browser's identity is now that
    browser's own business (``/community/public/identity``).
    """

    token: str
    expires_at: datetime
    account: CommunityAccountOut


class CommunityRecoverAcceptedOut(BaseModel):
    """Identical whether or not the address is known — never an account oracle."""

    detail: str


class MilestoneIn(BaseModel):
    milestone_type: str
    occurred_on: date
    label: Optional[str] = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def _check(self) -> "MilestoneIn":
        if self.milestone_type not in MILESTONE_TYPES:
            raise ValueError(f"Unknown milestone type '{self.milestone_type}'.")
        if self.occurred_on > date.today():
            raise ValueError("Milestone date cannot be in the future.")
        return self


# The wait-check request models above reference MilestoneIn by name because they
# read better beside the rest of the wait-check contract than they would buried
# in the journey section. Now that the name exists, resolve the forward refs.
SaveWaitCheckRequest.model_rebuild()
AddMilestonesRequest.model_rebuild()


class MilestoneOut(BaseModel):
    id: UUID
    milestone_type: str
    occurred_on: date
    ordinal: int
    label: Optional[str] = None

    model_config = {"from_attributes": True}


class CreateJourneyRequest(BaseModel):
    post_type: PostTypeLiteral = "timeline"

    subclass_slug: Optional[str] = Field(default=None, max_length=64)
    category_slug: Optional[str] = Field(default=None, max_length=64)

    # Coarse profile (timeline posts)
    stream: Optional[str] = Field(default=None, max_length=60)
    # The occupation's slug from ``GET /public/occupations``. Required for every
    # subclass whose ``requires_occupation`` is true — enforced in
    # ``CommunityService.create_journey``, which is the only layer that can see
    # the subclass row. The name and ANZSCO code are resolved server-side; a
    # client cannot name its own occupation.
    occupation_slug: Optional[str] = Field(default=None, max_length=120)
    # NOTE: there is deliberately no free-text ``occupation`` field here any
    # more. It was an 80-character box placeheld "e.g. Nurse, Developer", and
    # it made "Nurse", "nurse", "RN" and "Registered Nurse (Medical)" four
    # cohorts of one. Keeping it as a fallback would have kept the problem
    # alive on exactly the visas the coded list matters most for.
    # ``Journey.occupation`` still exists — as the display snapshot of the
    # picked occupation's name, and as history on rows written before the
    # picker.
    state: Optional[str] = Field(default=None, max_length=40)
    area: Optional[str] = Field(default=None, max_length=20)
    sponsor_type: Optional[str] = Field(default=None, max_length=40)

    outcome: TimelineOutcomeLiteral = "waiting"

    title: Optional[str] = Field(default=None, max_length=200)
    note: Optional[str] = Field(default=None, max_length=2000)

    milestones: list[MilestoneIn] = Field(default_factory=list)

    @model_validator(mode="after")
    def _check(self) -> "CreateJourneyRequest":
        if self.post_type == "question":
            if not (self.title and self.title.strip()):
                raise ValueError("A question needs a title.")
            if not (self.note and self.note.strip()):
                raise ValueError("A question needs a body.")
            self.milestones = []
            self.outcome = "waiting"
        else:  # timeline
            if not self.subclass_slug:
                raise ValueError("Pick the visa subclass for your timeline.")
            if not self.milestones:
                raise ValueError("Add at least one milestone to your timeline.")
            if self.outcome == "granted" and not any(
                m.milestone_type == "Visa Granted" for m in self.milestones
            ):
                # Tolerant: the derived span uses the last milestone as the
                # decision date if no explicit "Visa Granted" was added.
                pass
        return self


class JourneyOut(BaseModel):
    """A feed card (timeline or question)."""

    id: UUID
    post_type: PostTypeLiteral
    subclass_slug: Optional[str] = None
    category_slug: Optional[str] = None
    subclass_code: Optional[str] = None
    subclass_name: Optional[str] = None
    category_name: Optional[str] = None

    stream: Optional[str] = None
    # Display name, as snapshotted at posting time. Rows written before the
    # coded picker carry free text here with a null ``occupation_code``.
    occupation: Optional[str] = None
    # The 6-digit ANZSCO code, in the edition the subclass reads. This is the
    # cohort-matching key; ``occupation`` is for display only.
    occupation_code: Optional[str] = None
    state: Optional[str] = None
    area: Optional[str] = None
    sponsor_type: Optional[str] = None
    outcome: TimelineOutcomeLiteral

    title: Optional[str] = None
    note: Optional[str] = None

    handle: str
    color: str
    initials: str

    upvotes: int
    comment_count: int
    is_sample: bool
    # False = a saved-but-unpublished draft. Only ever returned to its owner
    # (the feed filters drafts out), so the UI can mark it "only you can see
    # this" and offer the publish action.
    is_published: bool = True
    # True while an automatic check has parked this post for review. Only ever
    # returned to its author — every other reader's query filters held content
    # out — so it exists purely so the member's own view can say honestly that
    # it is waiting rather than pretending it is live.
    is_held: bool = False
    is_mine: bool = False
    viewer_voted: bool = False

    processing_days: Optional[int] = None
    elapsed_days: Optional[int] = None  # lodged → today, for "still waiting"

    milestones: list[MilestoneOut] = []
    created_at: datetime


class JourneyReplyOut(BaseModel):
    id: UUID
    handle: str
    color: str
    initials: str
    body: str
    upvotes: int
    is_op: bool
    viewer_voted: bool = False
    reply_to: Optional[str] = None  # handle being replied to
    created_at: datetime


class JourneyMessageOut(BaseModel):
    """A top-level conversation message + its flat replies (one level)."""

    id: UUID
    handle: str
    color: str
    initials: str
    body: str
    upvotes: int
    is_op: bool
    viewer_voted: bool = False
    created_at: datetime
    replies: list[JourneyReplyOut] = []


class JourneyDetailOut(JourneyOut):
    messages: list[JourneyMessageOut] = []


class CreateJourneyCommentRequest(BaseModel):
    body: str = Field(min_length=1, max_length=5000)
    parent_comment_id: Optional[UUID] = None


class JourneyCommentOut(BaseModel):
    id: UUID
    journey_id: UUID
    parent_comment_id: Optional[UUID] = None
    handle: str
    color: str
    initials: str
    body: str
    upvotes: int
    created_at: datetime

    model_config = {"from_attributes": True}


class VoteResultOut(BaseModel):
    target_type: Literal["journey", "comment"]
    target_id: UUID
    upvotes: int
    voted: bool


# --- Inbox & profile ("You") -------------------------------------------------


class NotificationOut(BaseModel):
    """One inbox row. Carries no email address and no tier — see the leak sweep."""

    id: UUID
    type: NotificationTypeLiteral
    journey_id: UUID
    comment_id: UUID
    parent_comment_id: Optional[UUID] = None

    actor_handle: str
    actor_color: str
    actor_initials: str

    preview: Optional[str] = None
    context_title: Optional[str] = None
    post_type: PostTypeLiteral

    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime


class InboxOut(BaseModel):
    """The inbox page plus the badge. ``unread_count`` is always the total
    unread, not the unread on this page — a badge that moves when you paginate
    is a badge nobody believes."""

    items: list[NotificationOut] = []
    unread_count: int


class MarkReadRequest(BaseModel):
    """``ids`` omitted means "mark everything read"."""

    ids: Optional[list[UUID]] = None


class MarkReadOut(BaseModel):
    marked: int
    unread_count: int


class MyCommentOut(BaseModel):
    """A reply of mine, with enough of its post attached to be findable."""

    id: UUID
    journey_id: UUID
    journey_title: Optional[str] = None
    journey_post_type: PostTypeLiteral
    parent_comment_id: Optional[UUID] = None
    body: str
    upvotes: int
    created_at: datetime


class NotificationPreferencesRequest(BaseModel):
    """The off-switch for reply emails. The inbox itself cannot be switched off —
    it is the primary channel, and silently losing replies is not a preference
    anyone means to express."""

    email_replies: bool


class NotificationPreferencesOut(BaseModel):
    email_replies: bool
    # False when no address is on file: the preference is inert without one, and
    # saying so beats a toggle that appears to work and does nothing.
    email_available: bool


class AllowanceActionOut(BaseModel):
    """What is left for one action family today.

    ``limited_by`` says which ceiling is the binding one — an account that has
    run out because of its *network* rather than its own writing is a different
    situation, and the two deserve different words in the UI.
    """

    remaining: int
    limited_by: str


class AllowanceOut(BaseModel):
    """A read-only peek at today's remaining allowance.

    Exists so the composer can offer the sign-in prompt *before* a write is
    attempted rather than surfacing a 429 after the member has finished typing.
    Reading this spends nothing.

    ``tier`` is present because the caller is the account itself and the number
    is about them. It is **not** for any other surface: trust tier is never
    rendered as a score, and no public or consultant serializer carries it.
    """

    tier: int
    tier_name: str
    actions: dict[str, AllowanceActionOut]


class FeedSummaryOut(BaseModel):
    """Live counts for the left filter rail."""

    all: int
    questions: int
    timelines: int
    waiting: int
    granted: int
    by_category: dict[str, int]


ThreadWithCommentsOut.model_rebuild()
