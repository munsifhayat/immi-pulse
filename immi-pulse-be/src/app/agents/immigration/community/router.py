"""
Community API.

Public reads:  /community/public/*     (no X-API-Key)
Public writes: /community/threads ...  (no X-API-Key, IP-hash rate limited)
Admin:         /community/admin/*      (X-API-Key — add admin role later)
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.community.models import CommunitySpace, CommunityThread
from app.agents.immigration.community.schemas import (
    CommentOut,
    CommunitySpaceOut,
    CommunityStatsOut,
    CreateCommentRequest,
    CreateCommunitySpaceRequest,
    CreateThreadRequest,
    ModerationActionRequest,
    ReportOut,
    ReportRequest,
    ThreadOut,
    ThreadWithCommentsOut,
)
from app.agents.immigration.community.service import (
    CommunityRateLimitError,
    CommunityService,
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


async def _thread_out(db: AsyncSession, thread: CommunityThread) -> ThreadOut:
    space = await db.get(CommunitySpace, thread.space_id)
    payload = ThreadOut.model_validate(thread).model_dump()
    payload["space_slug"] = space.slug if space else None
    payload["space_name"] = space.name if space else None
    return ThreadOut(**payload)


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
