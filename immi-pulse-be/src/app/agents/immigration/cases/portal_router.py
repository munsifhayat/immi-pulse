"""
Client portal API — unauthenticated entry point for case clients.

Auth flow:
  POST /client-portal/verify  { token, pin }  → session JWT (15 min)
  All subsequent calls send Authorization: Bearer <jwt>.
The X-API-Key middleware skips /api/v1/client-portal/* entirely, so this
router is fully responsible for its own auth.
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.cases.schemas import (
    CaseDocumentOut,
    ChecklistItem,
    PortalCaseOut,
    PortalVerifyRequest,
    PortalVerifyResponse,
)
from app.agents.immigration.cases.service import CaseService
from app.core.portal_auth import (
    PortalAuthError,
    issue_session_jwt,
    load_session_case_id,
    verify_portal_token_and_pin,
)
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/client-portal", tags=["Client Portal"])


# --- Session dependency ------------------------------------------------------


async def require_portal_session(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing portal session token.",
        )
    token = authorization.split(" ", 1)[1].strip()
    try:
        case_id = await load_session_case_id(db, token)
    except PortalAuthError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": err.code, "message": err.message},
        ) from err
    return case_id


# --- Endpoints ---------------------------------------------------------------


@router.post("/verify", response_model=PortalVerifyResponse)
async def verify_portal(
    payload: PortalVerifyRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        token_payload, row = await verify_portal_token_and_pin(
            db, token=payload.token, pin=payload.pin
        )
    except PortalAuthError as err:
        await db.commit()  # Persist attempt_count increments even on failure.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": err.code, "message": err.message},
        ) from err

    await db.commit()
    session_jwt, exp = issue_session_jwt(
        case_id=token_payload.case_id,
        token_id=token_payload.token_id,
    )
    return PortalVerifyResponse(
        session_jwt=session_jwt,
        expires_at=exp,
        case_id=token_payload.case_id,
    )


@router.get("/case", response_model=PortalCaseOut)
async def get_portal_case(
    case_id=Depends(require_portal_session),
    db: AsyncSession = Depends(get_db),
):
    case = await CaseService.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    documents = await CaseService.list_documents(db, case_id)
    checklist_data = (case.metadata_json or {}).get("checklist") or []
    checklist = [ChecklistItem.model_validate(item) for item in checklist_data] or None
    return PortalCaseOut(
        id=case.id,
        client_name=case.client_name,
        visa_subclass=case.visa_subclass,
        visa_name=case.visa_name,
        stage=case.stage,
        documents=[CaseDocumentOut.model_validate(d) for d in documents],
        checklist=checklist,
    )


@router.post(
    "/upload",
    response_model=CaseDocumentOut,
    status_code=status.HTTP_201_CREATED,
)
async def upload_portal_document(
    file: UploadFile,
    case_id=Depends(require_portal_session),
    db: AsyncSession = Depends(get_db),
):
    case = await CaseService.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    body = await file.read()
    if not body:
        raise HTTPException(status_code=400, detail="Empty upload.")
    if len(body) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (25 MB max).")

    document = await CaseService.store_document(
        db,
        case_id=case_id,
        file_name=file.filename or "upload.bin",
        file_bytes=body,
        content_type=file.content_type,
        uploaded_by_type="client",
    )
    await db.commit()
    await db.refresh(document)

    # Kick off background analysis if the analyzer is wired in. We do not
    # block the upload response on it — the client polls /case to see updates.
    try:
        from app.agents.immigration.cases.document_analyzer import (
            schedule_document_analysis,
        )

        schedule_document_analysis(document.id)
    except Exception as e:  # pragma: no cover - analyzer is optional in MVP
        logger.warning(f"Document analysis not scheduled for {document.id}: {e}")

    return document
