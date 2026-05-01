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
    Organization,
    Seat,
    SeatInvite,
    Subscription,
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
