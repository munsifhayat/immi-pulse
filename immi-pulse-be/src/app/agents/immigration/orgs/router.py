"""Org + Seat router."""

import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.auth.schemas import OrgOut
from app.agents.immigration.orgs import service as org_service
from app.agents.immigration.orgs.schemas import (
    AcceptInviteRequest,
    BillingSummary,
    InviteCreate,
    InviteOut,
    OrgUpdate,
    PlanOut,
    RedeemPromoRequest,
    RedeemPromoResponse,
    SeatOut,
    SelectPlanRequest,
)
from app.core.jwt_auth import (
    CurrentContext,
    get_current_context,
    get_current_owner_or_admin,
)
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/org", tags=["Organization"])


@router.patch("", response_model=OrgOut)
async def update_org(
    payload: OrgUpdate,
    ctx: CurrentContext = Depends(get_current_owner_or_admin),
    db: AsyncSession = Depends(get_db),
):
    org = await org_service.update_org(db, ctx.org_id, payload)
    return org


@router.get("/seats", response_model=list[SeatOut])
async def list_seats(
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    rows = await org_service.list_seats(db, ctx.org_id)
    return [SeatOut(**r) for r in rows]


@router.post("/seats/invite", response_model=InviteOut, status_code=status.HTTP_201_CREATED)
async def invite_seat(
    payload: InviteCreate,
    ctx: CurrentContext = Depends(get_current_owner_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await org_service.create_invite(db, ctx.org_id, ctx.seat_id, payload.email, payload.role)


@router.delete("/seats/{seat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_seat(
    seat_id: str,
    ctx: CurrentContext = Depends(get_current_owner_or_admin),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    await org_service.revoke_seat(db, ctx.org_id, UUID(seat_id), ctx.seat_id)
    return None


@router.post("/seats/{seat_id}/resend", response_model=InviteOut)
async def resend_seat_invite(
    seat_id: str,
    ctx: CurrentContext = Depends(get_current_owner_or_admin),
    db: AsyncSession = Depends(get_db),
):
    from uuid import UUID
    return await org_service.resend_invite(db, ctx.org_id, UUID(seat_id))


@router.get("/billing", response_model=BillingSummary)
async def get_billing(
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await org_service.get_billing_summary(db, ctx.org_id)


@router.post("/billing/select-plan", response_model=BillingSummary)
async def select_plan(
    payload: SelectPlanRequest,
    ctx: CurrentContext = Depends(get_current_owner_or_admin),
    db: AsyncSession = Depends(get_db),
):
    return await org_service.select_plan(db, ctx.org_id, payload.tier)


@router.post("/billing/redeem-promo", response_model=RedeemPromoResponse)
async def redeem_promo(
    payload: RedeemPromoRequest,
    ctx: CurrentContext = Depends(get_current_owner_or_admin),
    db: AsyncSession = Depends(get_db),
):
    """Apply a pilot/promo code post-signup. Idempotent for the same pilot."""
    return await org_service.redeem_promo(db, ctx.org_id, payload.code)


# Plans catalog — readable by anyone authenticated (it's also exposed publicly via pricing page).
@router.get("/plans", response_model=list[PlanOut])
async def list_plans(
    ctx: CurrentContext = Depends(get_current_context),
):
    return await org_service.list_plans()


# Public-ish endpoint — no auth required to redeem an invite token
public_router = APIRouter(prefix="/public/invites", tags=["Organization"])


@public_router.post("/accept")
async def accept_invite(payload: AcceptInviteRequest, db: AsyncSession = Depends(get_db)):
    from app.core.jwt_auth import issue_token
    result = await org_service.accept_invite(
        db, payload.token, payload.password, payload.first_name, payload.last_name
    )
    token = issue_token(result["user"].id, result["seat"].id, result["org"].id)
    return {
        "token": token,
        "user": {
            "id": str(result["user"].id),
            "email": result["user"].email,
            "first_name": result["user"].first_name,
            "last_name": result["user"].last_name,
        },
        "org": {"id": str(result["org"].id), "name": result["org"].name},
        "seat": {"id": str(result["seat"].id), "role": result["seat"].role},
    }
