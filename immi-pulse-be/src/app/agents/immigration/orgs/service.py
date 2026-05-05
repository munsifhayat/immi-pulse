"""Org and seat services — invite/accept/list/remove."""

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.orgs.models import (
    CreditWallet,
    Organization,
    PilotProgram,
    Seat,
    SeatInvite,
    Subscription,
)
from app.agents.immigration.orgs.plans import (
    PLAN_CATALOG,
    TRIAL_DAYS,
    get_plan,
    price_per_seat,
)
from app.agents.immigration.orgs.schemas import OrgUpdate
from app.agents.immigration.users.models import User
from app.core.config import get_settings
from app.core.jwt_auth import hash_password

logger = logging.getLogger(__name__)


async def update_org(db: AsyncSession, org_id: UUID, payload: OrgUpdate) -> Organization:
    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one_or_none()
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(org, key, value)
    await db.commit()
    await db.refresh(org)
    return org


async def list_seats(db: AsyncSession, org_id: UUID) -> list[dict]:
    rows = (
        await db.execute(
            select(Seat, User)
            .outerjoin(User, User.id == Seat.user_id)
            .where(Seat.org_id == org_id)
            .order_by(Seat.created_at.asc())
        )
    ).all()
    out = []
    for seat, user in rows:
        out.append(
            {
                "id": seat.id,
                "user_id": seat.user_id,
                "invited_email": seat.invited_email,
                "role": seat.role,
                "status": seat.status,
                "omara_number": seat.omara_number,
                "invited_at": seat.invited_at,
                "joined_at": seat.joined_at,
                "user_email": user.email if user else None,
                "user_name": (
                    f"{user.first_name or ''} {user.last_name or ''}".strip()
                    if user
                    else None
                ),
            }
        )
    return out


async def _count_seats_by_role(db: AsyncSession, org_id: UUID) -> dict[str, int]:
    """Return {role: count} across active+invited seats. Disabled seats are excluded."""
    rows = (
        await db.execute(
            select(Seat.role).where(
                Seat.org_id == org_id,
                Seat.status.in_(("active", "invited")),
            )
        )
    ).scalars().all()
    counts: dict[str, int] = {}
    for r in rows:
        counts[r] = counts.get(r, 0) + 1
    return counts


async def get_subscription(db: AsyncSession, org_id: UUID) -> Subscription | None:
    return (
        await db.execute(select(Subscription).where(Subscription.org_id == org_id))
    ).scalar_one_or_none()


async def create_invite(db: AsyncSession, org_id: UUID, seat_id: UUID, email: str, role: str) -> dict:
    email = email.lower().strip()

    # Reject if already a seat in this org
    existing_seat = (
        await db.execute(
            select(Seat).join(User, User.id == Seat.user_id, isouter=True).where(
                Seat.org_id == org_id,
                ((User.email == email) | (Seat.invited_email == email)),
            )
        )
    ).first()
    if existing_seat:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This email is already a seat or pending invite")

    # No seat-cap enforcement: plans gate features, not seat counts.
    # Each consultant/admin/owner adds to the bill at the plan's consultant price;
    # staff seats are free.

    token = secrets.token_urlsafe(32)
    invite = SeatInvite(
        org_id=org_id,
        email=email,
        role=role,
        token=token,
        invited_by_seat_id=seat_id,
        expires_at=datetime.now(timezone.utc) + timedelta(days=14),
    )
    db.add(invite)

    # Also create a placeholder seat row in invited state for visibility on Team page
    seat = Seat(
        org_id=org_id,
        user_id=None,
        invited_email=email,
        role=role,
        status="invited",
        invited_at=datetime.now(timezone.utc),
    )
    db.add(seat)

    # Bump subscription seat_count
    sub = (await db.execute(select(Subscription).where(Subscription.org_id == org_id))).scalar_one_or_none()
    if sub:
        sub.seat_count = (sub.seat_count or 0) + 1

    await db.commit()
    await db.refresh(invite)

    settings = get_settings()
    invite_link = f"{settings.frontend_url}/accept-invite?token={token}"
    return {
        "id": invite.id,
        "email": invite.email,
        "role": invite.role,
        "token": invite.token,
        "expires_at": invite.expires_at,
        "invite_link": invite_link,
    }


