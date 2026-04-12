"""Business logic for the Agents Marketplace feature."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.marketplace.models import AgentProfile
from app.agents.immigration.marketplace.schemas import (
    ApplyAgentProfileRequest,
    UpdateAgentProfileRequest,
)
from app.agents.immigration.users.models import User

logger = logging.getLogger(__name__)

# Fields that reset status back to pending_review when edited after approval.
MATERIAL_FIELDS = {
    "firm_name",
    "omara_number",
    "bio",
    "specializations",
    "years_experience",
}


class AgentProfileService:
    """Directory listings, application workflow, approvals, and tier changes."""

    # --- Public listing -----------------------------------------------------

    @staticmethod
    async def list_public(
        db: AsyncSession,
        *,
        city: Optional[str] = None,
        state: Optional[str] = None,
        visa_type: Optional[str] = None,
        language: Optional[str] = None,
        tier: Optional[str] = None,
        search: Optional[str] = None,
        sort: str = "rating",
        limit: int = 50,
        offset: int = 0,
    ) -> list[AgentProfile]:
        query = select(AgentProfile).where(AgentProfile.status == "approved")

        if city:
            query = query.where(AgentProfile.city == city)
        if state:
            query = query.where(AgentProfile.state == state)
        if tier:
            query = query.where(AgentProfile.tier == tier)
        if visa_type:
            # JSONB array contains the visa code as a string.
            query = query.where(AgentProfile.specializations.contains([visa_type]))
        if language:
            query = query.where(AgentProfile.languages.contains([language]))
        if search:
            like = f"%{search.lower()}%"
            query = query.where(
                func.lower(AgentProfile.firm_name).like(like)
                | func.lower(AgentProfile.bio).like(like)
            )

        # Platinum sorts to the top always; then the requested sort.
        order_clauses = [
            (AgentProfile.tier == "platinum").desc(),
            AgentProfile.featured.desc(),
        ]
        if sort == "experience":
            order_clauses.append(AgentProfile.years_experience.desc())
        elif sort == "response_time":
            order_clauses.append(AgentProfile.response_time_hours.asc())
        else:
            order_clauses.append(AgentProfile.rating.desc())
        query = query.order_by(*order_clauses).limit(limit).offset(offset)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_public(db: AsyncSession, profile_id: UUID) -> Optional[AgentProfile]:
        profile = await db.get(AgentProfile, profile_id)
        if profile is None or profile.status != "approved":
            return None
        return profile

    # --- Applications -------------------------------------------------------

    @staticmethod
    async def apply(
        db: AsyncSession,
        payload: ApplyAgentProfileRequest,
    ) -> AgentProfile:
        """
        Submit a new application. Creates a User row keyed on email if one
        doesn't already exist. A user can only have one agent profile, so
        re-submitting with the same email updates the existing profile.
        """
        user = await AgentProfileService._get_or_create_user(
            db,
            email=payload.email,
            first_name=payload.first_name,
            last_name=payload.last_name,
        )

        existing = await db.execute(
            select(AgentProfile).where(AgentProfile.user_id == user.id)
        )
        profile = existing.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if profile is None:
            profile = AgentProfile(
                id=uuid.uuid4(),
                user_id=user.id,
                omara_number=payload.omara_number,
                firm_name=payload.firm_name,
                bio=payload.bio,
                city=payload.city,
                state=payload.state,
                specializations=payload.specializations,
                languages=payload.languages,
                years_experience=payload.years_experience,
                consultation_fee=payload.consultation_fee,
                response_time_hours=payload.response_time_hours,
                status="pending_review",
                submitted_at=now,
            )
            db.add(profile)
        else:
            profile.omara_number = payload.omara_number
            profile.firm_name = payload.firm_name
            profile.bio = payload.bio
            profile.city = payload.city
            profile.state = payload.state
            profile.specializations = payload.specializations
            profile.languages = payload.languages
            profile.years_experience = payload.years_experience
            profile.consultation_fee = payload.consultation_fee
            profile.response_time_hours = payload.response_time_hours
            profile.status = "pending_review"
            profile.submitted_at = now

        await db.flush()
        return profile

    @staticmethod
    async def update_profile(
        db: AsyncSession,
        profile: AgentProfile,
        payload: UpdateAgentProfileRequest,
    ) -> AgentProfile:
        data = payload.model_dump(exclude_unset=True)
        reset_status = False
        for field, value in data.items():
            if getattr(profile, field) != value:
                if field in MATERIAL_FIELDS:
                    reset_status = True
                setattr(profile, field, value)
        if reset_status and profile.status == "approved":
            profile.status = "pending_review"
            profile.submitted_at = datetime.now(timezone.utc)
        await db.flush()
        return profile

    @staticmethod
    async def get_by_user_id(
        db: AsyncSession, user_id: UUID
    ) -> Optional[AgentProfile]:
        result = await db.execute(
            select(AgentProfile).where(AgentProfile.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_id(db: AsyncSession, profile_id: UUID) -> Optional[AgentProfile]:
        return await db.get(AgentProfile, profile_id)

    # --- Admin actions ------------------------------------------------------

    @staticmethod
    async def list_pending(db: AsyncSession) -> list[AgentProfile]:
        result = await db.execute(
            select(AgentProfile)
            .where(AgentProfile.status == "pending_review")
            .order_by(AgentProfile.submitted_at.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def approve(
        db: AsyncSession,
        profile: AgentProfile,
        *,
        tier: str = "basic",
        featured: bool = False,
        approved_by: Optional[UUID] = None,
    ) -> AgentProfile:
        profile.status = "approved"
        profile.tier = tier
        profile.featured = featured
        profile.approved_at = datetime.now(timezone.utc)
        profile.approved_by = approved_by
        profile.rejection_reason = None
        await db.flush()
        return profile

    @staticmethod
    async def reject(
        db: AsyncSession,
        profile: AgentProfile,
        *,
        reason: str,
        approved_by: Optional[UUID] = None,
    ) -> AgentProfile:
        profile.status = "rejected"
        profile.rejection_reason = reason
        profile.approved_by = approved_by
        await db.flush()
        return profile

    @staticmethod
    async def set_tier(
        db: AsyncSession, profile: AgentProfile, *, tier: str
    ) -> AgentProfile:
        profile.tier = tier
        await db.flush()
        return profile

    # --- Helpers -----------------------------------------------------------

    @staticmethod
    async def _get_or_create_user(
        db: AsyncSession,
        *,
        email: str,
        first_name: str,
        last_name: str,
    ) -> User:
        result = await db.execute(select(User).where(User.email == email.lower()))
        user = result.scalar_one_or_none()
        if user is not None:
            return user
        user = User(
            id=uuid.uuid4(),
            email=email.lower(),
            first_name=first_name,
            last_name=last_name,
            role="consultant",
            status="active",
        )
        db.add(user)
        await db.flush()
        return user

    @staticmethod
    async def hydrate(db: AsyncSession, profile: AgentProfile) -> dict:
        """Return a dict with profile fields + flattened user display name."""
        user = await db.get(User, profile.user_id)
        display_name = None
        email = None
        if user is not None:
            first = user.first_name or ""
            last = user.last_name or ""
            display_name = f"{first} {last}".strip() or user.email
            email = user.email
        return {
            "id": profile.id,
            "user_id": profile.user_id,
            "firm_name": profile.firm_name,
            "omara_number": profile.omara_number,
            "bio": profile.bio,
            "city": profile.city,
            "state": profile.state,
            "specializations": profile.specializations,
            "languages": profile.languages,
            "years_experience": profile.years_experience,
            "consultation_fee": profile.consultation_fee,
            "response_time_hours": profile.response_time_hours,
            "tier": profile.tier,
            "status": profile.status,
            "featured": profile.featured,
            "avatar_color": profile.avatar_color,
            "rating": profile.rating,
            "review_count": profile.review_count,
            "submitted_at": profile.submitted_at,
            "approved_at": profile.approved_at,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
            "display_name": display_name,
            "email": email,
        }
