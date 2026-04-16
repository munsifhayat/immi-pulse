"""
Agents Marketplace API.

Public endpoints (no X-API-Key): /marketplace/public/*
Protected endpoints (X-API-Key): /marketplace/agents/* and /marketplace/admin/*
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.marketplace.schemas import (
    AdminAddAgentRequest,
    AgentProfileOut,
    ApplyAgentProfileRequest,
    ApplyAgentProfileResponse,
    ApproveAgentProfileRequest,
    RejectAgentProfileRequest,
    SetTierRequest,
    UpdateAgentProfileRequest,
)
from app.agents.immigration.marketplace.service import AgentProfileService
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


# --- Public: browse the directory ------------------------------------------


@router.get("/public/agents", response_model=list[AgentProfileOut])
async def list_public_agents(
    city: Optional[str] = None,
    state: Optional[str] = None,
    visa_type: Optional[str] = None,
    language: Optional[str] = None,
    tier: Optional[str] = None,
    search: Optional[str] = None,
    sort: str = Query("rating", pattern="^(rating|experience|response_time)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    profiles = await AgentProfileService.list_public(
        db,
        city=city,
        state=state,
        visa_type=visa_type,
        language=language,
        tier=tier,
        search=search,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    return [AgentProfileOut.model_validate(await AgentProfileService.hydrate(db, p)) for p in profiles]


@router.get("/public/agents/{profile_id}", response_model=AgentProfileOut)
async def get_public_agent(profile_id: UUID, db: AsyncSession = Depends(get_db)):
    profile = await AgentProfileService.get_public(db, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Agent profile not found")
    return AgentProfileOut.model_validate(await AgentProfileService.hydrate(db, profile))


# --- Applicant: submit and edit ---------------------------------------------


@router.post(
    "/agents/apply",
    response_model=ApplyAgentProfileResponse,
    status_code=status.HTTP_201_CREATED,
)
async def apply_as_agent(
    payload: ApplyAgentProfileRequest,
    db: AsyncSession = Depends(get_db),
):
    profile = await AgentProfileService.apply(db, payload)
    await db.commit()
    await db.refresh(profile)
    return ApplyAgentProfileResponse(
        profile=AgentProfileOut.model_validate(
            await AgentProfileService.hydrate(db, profile)
        )
    )


@router.patch("/agents/{profile_id}", response_model=AgentProfileOut)
async def update_my_agent_profile(
    profile_id: UUID,
    payload: UpdateAgentProfileRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Edit an agent profile. In MVP this is open to any consultant holding
    an X-API-Key; once end-to-end consultant auth ships we'll scope it to
    the owning TDOP user.
    """
    profile = await AgentProfileService.get_by_id(db, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Agent profile not found")
    await AgentProfileService.update_profile(db, profile, payload)
    await db.commit()
    await db.refresh(profile)
    return AgentProfileOut.model_validate(
        await AgentProfileService.hydrate(db, profile)
    )


# --- Admin: approval queue --------------------------------------------------


@router.get("/admin/pending", response_model=list[AgentProfileOut])
async def list_pending_agent_profiles(db: AsyncSession = Depends(get_db)):
    profiles = await AgentProfileService.list_pending(db)
    return [
        AgentProfileOut.model_validate(await AgentProfileService.hydrate(db, p))
        for p in profiles
    ]


@router.get("/admin/all", response_model=list[AgentProfileOut])
async def list_all_agent_profiles(db: AsyncSession = Depends(get_db)):
    """Admin overview of all profiles regardless of status."""
    profiles = await AgentProfileService.list_all(db)
    return [
        AgentProfileOut.model_validate(await AgentProfileService.hydrate(db, p))
        for p in profiles
    ]


@router.post("/admin/{profile_id}/approve", response_model=AgentProfileOut)
async def approve_agent_profile(
    profile_id: UUID,
    payload: ApproveAgentProfileRequest,
    db: AsyncSession = Depends(get_db),
):
    profile = await AgentProfileService.get_by_id(db, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Agent profile not found")
    await AgentProfileService.approve(
        db, profile, tier=payload.tier, featured=payload.featured
    )
    await db.commit()
    await db.refresh(profile)
    return AgentProfileOut.model_validate(
        await AgentProfileService.hydrate(db, profile)
    )


@router.post("/admin/{profile_id}/reject", response_model=AgentProfileOut)
async def reject_agent_profile(
    profile_id: UUID,
    payload: RejectAgentProfileRequest,
    db: AsyncSession = Depends(get_db),
):
    profile = await AgentProfileService.get_by_id(db, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Agent profile not found")
    await AgentProfileService.reject(db, profile, reason=payload.reason)
    await db.commit()
    await db.refresh(profile)
    return AgentProfileOut.model_validate(
        await AgentProfileService.hydrate(db, profile)
    )


@router.post("/admin/{profile_id}/set-tier", response_model=AgentProfileOut)
async def set_agent_profile_tier(
    profile_id: UUID,
    payload: SetTierRequest,
    db: AsyncSession = Depends(get_db),
):
    profile = await AgentProfileService.get_by_id(db, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Agent profile not found")
    await AgentProfileService.set_tier(db, profile, tier=payload.tier)
    await db.commit()
    await db.refresh(profile)
    return AgentProfileOut.model_validate(
        await AgentProfileService.hydrate(db, profile)
    )


@router.post(
    "/admin/add",
    response_model=AgentProfileOut,
    status_code=status.HTTP_201_CREATED,
)
async def admin_add_agent(
    payload: AdminAddAgentRequest,
    db: AsyncSession = Depends(get_db),
):
    """Admin directly adds a consultant — auto-approved, skips the queue."""
    profile = await AgentProfileService.admin_add(db, payload)
    await db.commit()
    await db.refresh(profile)
    return AgentProfileOut.model_validate(
        await AgentProfileService.hydrate(db, profile)
    )
