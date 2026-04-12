"""Consultant-facing API for the Cases feature (requires X-API-Key)."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.cases.schemas import (
    CaseDocumentOut,
    CaseOut,
    CaseTimelineEventOut,
    CreateCaseRequest,
    DocumentDownloadUrlOut,
    GeneratePortalLinkRequest,
    GeneratePortalLinkResponse,
    ReviewDocumentRequest,
    UpdateCaseRequest,
)
from app.agents.immigration.cases.service import CaseService
from app.core.config import get_settings
from app.core.storage import presigned_download_url
from app.db.session import get_db

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/cases", tags=["Cases"])


# --- Helpers ----------------------------------------------------------------


async def _case_to_out(db: AsyncSession, case) -> CaseOut:
    total, pending = await CaseService.count_documents(db, case.id)
    payload = CaseOut.model_validate(case)
    payload.documents_count = total
    payload.documents_pending = pending
    return payload


# --- Cases ------------------------------------------------------------------


@router.get("", response_model=list[CaseOut])
async def list_cases(
    stage: Optional[str] = None,
    priority: Optional[str] = None,
    visa_subclass: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
):
    cases = await CaseService.list_cases(
        db,
        stage=stage,
        priority=priority,
        visa_subclass=visa_subclass,
        search=search,
        limit=limit,
    )
    return [await _case_to_out(db, c) for c in cases]


@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
async def create_case(
    payload: CreateCaseRequest,
    db: AsyncSession = Depends(get_db),
):
    case = await CaseService.create_case(db, payload)
    await db.commit()
    await db.refresh(case)
    return await _case_to_out(db, case)


@router.get("/{case_id}", response_model=CaseOut)
async def get_case(case_id: UUID, db: AsyncSession = Depends(get_db)):
    case = await CaseService.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return await _case_to_out(db, case)


@router.patch("/{case_id}", response_model=CaseOut)
async def update_case(
    case_id: UUID,
    payload: UpdateCaseRequest,
    db: AsyncSession = Depends(get_db),
):
    case = await CaseService.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    await CaseService.update_case(db, case, payload)
    await db.commit()
    await db.refresh(case)
    return await _case_to_out(db, case)


# --- Timeline ---------------------------------------------------------------


@router.get("/{case_id}/timeline", response_model=list[CaseTimelineEventOut])
async def get_case_timeline(case_id: UUID, db: AsyncSession = Depends(get_db)):
    case = await CaseService.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return await CaseService.list_events(db, case_id)


# --- Documents --------------------------------------------------------------


@router.get("/{case_id}/documents", response_model=list[CaseDocumentOut])
async def list_case_documents(case_id: UUID, db: AsyncSession = Depends(get_db)):
    case = await CaseService.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return await CaseService.list_documents(db, case_id)


@router.post(
    "/{case_id}/documents",
    response_model=CaseDocumentOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_consultant_document(
    case_id: UUID,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
):
    case = await CaseService.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    body = await file.read()
    document = await CaseService.store_document(
        db,
        case_id=case_id,
        file_name=file.filename or "upload.bin",
        file_bytes=body,
        content_type=file.content_type,
        uploaded_by_type="consultant",
    )
    await db.commit()
    await db.refresh(document)
    return document


@router.post(
    "/{case_id}/documents/{document_id}/review",
    response_model=CaseDocumentOut,
)
async def review_document(
    case_id: UUID,
    document_id: UUID,
    payload: ReviewDocumentRequest,
    db: AsyncSession = Depends(get_db),
):
    document = await CaseService.get_document(db, document_id)
    if document is None or document.case_id != case_id:
        raise HTTPException(status_code=404, detail="Document not found")
    await CaseService.mark_document_reviewed(
        db,
        document,
        status=payload.status,
        review_notes=payload.review_notes,
        reviewer_user_id=None,
    )
    await db.commit()
    await db.refresh(document)
    return document


@router.get(
    "/{case_id}/documents/{document_id}/download",
    response_model=DocumentDownloadUrlOut,
)
async def download_document(
    case_id: UUID,
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    document = await CaseService.get_document(db, document_id)
    if document is None or document.case_id != case_id:
        raise HTTPException(status_code=404, detail="Document not found")
    expires_in = 300
    url = presigned_download_url(document.s3_key, expires_in=expires_in)
    return DocumentDownloadUrlOut(url=url, expires_in_seconds=expires_in)


# --- Portal link ------------------------------------------------------------


@router.post(
    "/{case_id}/generate-portal-link",
    response_model=GeneratePortalLinkResponse,
)
async def generate_portal_link(
    case_id: UUID,
    payload: GeneratePortalLinkRequest,
    db: AsyncSession = Depends(get_db),
):
    case = await CaseService.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")

    row, signed_token, pin = await CaseService.create_portal_token(
        db,
        case_id=case_id,
        expires_in_days=payload.expires_in_days,
    )

    portal_url = f"{settings.frontend_url.rstrip('/')}/client-portal/{signed_token}"

    email_sent = False
    # Emailing the client is stubbed until we wire the Microsoft Graph sender
    # in a follow-up. For now we just return the URL + PIN so the consultant
    # can deliver it themselves.
    if payload.send_email:
        logger.info(
            f"Portal link email delivery not yet wired (case={case_id}, "
            f"client={case.client_email})"
        )

    await db.commit()
    return GeneratePortalLinkResponse(
        url=portal_url,
        pin=pin,
        expires_at=row.expires_at,
        token_id=row.id,
        email_sent=email_sent,
    )


@router.post("/{case_id}/portal-links/{token_id}/revoke", status_code=204)
async def revoke_portal_link(
    case_id: UUID,
    token_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    from app.agents.immigration.cases.models import CasePortalToken

    token = await db.get(CasePortalToken, token_id)
    if token is None or token.case_id != case_id:
        raise HTTPException(status_code=404, detail="Portal link not found")
    await CaseService.revoke_portal_token(db, token)
    await db.commit()
