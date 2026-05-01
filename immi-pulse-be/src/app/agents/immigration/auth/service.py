"""Auth service — signup creates Org + Owner Seat + Subscription + Wallet + seed questionnaires."""

import logging
import re
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.auth.schemas import SignupRequest
from app.agents.immigration.orgs.models import (
    CreditWallet,
    Organization,
    PilotProgram,
    Seat,
    Subscription,
)
from app.agents.immigration.questionnaires.models import (
    Questionnaire,
    QuestionnaireVersion,
)
from app.agents.immigration.users.models import User
from app.core.jwt_auth import hash_password, verify_password

logger = logging.getLogger(__name__)


SEED_QUESTIONNAIRES = [
    {
        "name": "General intake",
        "audience": "general",
        "description": "A short pre-case questionnaire for any new inquiry.",
        "fields": [
            {"key": "current_situation", "label": "What is your current visa situation?", "type": "long_text", "required": True},
            {"key": "visa_interest", "label": "Which Australian visa are you interested in?", "type": "short_text", "required": False},
            {"key": "country", "label": "Which country are you currently in?", "type": "short_text", "required": False},
        ],
    },
    {
        "name": "Individual onshore",
        "audience": "onshore",
        "description": "For applicants currently in Australia.",
        "fields": [
            {"key": "current_visa", "label": "What visa are you currently on?", "type": "short_text", "required": True},
            {"key": "visa_expiry", "label": "When does your current visa expire?", "type": "date", "required": False},
            {"key": "occupation", "label": "What is your occupation?", "type": "short_text", "required": True},
            {"key": "experience_years", "label": "Years of experience in this occupation", "type": "number", "required": False},
            {"key": "english_test", "label": "Have you taken an English test? (e.g. PTE / IELTS)", "type": "yes_no", "required": False},
        ],
    },
    {
        "name": "Individual offshore",
        "audience": "offshore",
        "description": "For applicants outside Australia.",
        "fields": [
            {"key": "current_country", "label": "Country you currently live in", "type": "short_text", "required": True},
            {"key": "occupation", "label": "What is your occupation?", "type": "short_text", "required": True},
            {"key": "experience_years", "label": "Years of experience", "type": "number", "required": False},
            {"key": "highest_qualification", "label": "Highest qualification", "type": "short_text", "required": False},
            {"key": "intent", "label": "Why do you want to come to Australia?", "type": "long_text", "required": False},
        ],
    },
    {
        "name": "Employer sponsored",
        "audience": "employer",
        "description": "For Australian employers looking to sponsor a candidate.",
        "fields": [
            {"key": "company_name", "label": "Company name", "type": "short_text", "required": True},
            {"key": "abn", "label": "ABN", "type": "short_text", "required": False},
            {"key": "industry", "label": "Industry", "type": "short_text", "required": False},
            {"key": "candidate_role", "label": "Role to be sponsored", "type": "short_text", "required": True},
            {"key": "candidate_country", "label": "Where is the candidate currently located?", "type": "short_text", "required": False},
            {"key": "urgency", "label": "How soon do you need them onshore?", "type": "short_text", "required": False},
        ],
    },
]


