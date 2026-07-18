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
from app.agents.immigration.community.identity import initials_of
from app.agents.immigration.community.models import AnonIdentity, CommunityTimeline
from app.agents.immigration.community.schemas import (
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
    JourneyCommentOut,
    JourneyDetailOut,
    JourneyOut,
    ModerationActionRequest,
    ProcessingStatOut,
    ReportOut,
    ReportRequest,
    SubmitTimelineRequest,
    TimelineOut,
    VisaSubclassOut,
    VoteResultOut,
    WaitCheckOut,
)
from app.agents.immigration.community.service import (
    CommunityRateLimitError,
    CommunityService,
    JourneyCapError,
    hash_ip,
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


@router.get("/public/processing", response_model=list[ProcessingStatOut])
async def get_processing_board(db: AsyncSession = Depends(get_db)):
    return await CommunityService.processing_board(db)


@router.get("/public/wait-check", response_model=WaitCheckOut)
async def wait_check(
    subclass: str = Query(..., min_length=1),
    lodged_on: date = Query(...),
    db: AsyncSession = Depends(get_db),
):
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
async def reroll_identity(request: Request, db: AsyncSession = Depends(get_db)):
    """Generate a new handle (allowed only before the first timeline is shared)."""
    identity = await CommunityService.get_or_create_identity(
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


def _session_out(
    account: AnonIdentity, response: Response, *, include_device_token: bool = True
) -> CommunitySessionOut:
    token, expires_at = issue_community_session_jwt(account)
    # Refresh the durable device cookie on every session issue, so a returning
    # member's device stays bound even if their localStorage was cleared.
    set_device_cookie(response, account.device_token)
    return CommunitySessionOut(
        token=token,
        expires_at=expires_at,
        account=CommunityAccountOut(**CommunityAccountService.account_out(account)),
        device_token=account.device_token if include_device_token else None,
    )


@router.post(
    "/public/auth/signup",
    response_model=CommunitySessionOut,
    status_code=status.HTTP_201_CREATED,
)
async def community_signup(
    payload: CommunitySignupRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Claim this device's identity as an account by setting a password.

    Never show an empty signup form ahead of this call: the member does the
    thing first — runs a wait check, writes a timeline — and claims it after,
    which is why signup resolves the *existing* device identity rather than
    creating a fresh one. The handle and any prior posts carry over untouched.
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
            accepted_no_recovery=payload.accepted_no_recovery,
        )
    except AccountError as err:
        raise HTTPException(status_code=err.status_code, detail=str(err)) from err
    await db.commit()
    await db.refresh(account)
    return _session_out(account, response)


@router.post("/public/auth/login", response_model=CommunitySessionOut)
async def community_login(
    payload: CommunityLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Handle + password. Deliberately ignores the device token — logging in
    from a second device is the whole point, and it re-binds the cookie to the
    account's original device token so both devices resolve the same identity."""
    try:
        account = await CommunityAccountService.login(
            db, handle=payload.handle, password=payload.password
        )
    except AccountError as err:
        await db.commit()  # persist the failed-attempt counter
        raise HTTPException(status_code=err.status_code, detail=str(err)) from err
    await db.commit()
    await db.refresh(account)
    return _session_out(account, response)


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
    """
    token = await CommunityAccountService.begin_recovery(db, email=payload.email)
    await db.commit()
    if token:
        account = await CommunityAccountService.get_by_email(db, payload.email)
        if account is not None:
            try:
                await send_recovery_email(
                    to=account.email, handle=account.handle, token=token
                )
            except Exception:  # never leak send failures back to the caller
                logger.exception("Community recovery email failed to send")
    return CommunityRecoverAcceptedOut(
        detail="If that email has an account, a recovery link is on its way."
    )


@router.post("/public/auth/reset", response_model=CommunitySessionOut)
async def community_reset_password(
    payload: CommunityResetPasswordRequest,
    response: Response,
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
    return _session_out(account, response)


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
    journey = await CommunityService.get_journey(db, journey_id)
    if journey is None:
        raise HTTPException(status_code=404, detail="Post not found")
    identity = await _viewer_identity(request, db, account)
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
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err
    await db.commit()
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
    db: AsyncSession = Depends(get_db),
):
    try:
        report = await CommunityService.report_target(
            db,
            target_type="journey",
            target_id=journey_id,
            payload=payload,
            ip_hash=_client_ip_hash(request),
        )
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    await db.commit()
    return ReportOut.model_validate(report)


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
