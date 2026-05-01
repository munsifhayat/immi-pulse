"""Auth router — /auth/signup, /auth/login, /auth/me."""

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.auth import service as auth_service
from app.agents.immigration.auth.schemas import (
    AuthResponse,
    LoginRequest,
    MeResponse,
    SignupRequest,
)
from app.core.jwt_auth import CurrentContext, get_current_context, issue_token
from app.db.session import get_db

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


@router.post("/signup", response_model=AuthResponse)
async def signup(payload: SignupRequest, db: AsyncSession = Depends(get_db)):
    result = await auth_service.signup(db, payload)
    return _build_auth_response(result)


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