def _slugify(value: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return s or "form"


async def _unique_slug(db: AsyncSession, base: str) -> str:
    candidate = base
    n = 0
    while True:
        existing = (
            await db.execute(select(Questionnaire).where(Questionnaire.slug == candidate))
        ).scalar_one_or_none()
        if not existing:
            return candidate
        n += 1
        candidate = f"{base}-{n}"


async def _create_seed_questionnaires(db: AsyncSession, org: Organization, seat: Seat) -> None:
    org_slug = _slugify(org.name)
    for tpl in SEED_QUESTIONNAIRES:
        slug_base = f"{org_slug}-{_slugify(tpl['name'])}"
        slug = await _unique_slug(db, slug_base)
        q = Questionnaire(
            org_id=org.id,
            name=tpl["name"],
            description=tpl["description"],
            slug=slug,
            audience=tpl["audience"],
            is_active=True,
            created_by_seat_id=seat.id,
        )
        db.add(q)
        await db.flush()
        version = QuestionnaireVersion(
            questionnaire_id=q.id,
            version_no=1,
            schema={"fields": tpl["fields"]},
            published_at=datetime.now(timezone.utc),
        )
        db.add(version)
        await db.flush()
        q.current_version_id = version.id


async def signup(db: AsyncSession, payload: SignupRequest) -> dict:
    # Reject duplicate email
    existing = (await db.execute(select(User).where(User.email == payload.email.lower()))).scalar_one_or_none()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "An account with this email already exists")

    # Resolve pilot program
    pilot: Optional[PilotProgram] = None
    if payload.promo_code:
        pilot = (
            await db.execute(select(PilotProgram).where(PilotProgram.code == payload.promo_code.strip()))
        ).scalar_one_or_none()
        if not pilot:
            # We do not error out — the user just doesn't get the benefit. Surfaced in response.
            logger.info(f"Unknown promo code on signup: {payload.promo_code}")

    # Create user
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        email_verified=True,  # Skip OTP per current scope
        first_name=payload.first_name,
        last_name=payload.last_name,
        role="consultant",
        status="active",
    )
    db.add(user)
    await db.flush()

    # Create Org
    org = Organization(name=payload.firm_name, country="AU")
    db.add(org)
    await db.flush()

    # Subscription
    tier = pilot.tier_override if pilot and pilot.tier_override else "starter"
    sub = Subscription(
        org_id=org.id,
        tier=tier,
        status="active" if pilot else "trial",
        seat_count=1,
        pilot_program_id=pilot.id if pilot else None,
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=14) if not pilot else None,
        current_period_end=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(sub)

    # Wallet
    initial_balance = pilot.credit_grant if pilot else 1000
    wallet = CreditWallet(
        org_id=org.id,
        balance=initial_balance,
        monthly_grant=initial_balance,
        grant_resets_at=datetime.now(timezone.utc) + timedelta(days=30),
    )
    db.add(wallet)

    # Owner Seat
    now = datetime.now(timezone.utc)
    seat = Seat(
        org_id=org.id,
        user_id=user.id,
        role="owner",
        status="active",
        joined_at=now,
    )
    db.add(seat)
    await db.flush()

    # Seed questionnaires
    await _create_seed_questionnaires(db, org, seat)

    # Bump pilot redemption count
    if pilot:
        pilot.redemptions_used = (pilot.redemptions_used or 0) + 1

    await db.commit()
    await db.refresh(user)
    await db.refresh(org)
    await db.refresh(sub)
    await db.refresh(wallet)
    await db.refresh(seat)
    return {"user": user, "org": org, "subscription": sub, "wallet": wallet, "seat": seat}


async def login(db: AsyncSession, email: str, password: str) -> dict:
    user = (await db.execute(select(User).where(User.email == email.lower()))).scalar_one_or_none()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if user.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Account is {user.status}")

    seat = (
        await db.execute(
            select(Seat).where(Seat.user_id == user.id, Seat.status == "active").limit(1)
        )
    ).scalar_one_or_none()
    if not seat:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No active seat for this user")

    org = (await db.execute(select(Organization).where(Organization.id == seat.org_id))).scalar_one_or_none()
    sub = (await db.execute(select(Subscription).where(Subscription.org_id == seat.org_id))).scalar_one_or_none()
    wallet = (await db.execute(select(CreditWallet).where(CreditWallet.org_id == seat.org_id))).scalar_one_or_none()

    return {"user": user, "org": org, "subscription": sub, "wallet": wallet, "seat": seat}


async def me(db: AsyncSession, user_id: UUID, seat_id: UUID, org_id: UUID) -> dict:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    seat = (await db.execute(select(Seat).where(Seat.id == seat_id))).scalar_one_or_none()
    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one_or_none()
    sub = (await db.execute(select(Subscription).where(Subscription.org_id == org_id))).scalar_one_or_none()
    wallet = (await db.execute(select(CreditWallet).where(CreditWallet.org_id == org_id))).scalar_one_or_none()
    return {"user": user, "org": org, "subscription": sub, "wallet": wallet, "seat": seat}
