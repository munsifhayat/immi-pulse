"""
Community API.

Public reads:  /community/public/*     (no X-API-Key)
Public writes: /community/threads ...  (no X-API-Key, IP-hash rate limited)
Admin:         /community/admin/*      (X-API-Key — add admin role later)
"""

import logging
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community.accounts import (
    AccountError,
    CommunityAccountService,
    device_token_from_request,
    issue_community_session_jwt,
    optional_community_account,
    require_community_account,
    send_recovery_email,
    set_device_cookie,
)
from app.agents.immigration.community import notifications
from app.agents.immigration.community.identity import initials_of
from app.agents.immigration.community.models import AnonIdentity, CommunityTimeline
from app.agents.immigration.community.schemas import (
    AddMilestonesRequest,
    AllowanceActionOut,
    AllowanceOut,
    CommunityAccountOut,
    CommunityLoginRequest,
    CommunityRecoverAcceptedOut,
    CommunityRecoverRequest,
    CommunityResetPasswordRequest,
    CommunitySessionOut,
    CommunitySignupRequest,
    CommunitySpaceOut,
    CommunityStatsOut,
    CreateCommunitySpaceRequest,
    CreateJourneyCommentRequest,
    CreateJourneyRequest,
    FeedSummaryOut,
    IdentityOut,
    InboxOut,
    JourneyCommentOut,
    JourneyDetailOut,
    JourneyOut,
    MarkReadOut,
    MarkReadRequest,
    ModerationActionRequest,
    MyCommentOut,
    NotificationOut,
    NotificationPreferencesOut,
    NotificationPreferencesRequest,
    OccupationOut,
    ProcessingStatOut,
    PublishJourneyRequest,
    ReportOut,
    ReportRequest,
    SaveWaitCheckRequest,
    SubmitTimelineRequest,
    TimelineOut,
    VisaSubclassOut,
    VoteResultOut,
    WaitCheckOut,
)
from app.agents.immigration.community.service import (
    CommunityRateLimitError,
    CommunityService,
    ContentGateError,
    JourneyCapError,
    hash_ip,
    remaining_allowance,
)
from app.core.jwt_auth import get_current_owner_or_admin
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["Community"])


# --- Helpers ----------------------------------------------------------------