async def accept_invite(
    db: AsyncSession,
    token: str,
    password: Optional[str],
    first_name: Optional[str],
    last_name: Optional[str],
) -> dict:
    invite = (
        await db.execute(select(SeatInvite).where(SeatInvite.token == token))
    ).scalar_one_or_none()
    if not invite:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invite not found")
    if invite.accepted_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invite already used")
    if invite.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invite expired")

    user = (await db.execute(select(User).where(User.email == invite.email))).scalar_one_or_none()
    if not user:
        if not password:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "New users must set a password")
        user = User(
            email=invite.email,
            password_hash=hash_password(password),
            email_verified=True,
            first_name=first_name,
            last_name=last_name,
            role="consultant",
            status="active",
        )
        db.add(user)
        await db.flush()

    # Find the placeholder seat (invited_email matches)
    seat = (
        await db.execute(
            select(Seat).where(
                Seat.org_id == invite.org_id,
                Seat.invited_email == invite.email,
                Seat.status == "invited",
            )
        )
    ).scalar_one_or_none()
    if not seat:
        seat = Seat(org_id=invite.org_id, role=invite.role, status="active")
        db.add(seat)
        await db.flush()

    seat.user_id = user.id
    seat.invited_email = None
    seat.status = "active"
    seat.joined_at = datetime.now(timezone.utc)

    invite.accepted_at = datetime.now(timezone.utc)

    org = (await db.execute(select(Organization).where(Organization.id == invite.org_id))).scalar_one_or_none()

    await db.commit()
    await db.refresh(user)
    await db.refresh(seat)
    return {"user": user, "seat": seat, "org": org}


async def list_plans() -> list[dict]:
    """Public plan catalog for the FE plan picker."""
    return [dict(p) for p in PLAN_CATALOG]


