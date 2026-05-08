"""Auth router — /auth/signup, /auth/login, /auth/me."""

import logging

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.auth import service as auth_service
from app.agents.immigration.auth.schemas import (
    AuthResponse,
    LoginRequest,
    MeResponse,
    SignupRequest,
)
from app.core.config import get_settings
from app.core.jwt_auth import CurrentContext, get_current_context, issue_token
from app.db.session import get_db
from app.integrations.resend.templates import send_welcome

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


def _build_auth_response(result: dict) -> AuthResponse:
    token = issue_token(result["user"].id, result["seat"].id, result["org"].id)
    return AuthResponse(
        token=token,
        user=result["user"],
        org=result["org"],
        seat=result["seat"],
        subscription=result["subscription"],
        wallet=result["wallet"],
    )


async def _send_welcome_safe(*, to: str, recipient_name: str, dashboard_url: str) -> None:
    """Welcome email is best-effort — a Resend outage must never block signup."""
    try:
        await send_welcome(
            to=to,
            recipient_name=recipient_name,
            dashboard_url=dashboard_url,
        )
    except Exception as exc:  # noqa: BLE001 — swallow on purpose, log for ops
        logger.warning("[auth] welcome email failed for %s: %s", to, exc)


@router.post("/signup", response_model=AuthResponse)
async def signup(
    payload: SignupRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    result = await auth_service.signup(db, payload)
    response = _build_auth_response(result)

    settings = get_settings()
    if settings.resend_configured:
        user = result["user"]
        full_name = " ".join(filter(None, [user.first_name, user.last_name])).strip() or user.email
        background_tasks.add_task(
            _send_welcome_safe,
            to=user.email,
            recipient_name=full_name,
            dashboard_url=f"{settings.frontend_url.rstrip('/')}/dashboard",
        )

    return response


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await auth_service.login(db, payload.email, payload.password)
    return _build_auth_response(result)


@router.get("/me", response_model=MeResponse)
async def me(ctx: CurrentContext = Depends(get_current_context), db: AsyncSession = Depends(get_db)):
    result = await auth_service.me(db, ctx.user_id, ctx.seat_id, ctx.org_id)
    return MeResponse(
        user=result["user"],
        org=result["org"],
        seat=result["seat"],
        subscription=result["subscription"],
        wallet=result["wallet"],
    )
