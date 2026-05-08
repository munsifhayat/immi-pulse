"""PreCase triage worker.

Best-effort: extracts structured info from the questionnaire answers and
produces a suggested outcome (likely_fit / needs_info / paid_consult /
unlikely_fit). Falls back to a simple heuristic when AWS Bedrock is not
configured so the inbox always gets *some* signal.

Runs out-of-band via asyncio.create_task — never blocks the submission.
"""

import asyncio
import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select

from app.agents.immigration.precases.models import PreCase
from app.agents.immigration.questionnaires.models import (
    Questionnaire,
    QuestionnaireResponse,
    QuestionnaireVersion,
)
from app.agents.immigration.orgs.models import Organization
from app.core.ai_gateway import AIGateway
from app.db.session import get_async_session

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are an immigration pre-case triage assistant for an Australian migration consultancy.

Given a prospect's questionnaire answers + the consultant's niche statement, produce a JSON output with:
  - summary: one paragraph plain-English summary of the prospect's situation
  - suggested_outcome: one of "likely_fit" | "needs_info" | "paid_consult" | "unlikely_fit"
  - reasoning: one short paragraph explaining the suggestion
  - extracted: an object of structured key facts (visa_interest, current_country, occupation, experience_years, current_visa, etc) — keys lowercase snake_case, only include what's clearly stated
  - confidence: float 0.0 to 1.0

Respond ONLY with that JSON object. No preamble, no markdown fences.
Outcome guidance:
  - likely_fit: matches the consultant's niche, complete enough info to act
  - needs_info: matches niche but missing key facts; consultant should follow up
  - paid_consult: edge case, would need a paid 1:1 consultation to assess properly
  - unlikely_fit: clearly outside the consultant's niche or visa pathway
"""


def _heuristic_fallback(answers: dict, niche: Optional[str]) -> dict:
    """No-AWS fallback. Looks for keywords; outcome defaults to needs_info."""
    text = " ".join(str(v) for v in (answers.values() if answers else []) if v)
    text_lower = text.lower()

    summary = (
        f"Prospect submitted answers ({len(answers or {})} fields). Awaiting consultant review."
    )
    outcome = "needs_info"
    reasoning = "Heuristic fallback: AI gateway not configured. Surfacing in inbox for manual review."

    if niche:
        # Trivial keyword overlap signal
        niche_words = {w for w in re.findall(r"[a-z]+", niche.lower()) if len(w) > 3}
        hits = sum(1 for w in niche_words if w in text_lower)
        if hits >= 2:
            outcome = "likely_fit"
            reasoning = f"Heuristic: {hits} keyword overlaps with consultant niche."

    extracted: dict = {}
    for key in ("visa_interest", "current_country", "occupation", "current_visa"):
        if answers and key in answers and answers[key]:
            extracted[key] = answers[key]

    return {
        "summary": summary,
        "suggested_outcome": outcome,
        "reasoning": reasoning,
        "extracted": extracted,
        "confidence": 0.3,
    }


def _safe_parse_json(text: str) -> Optional[dict]:
    """Extract a JSON object from a model response that may include extra text."""
    if not text:
        return None
    text = text.strip()
    # Strip code fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except Exception:
        # Find the first {...} block
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                return None
        return None


async def run_triage(precase_id: UUID) -> None:
    """Run AI triage for a single precase. Idempotent — checks ai_status before running."""
    async with get_async_session() as db:
        precase = (await db.execute(select(PreCase).where(PreCase.id == precase_id))).scalar_one_or_none()
        if not precase:
            logger.warning(f"Triage: precase {precase_id} not found")
            return
        if precase.ai_status in ("succeeded", "running"):
            logger.info(f"Triage: precase {precase_id} already {precase.ai_status}, skipping")
            return

        precase.ai_status = "running"
        await db.commit()

        # Load context
        response = (
            await db.execute(select(QuestionnaireResponse).where(QuestionnaireResponse.id == precase.response_id))
        ).scalar_one_or_none()
        questionnaire = None
        if response:
            questionnaire = (
                await db.execute(select(Questionnaire).where(Questionnaire.id == response.questionnaire_id))
            ).scalar_one_or_none()
        org = (await db.execute(select(Organization).where(Organization.id == precase.org_id))).scalar_one_or_none()

        answers = response.answers if response else {}
        niche = (org.niche if org else None) or ""

        # Build the user prompt
        prompt_payload = {
            "consultant_niche": niche,
            "questionnaire_name": questionnaire.name if questionnaire else None,
            "questionnaire_audience": questionnaire.audience if questionnaire else None,
            "submitter_email": response.submitter_email if response else None,
            "submitter_name": response.submitter_name if response else None,
            "answers": answers,
        }

        result_dict: Optional[dict] = None
        try:
            gateway = AIGateway()
            ai_result = await gateway.classify(
                content=json.dumps(prompt_payload, indent=2),
                system_prompt=SYSTEM_PROMPT,
                agent_name="precase_triage",
                max_tokens=1024,
            )
            if ai_result.success:
                result_dict = _safe_parse_json(ai_result.message)
            else:
                logger.info(f"Triage: AI gateway unavailable ({ai_result.error}), using fallback")
        except Exception as exc:  # pragma: no cover
            logger.warning(f"Triage: AI call raised {exc}, using fallback")

        if not result_dict:
            result_dict = _heuristic_fallback(answers, niche)
            precase.ai_status = "succeeded"  # fallback is still "complete"
        else:
            precase.ai_status = "succeeded"

        precase.ai_summary = result_dict.get("summary")
        precase.ai_suggested_outcome = result_dict.get("suggested_outcome")
        precase.ai_extracted = result_dict.get("extracted") or {}
        precase.ai_confidence = result_dict.get("confidence")

        await db.commit()
        logger.info(f"Triage: precase {precase_id} → {precase.ai_suggested_outcome}")


def run_triage_async(precase_id: UUID) -> None:
    """Fire-and-forget wrapper. Schedules triage on the running event loop."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(run_triage(precase_id))
    except RuntimeError:
        # No running loop — create one (rare path; e.g. CLI usage)
        asyncio.run(run_triage(precase_id))
