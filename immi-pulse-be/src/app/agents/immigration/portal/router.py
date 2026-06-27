"""Client portal API.

`public_router`  — org-scoped, unauthenticated entry (login/forgot) + account-session
                   protected reads/writes. Lives under /public/portal so the API-key
                   middleware lets it through (see PUBLIC_PREFIXES).
`consultant_router` — consultant-authenticated credential actions for the
                   "Client access" card (resend / regenerate / fetch-by-precase).
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.clients.models import Client, ClientPortalAccount
from app.agents.immigration.orgs.models import Organization
from app.agents.immigration.portal import schemas as S
from app.agents.immigration.portal import service as portal_service
from app.agents.immigration.portal.auth import require_portal_account
from app.agents.immigration.precases.models import PreCase
from app.core.jwt_auth import CurrentContext, get_current_context
from app.db.session import get_db

logger = logging.getLogger(__name__)

public_router = APIRouter(prefix="/public/portal", tags=["Client Portal"])
consultant_router = APIRouter(prefix="/clients/portal-accounts", tags=["Client Portal"])

_MAX_UPLOAD_BYTES = 25 * 1024 * 1024


# ── Public: org info + auth ──────────────────────────────────────────────────


@public_router.get("/{org_slug}/info", response_model=S.PortalOrgInfo)
async def portal_info(org_slug: str, db: AsyncSession = Depends(get_db)):
    org = await portal_service.get_org_by_slug(db, org_slug)
    return S.PortalOrgInfo(org_slug=org_slug, firm_name=org.name, omara_number=org.omara_number)


@public_router.post("/{org_slug}/login", response_model=S.PortalLoginResponse)
async def portal_login(
    org_slug: str,
    payload: S.PortalLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    return await portal_service.login(db, org_slug, payload.email, payload.password)


@public_router.post("/{org_slug}/forgot-password", response_model=S.SimpleOk)
async def portal_forgot_password(
    org_slug: str,
    payload: S.ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    await portal_service.forgot_password(db, org_slug, payload.email)
    return S.SimpleOk(message="If that email has an account, we've sent a fresh password.")


# ── Public: authenticated (account session) ──────────────────────────────────


@public_router.get("/me", response_model=S.PortalMeOut)
async def portal_me(
    account: ClientPortalAccount = Depends(require_portal_account),
    db: AsyncSession = Depends(get_db),
):
    return await portal_service.me(db, account)


@public_router.post("/set-password", response_model=S.SimpleOk)
async def portal_set_password(
    payload: S.SetPasswordRequest,
    account: ClientPortalAccount = Depends(require_portal_account),
    db: AsyncSession = Depends(get_db),
):
    await portal_service.set_password(db, account, payload.new_password)
    return S.SimpleOk(message="Password updated.")


@public_router.get("/applications", response_model=list[S.PortalApplicationSummary])
async def portal_list_applications(
    account: ClientPortalAccount = Depends(require_portal_account),
    db: AsyncSession = Depends(get_db),
):
    return await portal_service.list_applications(db, account)


@public_router.get("/applications/{application_id}", response_model=S.PortalApplicationDetail)
async def portal_application_detail(
    application_id: UUID,
    account: ClientPortalAccount = Depends(require_portal_account),
    db: AsyncSession = Depends(get_db),
):
    return await portal_service.get_application_detail(db, account, application_id)


@public_router.post("/applications/{application_id}/sign", response_model=S.PortalSignResponse)
async def portal_sign(
    application_id: UUID,
    payload: S.PortalSignRequest,
    request: Request,
    user_agent: Optional[str] = Header(None, alias="User-Agent"),
    account: ClientPortalAccount = Depends(require_portal_account),
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else None
    return await portal_service.sign_application_letter(
        db, account, application_id, payload.model_dump(), ip_address=ip, user_agent=user_agent
    )


@public_router.post(
    "/applications/{application_id}/documents",
    response_model=S.PortalDocument,
    status_code=status.HTTP_201_CREATED,
)
async def portal_upload_document(
    application_id: UUID,
    file: UploadFile,
    account: ClientPortalAccount = Depends(require_portal_account),
    db: AsyncSession = Depends(get_db),
):
    body = await file.read()
    if not body:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Empty file")
    if len(body) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File too large (25 MB max)")
    return await portal_service.upload_application_document(
        db,
        account,
        application_id,
        file_name=file.filename or "upload.bin",
        file_bytes=body,
        content_type=file.content_type,
    )


# ── Consultant: credential actions for the "Client access" card ──────────────


async def _load_account_for_consultant(
    db: AsyncSession, account_id: UUID, ctx: CurrentContext
) -> ClientPortalAccount:
    account = (
        await db.execute(select(ClientPortalAccount).where(ClientPortalAccount.id == account_id))
    ).scalar_one_or_none()
    if account is None or account.org_id != ctx.org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Portal account not found")
    return account


async def _client_name(db: AsyncSession, client_id: UUID) -> Optional[str]:
    client = (await db.execute(select(Client).where(Client.id == client_id))).scalar_one_or_none()
    return client.name if client else None


@consultant_router.get("/by-precase/{precase_id}", response_model=Optional[S.ClientAccessOut])
async def get_access_by_precase(
    precase_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    """Re-fetch the Client access card for a pre-case (returns null if none yet)."""
    pc = (
        await db.execute(
            select(PreCase).where(PreCase.id == precase_id, PreCase.org_id == ctx.org_id)
        )
    ).scalar_one_or_none()
    if pc is None or pc.client_id is None:
        return None
    org = (await db.execute(select(Organization).where(Organization.id == ctx.org_id))).scalar_one()
    access = await portal_service.access_for_client(db, org, pc.client_id)
    await db.commit()
    return access


@consultant_router.post("/{account_id}/resend", response_model=S.ClientAccessOut)
async def resend_welcome(
    account_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    account = await _load_account_for_consultant(db, account_id, ctx)
    org = (await db.execute(select(Organization).where(Organization.id == ctx.org_id))).scalar_one()
    name = await _client_name(db, account.client_id)
    access = await portal_service.build_client_access(db, org, account, client_name=name)
    await portal_service.send_welcome_email(
        org=org,
        account=account,
        temp_password=portal_service.current_temp_password(account),
        client_name=name,
        org_slug=access.portal_path.rsplit("/", 1)[-1],
    )
    await db.commit()
    return access


@consultant_router.post("/{account_id}/regenerate-password", response_model=S.ClientAccessOut)
async def regenerate_password(
    account_id: UUID,
    ctx: CurrentContext = Depends(get_current_context),
    db: AsyncSession = Depends(get_db),
):
    account = await _load_account_for_consultant(db, account_id, ctx)
    org = (await db.execute(select(Organization).where(Organization.id == ctx.org_id))).scalar_one()
    temp = await portal_service.regenerate_password(db, account)
    name = await _client_name(db, account.client_id)
    access = await portal_service.build_client_access(db, org, account, client_name=name)
    await portal_service.send_welcome_email(
        org=org,
        account=account,
        temp_password=temp,
        client_name=name,
        org_slug=access.portal_path.rsplit("/", 1)[-1],
    )
    await db.commit()
    return access
