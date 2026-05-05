"""Clients router — list, detail, create, patch, send-questionnaire, open-case-direct."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.clients import service as clients_service
from app.agents.immigration.clients.schemas import (
    ClientCreate,
    ClientDetail,
    ClientListItem,
    ClientPatch,
    OpenCaseDirectRequest,
    OpenCaseDirectResponse,
    SendQuestionnaireRequest,
    SendQuestionnaireResponse,
)
from app.core.jwt_auth import CurrentContext, get_current_context
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.get("", response_model=list[ClientListItem])
async def list_clients(
    search: Optional[str] = Query(None, max_length=120),
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await clients_service.list_clients(db, ctx.org_id, search)


@router.post("", response_model=ClientListItem, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await clients_service.create_client(db, ctx.org_id, payload.model_dump())


@router.get("/{client_id}", response_model=ClientDetail)
async def get_client(
    client_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await clients_service.get_client_detail(db, ctx.org_id, client_id)


@router.patch("/{client_id}", response_model=ClientDetail)
async def patch_client(
    client_id: UUID,
    payload: ClientPatch,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await clients_service.patch_client(
        db, ctx.org_id, client_id, payload.model_dump(exclude_unset=True)
    )


@router.post("/{client_id}/send-questionnaire", response_model=SendQuestionnaireResponse)
async def send_questionnaire(
    client_id: UUID,
    payload: SendQuestionnaireRequest,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    return await clients_service.send_questionnaire_link(
        db, ctx.org_id, client_id, payload.questionnaire_id, payload.personal_note
    )


@router.post("/{client_id}/open-case", response_model=OpenCaseDirectResponse, status_code=status.HTTP_201_CREATED)
async def open_case_direct(
    client_id: UUID,
    payload: OpenCaseDirectRequest,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Manual override: skip the pre-case ladder, open a case directly.

    Used for relative cases, walk-ins, or any time the consultant has handled
    engagement + payment outside the platform.
    """
    case_id = await clients_service.open_case_direct(
        db, ctx.org_id, client_id, ctx.seat_id, payload.model_dump()
    )
    return OpenCaseDirectResponse(case_id=case_id)
