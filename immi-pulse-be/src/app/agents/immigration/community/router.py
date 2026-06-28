"""
Community API.

Public reads:  /community/public/*     (no X-API-Key)
Public writes: /community/threads ...  (no X-API-Key, IP-hash rate limited)
Admin:         /community/admin/*      (X-API-Key — add admin role later)
"""

import logging
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community.identity import initials_of
from app.agents.immigration.community.models import (
    CommunitySpace,
    CommunityThread,
    CommunityTimeline,
)
from app.agents.immigration.community.schemas import (
    CommentOut,
    CommunitySpaceOut,
    CommunityStatsOut,
    CreateCommentRequest,
    CreateCommunitySpaceRequest,
    CreateJourneyCommentRequest,
    CreateJourneyRequest,
    CreateThreadRequest,
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
    ThreadOut,
    ThreadWithCommentsOut,
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
    """The per-device anonymous identity token (set client-side at bootstrap)."""
    token = request.headers.get("x-device-token")
    return token.strip() if token and token.strip() else None


async def _thread_out(db: AsyncSession, thread: CommunityThread) -> ThreadOut:
    space = await db.get(CommunitySpace, thread.space_id)
    payload = ThreadOut.model_validate(thread).model_dump()
    payload["space_slug"] = space.slug if space else None
    payload["space_name"] = space.name if space else None
    return ThreadOut(**payload)


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


# --- Public: recent threads (cross-space, for homepage) --------------------


@router.get("/public/threads/recent", response_model=list[ThreadOut])
async def list_recent_threads(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    threads = await CommunityService.list_recent_threads(db, limit=limit)
    return [await _thread_out(db, t) for t in threads]


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
async def bootstrap_identity(request: Request, db: AsyncSession = Depends(get_db)):
    """Issue or return this device's anonymous handle + colour + device token."""
    identity = await CommunityService.get_or_create_identity(
        db, token=_device_token(request), ip_hash=_client_ip_hash(request)
    )
    await db.commit()
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
    db: AsyncSession = Depends(get_db),
):
    identity = await CommunityService.get_identity_by_token(db, _device_token(request))
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
    journey_id: UUID, request: Request, db: AsyncSession = Depends(get_db)
):
    journey = await CommunityService.get_journey(db, journey_id)
    if journey is None:
        raise HTTPException(status_code=404, detail="Post not found")
    identity = await CommunityService.get_identity_by_token(db, _device_token(request))
    detail = await CommunityService.get_journey_detail(db, journey, identity=identity)
    return JourneyDetailOut(**detail)


# --- Community feed v2: journeys (writes, device-token resolved) ------------