def _client_ip_hash(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else None
    return hash_ip(ip)


def _device_token(request: Request) -> Optional[str]:
    """The per-device identity token — ``X-Device-Token`` header, then cookie.

    The header path is the original localStorage client; the HttpOnly cookie is
    the durable copy that survives Safari's seven-day ITP eviction. Both are
    honoured so the transition needs no flag day.
    """
    return device_token_from_request(request)


async def _viewer_identity(
    request: Request, db: AsyncSession, account: Optional[AnonIdentity]
) -> Optional[AnonIdentity]:
    """Who is reading — the signed-in account first, the device token second.

    Session beats device: someone who logs in on a borrowed or brand-new device
    must still see their own posts marked as theirs, and that is precisely the
    thing an account is for. Falls back to the device token so signed-out
    readers keep the ownership cues they had before accounts existed.
    """
    if account is not None:
        return account
    return await CommunityService.get_identity_by_token(db, _device_token(request))


async def _writer_identity(
    request: Request,
    db: AsyncSession,
    account: Optional[AnonIdentity],
    *,
    ip_hash: str,
) -> AnonIdentity:
    """Who is writing — the signed-in account, else this device's identity.

    Same precedence as :func:`_viewer_identity`, but this one always yields a
    row: an anonymous writer still gets a device identity minted for them, as
    before. Attribution follows the session so a member posting from a new
    device writes as themselves rather than as a stranger.
    """
    if account is not None:
        account.last_seen_at = datetime.now(timezone.utc)
        return account
    return await CommunityService.get_or_create_identity(
        db, token=_device_token(request), ip_hash=ip_hash
    )


def _timeline_out(timeline: CommunityTimeline) -> TimelineOut:
    processing_days = None
    if timeline.outcome == "granted" and timeline.decided_on is not None:
        processing_days = (timeline.decided_on - timeline.lodged_on).days
    payload = TimelineOut.model_validate(timeline).model_dump()
    payload["processing_days"] = processing_days
    return TimelineOut(**payload)


# --- Public: stats ----------------------------------------------------------


@router.get("/public/stats", response_model=CommunityStatsOut)
async def get_community_stats(db: AsyncSession = Depends(get_db)):
    return await CommunityService.get_stats(db)


# --- Public: processing times ("is my wait normal?") ------------------------


@router.get("/public/subclasses", response_model=list[VisaSubclassOut])
async def list_visa_subclasses(db: AsyncSession = Depends(get_db)):
    return await CommunityService.list_subclasses(db)


@router.get("/public/occupations", response_model=list[OccupationOut])
async def list_occupations(
    subclass: Optional[str] = Query(
        default=None,
        description="Visa subclass slug (186-direct-entry) or bare number (186).",
    ),
    q: Optional[str] = Query(
        default=None, description="Typeahead over occupation name and ANZSCO code."
    ),
    limit: int = Query(default=1000, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    """The ANZSCO skilled occupation list, filtered to a visa.

    Public and unauthenticated like the rest of ``/public`` — this feeds the
    share form, which anonymous members use before they have any identity at all.

    Two things this does that the competing trackers do not. It **filters by
    subclass**, so a 189 applicant sees the 212 occupations they can actually
    nominate rather than all 714. And it returns ``major_group_code``, so the
    client can group under the eight ANZSCO major groups instead of shipping a
    flat alphabetical list that opens on "Aboriginal and Torres Strait Islander
    Education Worker".

    ``anzsco_code`` is resolved server-side against the subclass's ANZSCO
    edition. Do not derive it client-side from the two code columns.
    """
    rows, version = await CommunityService.list_occupations(
        db, subclass=subclass, q=q, limit=limit
    )
    return [CommunityService.occupation_out(o, version) for o in rows]


@router.get("/public/processing", response_model=list[ProcessingStatOut])
async def get_processing_board(db: AsyncSession = Depends(get_db)):
    return await CommunityService.processing_board(db)


@router.get("/public/wait-check", response_model=WaitCheckOut)
async def wait_check(
    subclass: str = Query(..., min_length=1),
    lodged_on: date = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """"Is my wait normal?" — open to everyone, always.

    No account, no session, no device token, no API key. This is the acquisition
    hook and the SEO surface, and gating it would cost far more than the data it
    would collect. Its contract is deliberately frozen: Phase 4 only *added*
    fields (``sufficient``, ``provenance``, ``official``, ``room``). Nothing was
    removed or renamed.
    """
    if lodged_on > date.today():
        raise HTTPException(
            status_code=422, detail="Lodgement date cannot be in the future."
        )
    result = await CommunityService.wait_check(
        db, subclass_slug=subclass, lodged_on=lodged_on
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Unknown visa subclass")
    return WaitCheckOut(**result)


@router.post(
    "/public/wait-check/save",
    response_model=JourneyDetailOut,
    status_code=status.HTTP_201_CREATED,
)
async def save_wait_check(
    payload: SaveWaitCheckRequest,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    """Keep this wait check as your own timeline — **privately**.

    Creates an unpublished journey owned by the caller (their account, or the
    device identity standing in for one). It is absent from the feed, absent
    from every public statistic, and unreadable by anyone else until they
    publish it — which is a different call, ``POST /journeys/{id}/publish``,
    carrying its own explicit consent.
    """
    ip_hash = _client_ip_hash(request)
    identity = await _writer_identity(request, db, account, ip_hash=ip_hash)
    try:
        journey = await CommunityService.save_wait_check(
            db,
            identity=identity,
            ip_hash=ip_hash,
            subclass_slug=payload.subclass_slug,
            lodged_on=payload.lodged_on,
            milestones=payload.milestones or None,
            note=payload.note,
        )
    except JourneyCapError as err:
        raise HTTPException(status_code=409, detail=str(err)) from err
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    except ContentGateError as err:
        # 400, and the message is shown verbatim: this is the one refusal the
        # member can fix themselves, so telling them how is the whole point.
        raise HTTPException(status_code=400, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    await db.commit()
    detail = await CommunityService.get_journey_detail(db, journey, identity=identity)
    return JourneyDetailOut(**detail)


@router.post("/public/journeys/{journey_id}/publish", response_model=JourneyDetailOut)
async def publish_journey(
    journey_id: UUID,
    payload: PublishJourneyRequest,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    """Share a saved timeline with the room — the second, explicit consent.

    Separate endpoint, separate payload, separate decision. Saving privately and
    publishing publicly are not two settings of one action; conflating them is
    how people end up having shared something they thought they were only
    keeping.
    """
    ip_hash = _client_ip_hash(request)
    identity = await _writer_identity(request, db, account, ip_hash=ip_hash)
    journey = await CommunityService.get_owned_journey(db, journey_id, identity)
    if journey is None:
        raise HTTPException(status_code=404, detail="Post not found")
    await CommunityService.publish_journey(db, journey, ip_hash=ip_hash)
    await db.commit()
    detail = await CommunityService.get_journey_detail(db, journey, identity=identity)
    return JourneyDetailOut(**detail)


@router.post(
    "/public/journeys/{journey_id}/milestones", response_model=JourneyDetailOut
)
async def add_journey_milestones(
    journey_id: UUID,
    payload: AddMilestonesRequest,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    """Add later steps to a timeline you own — medical, s56, the grant.

    Works on drafts and on published timelines alike. A published one updates
    its contribution to the public numbers immediately, which is the mechanism
    that stops the community median drifting toward whatever people reported on
    the day they signed up.
    """
    ip_hash = _client_ip_hash(request)
    identity = await _writer_identity(request, db, account, ip_hash=ip_hash)
    journey = await CommunityService.get_owned_journey(db, journey_id, identity)
    if journey is None:
        raise HTTPException(status_code=404, detail="Post not found")
    try:
        await CommunityService.append_milestones(
            db,
            journey,
            payload.milestones,
            outcome=payload.outcome,
            ip_hash=ip_hash,
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    await db.commit()
    detail = await CommunityService.get_journey_detail(db, journey, identity=identity)
    return JourneyDetailOut(**detail)


@router.post(
    "/timelines",
    response_model=TimelineOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_timeline(
    payload: SubmitTimelineRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        timeline = await CommunityService.submit_timeline(
            db, payload, ip_hash=_client_ip_hash(request)
        )
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    except ContentGateError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err
    await db.commit()
    await db.refresh(timeline)
    return _timeline_out(timeline)


# --- Community feed v2: anonymous identity ----------------------------------


@router.post("/public/identity", response_model=IdentityOut)
async def bootstrap_identity(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
):
    """Issue or return this device's anonymous handle + colour + device token."""
    identity = await CommunityService.get_or_create_identity(
        db, token=_device_token(request), ip_hash=_client_ip_hash(request)
    )
    await db.commit()
    # Durable, XSS-safe copy of the device token. Safari's ITP evicts
    # script-writable storage after seven days idle; a server-set cookie is
    # exempt, which matters for people who check back once a month.
    set_device_cookie(response, identity.device_token)
    return IdentityOut(**CommunityService.identity_out(identity, include_token=True))


@router.post("/public/identity/reroll", response_model=IdentityOut)
async def reroll_identity(
    request: Request,
    db: AsyncSession = Depends(get_db),
    account: Optional[AnonIdentity] = Depends(optional_community_account),
):
    """Generate a new handle (allowed only before the first timeline is shared).

    Resolves the session before the device token, exactly like every other write
    surface (:func:`_writer_identity`). That precedence is load-bearing *because*
    of the account/device split: a signed-in member's browser now carries a
    freshly minted anonymous row alongside their session, so a device-only
    lookup would quietly reroll that throwaway row and report success — while
    the member's real handle, the one they log in with, stayed put. Going
    through the account instead lets ``reroll_identity`` refuse, which is the
    guarantee the signup dialog makes: your handle locks when you join.
    """
    identity = account or await CommunityService.get_or_create_identity(
        db, token=_device_token(request), ip_hash=_client_ip_hash(request)
    )
    try:
        identity = await CommunityService.reroll_identity(db, identity)
    except ValueError as err:
        raise HTTPException(status_code=409, detail=str(err)) from err
    await db.commit()
    return IdentityOut(**CommunityService.identity_out(identity, include_token=True))


# --- Community accounts: signup / login / recovery --------------------------
#
# All public (no X-API-Key) — they must stay under /community/public/ for the
# middleware to exempt them (middleware/api_key_auth.py PUBLIC_PREFIXES).


def _session_out(account: AnonIdentity) -> CommunitySessionOut:
    """A session, and nothing else.

    Deliberately does not touch the device cookie. It used to rebind the browser
    to ``account.device_token`` on every issue — signup, login and password
    reset alike — which is what made a second browser converge onto the first
    one's identity and made a signed-out visitor keep writing as the member who
    last used the machine. An account is now addressed by this token only.
    """
    token, expires_at = issue_community_session_jwt(account)
    return CommunitySessionOut(
        token=token,
        expires_at=expires_at,
        account=CommunityAccountOut(**CommunityAccountService.account_out(account)),
    )


@router.post(
    "/public/auth/signup",
    response_model=CommunitySessionOut,
    status_code=status.HTTP_201_CREATED,
)
async def community_signup(
    payload: CommunitySignupRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Turn this browser's identity into an account.

    Never show an empty signup form ahead of this call: the member does the
    thing first — runs a wait check, writes a timeline — and signs up after,
    which is why this resolves the *existing* browser identity rather than
    creating a fresh one. If that identity is unclaimed it is adopted and the
    handle and prior posts carry over untouched; if it already belongs to
    somebody else, a new account is minted beside it. Signing up on a shared
    computer is a normal thing to do, not a 409.
    """
    identity = await CommunityService.get_or_create_identity(
        db, token=_device_token(request), ip_hash=_client_ip_hash(request)
    )
    try:
        account = await CommunityAccountService.signup(
            db,
            identity=identity,
            password=payload.password,
            email=payload.email,
        )
    except AccountError as err:
        raise HTTPException(status_code=err.status_code, detail=str(err)) from err
    await db.commit()
    await db.refresh(account)
    return _session_out(account)


@router.post("/public/auth/login", response_model=CommunitySessionOut)
async def community_login(
    payload: CommunityLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Handle + password.

    Touches nothing on the browser: not the device cookie, not the device
    token. Logging in from a second device is the whole point, and rebinding
    that device to the account's token — which is what this used to do — merged
    the two browsers into one identity and left the second one writing as the
    account long after it signed out.
    """
    try:
        account = await CommunityAccountService.login(
            db, handle=payload.handle, password=payload.password
        )
    except AccountError as err:
        await db.commit()  # persist the failed-attempt counter
        raise HTTPException(status_code=err.status_code, detail=str(err)) from err
    await db.commit()
    await db.refresh(account)
    return _session_out(account)


@router.post("/public/auth/logout", response_model=IdentityOut)
async def community_logout(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
):
    """Sign out, and hand this browser a brand-new anonymous identity.

    The session JWT is stateless, so signing out is really about the *browser*:
    the ``ip_device`` cookie is HttpOnly and no client code can clear it, which
    is why this endpoint has to exist at all. Without it a signed-out visitor
    kept resolving to whatever identity the cookie named.

    It deliberately ignores the incoming device token and mints a fresh row
    rather than clearing the cookie and letting the client re-bootstrap: the
    server then decides who this browser is, so a client that fails to clear its
    localStorage copy still ends up somewhere new instead of back where it was.
    """
    identity = await CommunityService.get_or_create_identity(
        db, token=None, ip_hash=_client_ip_hash(request)
    )
    await db.commit()
    set_device_cookie(response, identity.device_token)
    return IdentityOut(**CommunityService.identity_out(identity, include_token=True))


@router.get("/public/auth/me", response_model=CommunityAccountOut)
async def community_me(account: AnonIdentity = Depends(require_community_account)):
    return CommunityAccountOut(**CommunityAccountService.account_out(account))


@router.post("/public/auth/recover", response_model=CommunityRecoverAcceptedOut)
async def community_recover(
    payload: CommunityRecoverRequest,
    db: AsyncSession = Depends(get_db),
):
    """Start password recovery. Only works when an email was supplied at signup.

    Responds identically whether or not the address is known — a differing
    response would let anyone test which emails hold accounts, which for this
    audience is a genuine safety problem, not a theoretical one.

    When several accounts claim the same unverified address, every one of them
    gets its own link. Pending addresses are non-unique by design (that is what
    closes the pre-hijacking hole), so the alternative — refusing to guess —
    left all of those members permanently locked out. Each mail names the handle
    it belongs to, and only the person holding the inbox ever sees any of them.
    """
    grants = await CommunityAccountService.begin_recovery(db, email=payload.email)
    await db.commit()
    for account, token in grants:
        # Send to the address actually on the account, preferring the verified
        # one. Never echo back what the caller typed — that would forward a
        # recovery link to whatever a stranger asked us to.
        destination = account.email_verified or account.email_pending
        try:
            await send_recovery_email(
                to=destination, handle=account.handle, token=token
            )
        except Exception:  # never leak send failures back to the caller
            logger.exception("Community recovery email failed to send")
    return CommunityRecoverAcceptedOut(
        detail="If that email has an account, a recovery link is on its way."
    )


@router.post("/public/auth/reset", response_model=CommunitySessionOut)
async def community_reset_password(
    payload: CommunityResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Consume a recovery token and set a new password."""
    try:
        account = await CommunityAccountService.complete_recovery(
            db, token=payload.token, new_password=payload.password
        )
    except AccountError as err:
        await db.commit()
        raise HTTPException(status_code=err.status_code, detail=str(err)) from err
    await db.commit()
    await db.refresh(account)
    return _session_out(account)


# --- Community feed v2: journeys (reads) ------------------------------------


@router.get("/public/feed-summary", response_model=FeedSummaryOut)
async def get_feed_summary(db: AsyncSession = Depends(get_db)):
    return FeedSummaryOut(**await CommunityService.feed_summary(db))


@router.get("/public/journeys", response_model=list[JourneyOut])
async def list_journeys(
    request: Request,
    type: Optional[str] = Query(None, pattern="^(timeline|question)$"),
    category: Optional[str] = Query(None),
    subclass: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(
        None, alias="status", pattern="^(waiting|granted)$"
    ),
    sort: str = Query("new", pattern="^(new|top|trending)$"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    identity = await _viewer_identity(request, db, account)
    journeys = await CommunityService.list_journeys(
        db,
        post_type=type,
        category=category,
        subclass=subclass,
        status_filter=status_filter,
        sort=sort,
        limit=limit,
        offset=offset,
        viewer=identity,
    )
    outs = await CommunityService.build_journey_outs(db, journeys, identity=identity)
    return [JourneyOut(**o) for o in outs]


@router.get("/public/journeys/{journey_id}", response_model=JourneyDetailOut)
async def get_journey_detail(
    journey_id: UUID,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    identity = await _viewer_identity(request, db, account)
    # Viewer first: a draft is readable by its owner and by nobody else, and
    # "nobody else" must include "cannot tell it exists" — hence the same 404.
    journey = await CommunityService.get_journey(db, journey_id, viewer=identity)
    if journey is None:
        raise HTTPException(status_code=404, detail="Post not found")
    detail = await CommunityService.get_journey_detail(db, journey, identity=identity)
    return JourneyDetailOut(**detail)


# --- Community feed v2: journeys (writes, device-token resolved) ------------


@router.post(
    "/journeys", response_model=JourneyDetailOut, status_code=status.HTTP_201_CREATED
)
async def create_journey(
    payload: CreateJourneyRequest,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    ip_hash = _client_ip_hash(request)
    identity = await _writer_identity(request, db, account, ip_hash=ip_hash)
    try:
        journey = await CommunityService.create_journey(
            db, payload, identity=identity, ip_hash=ip_hash
        )
    except JourneyCapError as err:
        # 409 → frontend shows the "sign in to do more" gate.
        raise HTTPException(status_code=409, detail=str(err)) from err
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    except ContentGateError as err:
        # 400, and the message is shown verbatim: this is the one refusal the
        # member can fix themselves, so telling them how is the whole point.
        raise HTTPException(status_code=400, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    await db.commit()
    detail = await CommunityService.get_journey_detail(db, journey, identity=identity)
    return JourneyDetailOut(**detail)


@router.post("/journeys/{journey_id}/upvote", response_model=VoteResultOut)
async def upvote_journey(
    journey_id: UUID,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    identity = await _writer_identity(
        request, db, account, ip_hash=_client_ip_hash(request)
    )
    result = await CommunityService.toggle_vote(
        db, target_type="journey", target_id=journey_id, identity=identity
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Post not found")
    await db.commit()
    return VoteResultOut(**result)


@router.post(
    "/journeys/{journey_id}/comments",
    response_model=JourneyCommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_journey_comment(
    journey_id: UUID,
    payload: CreateJourneyCommentRequest,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    ip_hash = _client_ip_hash(request)
    identity = await _writer_identity(request, db, account, ip_hash=ip_hash)
    try:
        comment = await CommunityService.create_journey_comment(
            db, journey_id, payload, identity=identity, ip_hash=ip_hash
        )
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    except ContentGateError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err
    await db.commit()
    # After the commit, deliberately: an email must never describe a reply that
    # then failed to save. Best-effort and batched — no address, no Resend key,
    # or a second reply on the same thread today all end in "the inbox has it",
    # which is why the inbox is the primary channel and this is the extra.
    await notifications.deliver_reply_emails(db, comment_id=comment.id)
    return JourneyCommentOut(
        id=comment.id,
        journey_id=comment.journey_id,
        parent_comment_id=comment.parent_comment_id,
        handle=comment.handle,
        color=comment.color,
        initials=initials_of(comment.handle),
        body=comment.body,
        upvotes=comment.upvotes or 0,
        created_at=comment.created_at,
    )


@router.post("/comments/{comment_id}/upvote", response_model=VoteResultOut)
async def upvote_journey_comment(
    comment_id: UUID,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    identity = await _writer_identity(
        request, db, account, ip_hash=_client_ip_hash(request)
    )
    result = await CommunityService.toggle_vote(
        db, target_type="comment", target_id=comment_id, identity=identity
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    await db.commit()
    return VoteResultOut(**result)


@router.post(
    "/journeys/{journey_id}/report",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
)
async def report_journey(
    journey_id: UUID,
    payload: ReportRequest,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    # Reporting stays open to signed-out readers — the person best placed to
    # notice a tout is often someone who has not signed up yet — but resolving
    # who reported lets the report be weighted by their standing.
    try:
        report = await CommunityService.report_target(
            db,
            target_type="journey",
            target_id=journey_id,
            payload=payload,
            ip_hash=_client_ip_hash(request),
            reporter=await _viewer_identity(request, db, account),
        )
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    await db.commit()
    return ReportOut.model_validate(report)


# --- Me: inbox & profile ("You") --------------------------------------------
#
# These sit under /community/me/ rather than /community/public/, so they carry
# the X-API-Key like every other non-public route AND require a community
# session. There is nothing public about someone's notifications.


@router.get("/me/inbox", response_model=InboxOut)
async def get_my_inbox(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    account: AnonIdentity = Depends(require_community_account),
    db: AsyncSession = Depends(get_db),
):
    """Replies to your posts and your comments, newest first, plus the badge."""
    inbox = await notifications.list_inbox(
        db, account=account, limit=limit, offset=offset, unread_only=unread_only
    )
    return InboxOut(
        items=[NotificationOut(**i) for i in inbox["items"]],
        unread_count=inbox["unread_count"],
    )


@router.post("/me/inbox/read", response_model=MarkReadOut)
async def mark_inbox_read(
    payload: MarkReadRequest,
    account: AnonIdentity = Depends(require_community_account),
    db: AsyncSession = Depends(get_db),
):
    """Mark notifications read. Idempotent: re-marking returns ``marked: 0``
    rather than an error, because a client retrying a request it already made
    is not a mistake worth surfacing."""
    marked = await notifications.mark_read(db, account=account, ids=payload.ids)
    await db.commit()
    return MarkReadOut(
        marked=marked,
        unread_count=await notifications.unread_count(db, account=account),
    )


@router.get("/me/posts", response_model=list[JourneyOut])
async def get_my_posts(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    account: AnonIdentity = Depends(require_community_account),
    db: AsyncSession = Depends(get_db),
):
    """The Posts tab of the "You" profile."""
    journeys = await notifications.list_my_posts(
        db, account=account, limit=limit, offset=offset
    )
    outs = await CommunityService.build_journey_outs(db, journeys, identity=account)
    return [JourneyOut(**o) for o in outs]


@router.get("/me/comments", response_model=list[MyCommentOut])
async def get_my_comments(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    account: AnonIdentity = Depends(require_community_account),
    db: AsyncSession = Depends(get_db),
):
    """The Comments tab of the "You" profile."""
    rows = await notifications.list_my_comments(
        db, account=account, limit=limit, offset=offset
    )
    return [MyCommentOut(**r) for r in rows]


@router.get("/me/allowance", response_model=AllowanceOut)
async def get_my_allowance(
    request: Request,
    account: AnonIdentity = Depends(require_community_account),
    db: AsyncSession = Depends(get_db),
):
    """What this member can still write today, without spending any of it.

    The composer reads this so it can say "you've written a lot today" *before*
    the member types a reply, rather than throwing a 429 at them after. p2 built
    the read-only service function for exactly this and left the route to p5.
    """
    allowance = await remaining_allowance(
        db, ip_hash=_client_ip_hash(request), identity=account
    )
    return AllowanceOut(
        tier=allowance["tier"],
        tier_name=allowance["tier_name"],
        actions={
            family: AllowanceActionOut(**vals)
            for family, vals in allowance["actions"].items()
        },
    )


@router.get("/me/notification-preferences", response_model=NotificationPreferencesOut)
async def get_notification_preferences(
    account: AnonIdentity = Depends(require_community_account),
):
    return NotificationPreferencesOut(
        email_replies=bool(account.notify_replies_email),
        email_available=bool(account.email_verified or account.email_pending),
    )


@router.post("/me/notification-preferences", response_model=NotificationPreferencesOut)
async def set_notification_preferences(
    payload: NotificationPreferencesRequest,
    account: AnonIdentity = Depends(require_community_account),
    db: AsyncSession = Depends(get_db),
):
    """Turn reply emails off (or back on). The inbox has no off-switch — it is
    the primary channel, and losing replies silently is not a preference."""
    account.notify_replies_email = payload.email_replies
    await db.commit()
    return NotificationPreferencesOut(
        email_replies=bool(account.notify_replies_email),
        email_available=bool(account.email_verified or account.email_pending),
    )


# --- Public: spaces ---------------------------------------------------------


@router.get("/public/spaces", response_model=list[CommunitySpaceOut])
async def list_community_spaces(db: AsyncSession = Depends(get_db)):
    return await CommunityService.list_spaces(db)


@router.get("/public/spaces/{slug}", response_model=CommunitySpaceOut)
async def get_community_space(slug: str, db: AsyncSession = Depends(get_db)):
    space = await CommunityService.get_space_by_slug(db, slug)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


# --- Live-feed reports: journey comments ------------------------------------


@router.post(
    "/comments/{comment_id}/report",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
)
async def report_comment(
    comment_id: UUID,
    payload: ReportRequest,
    request: Request,
    account: Optional[AnonIdentity] = Depends(optional_community_account),
    db: AsyncSession = Depends(get_db),
):
    """Report a live-feed journey comment. target_type ``journey_comment`` is
    what lets a moderator's Hide/Remove actually act on the comment row."""
    try:
        report = await CommunityService.report_target(
            db,
            target_type="journey_comment",
            target_id=comment_id,
            payload=payload,
            ip_hash=_client_ip_hash(request),
            reporter=await _viewer_identity(request, db, account),
        )
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    await db.commit()
    return ReportOut.model_validate(report)


# --- Admin (owner/admin JWT required — NOT the shipped public key) ----------


@router.get(
    "/admin/reports",
    response_model=list[ReportOut],
    dependencies=[Depends(get_current_owner_or_admin)],
)
async def list_open_reports(db: AsyncSession = Depends(get_db)):
    rows = await CommunityService.list_open_reports_enriched(db)
    return [ReportOut(**r) for r in rows]


@router.post("/admin/reports/{report_id}/action", response_model=ReportOut)
async def act_on_report(
    report_id: UUID,
    payload: ModerationActionRequest,
    ctx=Depends(get_current_owner_or_admin),
    db: AsyncSession = Depends(get_db),
):
    report = await CommunityService.resolve_report(
        db,
        report_id,
        action=payload.action,
        note=payload.note,
        resolver_user_id=ctx.user_id,
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.commit()
    return ReportOut.model_validate(report)


@router.post(
    "/admin/spaces",
    response_model=CommunitySpaceOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_owner_or_admin)],
)
async def create_admin_space(
    payload: CreateCommunitySpaceRequest,
    db: AsyncSession = Depends(get_db),
):
    space = await CommunityService.create_space(db, payload)
    await db.commit()
    return space