async def get_billing_summary(db: AsyncSession, org_id: UUID) -> dict:
    """Plan + seat counts + monthly cost. Drives the Plan & Billing screen.

    Pricing model: total_seats × per_seat_price. Role is permission-only,
    not a billing input.
    """
    sub = await get_subscription(db, org_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")
    plan = get_plan(sub.tier)
    role_counts = await _count_seats_by_role(db, org_id)
    total_seats = sum(role_counts.values())

    seat_price = price_per_seat(sub.tier)
    monthly_total = total_seats * seat_price

    return {
        "tier": sub.tier,
        "status": sub.status,
        "plan_name": plan["name"] if plan else sub.tier,
        "price_label": plan["price_label"] if plan else "",
        "price_per_seat_aud_monthly": seat_price,
        "is_custom": plan["is_custom"] if plan else False,
        "trial_ends_at": sub.trial_ends_at,
        "current_period_end": sub.current_period_end,
        "total_seats": total_seats,
        "role_counts": role_counts,
        "monthly_total_aud": monthly_total,
        "features": plan["features"] if plan else [],
    }


async def redeem_promo(db: AsyncSession, org_id: UUID, code: str) -> dict:
    """Apply a pilot/promo code to an existing org post-signup.

    Mirrors the signup-time logic — if the code matches a PilotProgram, it can
    override the tier (typically pro or starter) and add credits to the wallet.
    Idempotent per pilot: re-redeeming the same active pilot does nothing.
    """
    code = (code or "").strip()
    if not code:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Promo code is required")

    pilot = (
        await db.execute(select(PilotProgram).where(PilotProgram.code == code))
    ).scalar_one_or_none()
    if not pilot:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Promo code not recognised")

    now = datetime.now(timezone.utc)
    if pilot.expires_at and pilot.expires_at < now:
        raise HTTPException(status.HTTP_410_GONE, "This promo code has expired")
    if pilot.starts_at and pilot.starts_at > now:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This promo code is not yet active")
    if pilot.max_redemptions and pilot.redemptions_used >= pilot.max_redemptions:
        raise HTTPException(status.HTTP_410_GONE, "This promo code has been fully redeemed")

    sub = await get_subscription(db, org_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")

    if sub.pilot_program_id == pilot.id:
        # Already applied — return current state, don't double-credit.
        return {
            "applied": False,
            "already_applied": True,
            "billing": await get_billing_summary(db, org_id),
            "credits_added": 0,
        }

    wallet = (
        await db.execute(select(CreditWallet).where(CreditWallet.org_id == org_id))
    ).scalar_one_or_none()
    if not wallet:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Credit wallet not found")

    # Apply tier override if specified (e.g. pilot upgrades Starter → Pro).
    if pilot.tier_override:
        plan = get_plan(pilot.tier_override)
        if plan:
            sub.tier = pilot.tier_override
            sub.status = "active"
            sub.trial_ends_at = None

    # Top up credits
    credit_grant = pilot.credit_grant or 0
    if credit_grant > 0:
        wallet.balance = (wallet.balance or 0) + credit_grant

    sub.pilot_program_id = pilot.id
    pilot.redemptions_used = (pilot.redemptions_used or 0) + 1

    await db.commit()
    await db.refresh(sub)
    await db.refresh(wallet)

    return {
        "applied": True,
        "already_applied": False,
        "billing": await get_billing_summary(db, org_id),
        "credits_added": credit_grant,
        "pilot_name": pilot.name,
    }


async def select_plan(db: AsyncSession, org_id: UUID, tier: str) -> dict:
    """Switch the org's subscription tier.

    Stripe checkout is deferred — for now we flip status to active and
    record the new tier. No seat-count gating; plans only change features
    and the per-seat rate.
    """
    plan = get_plan(tier)
    if not plan:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Unknown plan: {tier}")

    sub = await get_subscription(db, org_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")

    sub.tier = tier
    # Self-serve plans flip to active immediately. Enterprise stays in trial
    # until sales contracts and a manual flip happens.
    if plan["is_custom"]:
        # Don't auto-activate; sales reaches out and confirms terms.
        pass
    else:
        sub.status = "active"
        sub.trial_ends_at = None

    await db.commit()
    await db.refresh(sub)
    return await get_billing_summary(db, org_id)


async def resend_invite(db: AsyncSession, org_id: UUID, seat_id: UUID) -> dict:
    """Re-issue an invite token for a still-pending seat. Used by the Team page."""
    seat = (
        await db.execute(
            select(Seat).where(Seat.id == seat_id, Seat.org_id == org_id, Seat.status == "invited")
        )
    ).scalar_one_or_none()
    if not seat or not seat.invited_email:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pending invite not found")

    invite = (
        await db.execute(
            select(SeatInvite)
            .where(
                SeatInvite.org_id == org_id,
                SeatInvite.email == seat.invited_email,
                SeatInvite.accepted_at.is_(None),
            )
            .order_by(SeatInvite.created_at.desc())
        )
    ).scalars().first()

    token = secrets.token_urlsafe(32)
    if invite:
        invite.token = token
        invite.expires_at = datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS)
    else:
        invite = SeatInvite(
            org_id=org_id,
            email=seat.invited_email,
            role=seat.role,
            token=token,
            expires_at=datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS),
        )
        db.add(invite)

    await db.commit()

    settings = get_settings()
    return {
        "id": invite.id,
        "email": invite.email,
        "role": invite.role,
        "token": invite.token,
        "expires_at": invite.expires_at,
        "invite_link": f"{settings.frontend_url}/accept-invite?token={token}",
    }


async def revoke_seat(db: AsyncSession, org_id: UUID, seat_id: UUID, current_seat_id: UUID) -> None:
    if seat_id == current_seat_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot remove your own seat")

    seat = (
        await db.execute(
            select(Seat).where(Seat.id == seat_id, Seat.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not seat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Seat not found")
    if seat.role == "owner":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot remove the owner seat")

    seat.status = "disabled"

    sub = (await db.execute(select(Subscription).where(Subscription.org_id == org_id))).scalar_one_or_none()
    if sub and sub.seat_count > 1:
        sub.seat_count -= 1

    await db.commit()