@router.post(
    "/journeys", response_model=JourneyDetailOut, status_code=status.HTTP_201_CREATED
)
async def create_journey(
    payload: CreateJourneyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip_hash = _client_ip_hash(request)
    identity = await CommunityService.get_or_create_identity(
        db, token=_device_token(request), ip_hash=ip_hash
    )
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
    journey_id: UUID, request: Request, db: AsyncSession = Depends(get_db)
):
    identity = await CommunityService.get_or_create_identity(
        db, token=_device_token(request), ip_hash=_client_ip_hash(request)
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
    db: AsyncSession = Depends(get_db),
):
    ip_hash = _client_ip_hash(request)
    identity = await CommunityService.get_or_create_identity(
        db, token=_device_token(request), ip_hash=ip_hash
    )
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
    comment_id: UUID, request: Request, db: AsyncSession = Depends(get_db)
):
    identity = await CommunityService.get_or_create_identity(
        db, token=_device_token(request), ip_hash=_client_ip_hash(request)
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


@router.get("/public/spaces/{slug}/threads", response_model=list[ThreadOut])
async def list_space_threads(
    slug: str,
    sort: str = Query("new", pattern="^(new|top|trending)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    space = await CommunityService.get_space_by_slug(db, slug)
    if space is None:
        raise HTTPException(status_code=404, detail="Space not found")
    threads = await CommunityService.list_threads(
        db, space_id=space.id, sort=sort, limit=limit, offset=offset
    )
    return [await _thread_out(db, t) for t in threads]


@router.get("/public/threads/{thread_id}", response_model=ThreadWithCommentsOut)
async def get_community_thread(
    thread_id: UUID, db: AsyncSession = Depends(get_db)
):
    thread = await CommunityService.get_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    await CommunityService.increment_view_count(db, thread_id)
    await db.commit()
    comments = await CommunityService.list_comments(db, thread_id)
    base = await _thread_out(db, thread)
    return ThreadWithCommentsOut(
        **base.model_dump(),
        comments=[CommentOut.model_validate(c) for c in comments],
    )


# --- Public writes (token-free, IP-hash rate limited) -----------------------


@router.post(
    "/threads", response_model=ThreadOut, status_code=status.HTTP_201_CREATED
)
async def create_community_thread(
    payload: CreateThreadRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        thread = await CommunityService.create_thread(
            db, payload, ip_hash=_client_ip_hash(request)
        )
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err
    await db.commit()
    await db.refresh(thread)
    return await _thread_out(db, thread)


@router.post("/threads/{thread_id}/upvote", response_model=ThreadOut)
async def upvote_community_thread(
    thread_id: UUID, db: AsyncSession = Depends(get_db)
):
    thread = await CommunityService.upvote_thread(db, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    await db.commit()
    return await _thread_out(db, thread)


@router.post(
    "/threads/{thread_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_community_comment(
    thread_id: UUID,
    payload: CreateCommentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        comment = await CommunityService.create_comment(
            db, thread_id, payload, ip_hash=_client_ip_hash(request)
        )
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err)) from err
    await db.commit()
    return CommentOut.model_validate(comment)


@router.post("/comments/{comment_id}/upvote", response_model=CommentOut)
async def upvote_community_comment(
    comment_id: UUID, db: AsyncSession = Depends(get_db)
):
    comment = await CommunityService.upvote_comment(db, comment_id)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    await db.commit()
    return CommentOut.model_validate(comment)


@router.post(
    "/threads/{thread_id}/report",
    response_model=ReportOut,
    status_code=status.HTTP_201_CREATED,
)
async def report_thread(
    thread_id: UUID,
    payload: ReportRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    try:
        report = await CommunityService.report_target(
            db,
            target_type="thread",
            target_id=thread_id,
            payload=payload,
            ip_hash=_client_ip_hash(request),
        )
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    await db.commit()
    return ReportOut.model_validate(report)


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
    try:
        report = await CommunityService.report_target(
            db,
            target_type="comment",
            target_id=comment_id,
            payload=payload,
            ip_hash=_client_ip_hash(request),
        )
    except CommunityRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    await db.commit()
    return ReportOut.model_validate(report)


# --- Admin -----------------------------------------------------------------


@router.get("/admin/reports", response_model=list[ReportOut])
async def list_open_reports(db: AsyncSession = Depends(get_db)):
    return await CommunityService.list_open_reports(db)


@router.post(
    "/admin/reports/{report_id}/action", response_model=ReportOut
)
async def act_on_report(
    report_id: UUID,
    payload: ModerationActionRequest,
    db: AsyncSession = Depends(get_db),
):
    report = await CommunityService.resolve_report(
        db, report_id, action=payload.action, note=payload.note
    )
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.commit()
    return ReportOut.model_validate(report)


@router.post(
    "/admin/spaces",
    response_model=CommunitySpaceOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin_space(
    payload: CreateCommunitySpaceRequest,
    db: AsyncSession = Depends(get_db),
):
    space = await CommunityService.create_space(db, payload)
    await db.commit()
    return space


@router.post("/admin/threads/{thread_id}/pin", response_model=ThreadOut)
async def pin_thread(
    thread_id: UUID,
    pinned: bool = True,
    db: AsyncSession = Depends(get_db),
):
    thread = await db.get(CommunityThread, thread_id)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread.is_pinned = pinned
    await db.commit()
    return await _thread_out(db, thread)
