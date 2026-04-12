"""
Document analyzer — extract text from an uploaded case document and ask the
AI to classify + flag issues (passport expiring soon, IELTS score too low,
name mismatch, etc.).

MVP scope:
  1. Fetch the CaseDocument row by id.
  2. Read bytes back from storage (local or S3 — fetched on the same path
     used by the consultant's download link).
  3. Run the shared PDF/Word/Excel text extractor from
     `src/app/agents/shared/pdf_processor.py`.
  4. Send the excerpt to Claude Sonnet with a per-document-type prompt.
  5. Parse JSON response and update `ai_analysis` + `status`.

Scheduling:
  `schedule_document_analysis(document_id)` fires the work on the app's
  existing APScheduler instance (see `src/app/scheduler/jobs.py`) so the
  upload response returns immediately and analysis runs in the background.
"""

import json
import logging
import re
from typing import Any
from uuid import UUID

from app.agents.immigration.cases.models import CaseDocument
from app.agents.shared.pdf_processor import extract_text_from_attachment
from app.core.ai_gateway import AIGateway
from app.db.session import get_async_session

logger = logging.getLogger(__name__)

AGENT_NAME = "document_analyzer"

SYSTEM_PROMPT = """You are a document validation assistant for an Australian immigration consultancy.

Given the extracted text of a client-submitted document, do three things:
1. Identify the document type (passport, bank_statement, police_check, english_test,
   skills_assessment, education, form_80, form_1221, cv, other).
2. Check it for immigration-relevant issues:
   - Passport expiring within 6 months
   - IELTS/PTE scores below common thresholds
   - Name mismatches / typos
   - Expired certificates
   - Obviously missing fields
3. Assign an overall status: "validated" if clean, "flagged" if any concern.

Respond ONLY with a JSON object:
{
  "document_type": "...",
  "confidence": 0.0,
  "status": "validated" | "flagged",
  "flags": ["short human-readable issue", ...],
  "suggestions": ["short action for the consultant", ...]
}
"""


def _parse_response(message: str) -> dict[str, Any] | None:
    if not message:
        return None
    match = re.search(r"\{.*\}", message, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None
    return data


async def analyze_document(document_id: UUID) -> None:
    """Run analysis on a single uploaded document and persist results."""
    async with get_async_session() as db:
        document = await db.get(CaseDocument, document_id)
        if document is None:
            logger.warning(f"Document analyzer: {document_id} not found")
            return

        try:
            from app.core.storage import get_storage

            storage = get_storage()
            data = _read_bytes(storage, document.s3_key)
        except Exception as e:
            logger.error(f"Document analyzer: failed to read {document_id}: {e}")
            document.status = "flagged"
            document.ai_analysis = {
                "flags": [f"Unable to read uploaded file: {e}"],
                "suggestions": ["Ask the client to re-upload."],
            }
            await db.commit()
            return

        extracted = ""
        try:
            extracted = extract_text_from_attachment(
                filename=document.file_name,
                content=data,
            ) or ""
        except Exception as e:
            logger.warning(f"Document analyzer: text extraction failed for {document_id}: {e}")

        document.extracted_text = extracted[:20000] if extracted else None

        if not extracted.strip():
            document.status = "flagged"
            document.ai_analysis = {
                "flags": ["Could not extract any text from this file."],
                "suggestions": ["Ask the client for a text-based copy."],
            }
            await db.commit()
            return

        ai = AIGateway(db=db)
        response = await ai.analyze(
            content=extracted[:6000],
            system_prompt=SYSTEM_PROMPT,
            agent_name=AGENT_NAME,
        )

        if not response.success:
            logger.warning(f"Document analyzer: AI call failed for {document_id}")
            document.status = "pending"
            await db.commit()
            return

        parsed = _parse_response(response.message) or {}
        document.document_type = parsed.get("document_type") or document.document_type
        document.ai_analysis = parsed
        document.status = parsed.get("status") or "pending"
        await db.commit()
        logger.info(
            f"Document analyzer: {document_id} → "
            f"type={document.document_type} status={document.status}"
        )


def _read_bytes(storage: Any, key: str) -> bytes:
    """
    Read the raw bytes behind a stored key, independent of the storage
    backend. LocalStorage exposes _abs(key); S3Storage goes via get_object.
    """
    if hasattr(storage, "_abs"):
        return storage._abs(key).read_bytes()
    obj = storage._client.get_object(Bucket=storage.bucket, Key=key)
    return obj["Body"].read()


def schedule_document_analysis(document_id: UUID) -> None:
    """
    Fire-and-forget analysis. Runs on APScheduler when the main loop is up
    (production + dev server), or inline-via-asyncio if no scheduler is
    available (tests).
    """
    import asyncio

    try:
        from app.scheduler.jobs import get_scheduler

        scheduler = get_scheduler()
        if scheduler.running:
            scheduler.add_job(
                analyze_document,
                args=[document_id],
                id=f"analyze_document:{document_id}",
                replace_existing=True,
                misfire_grace_time=600,
            )
            return
    except Exception as e:  # pragma: no cover
        logger.debug(f"Scheduler unavailable for document analysis: {e}")

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(analyze_document(document_id))
    except RuntimeError:
        logger.warning(
            f"No running event loop; document {document_id} analysis will have to be run manually."
        )
