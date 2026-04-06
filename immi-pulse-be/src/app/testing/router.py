"""
E2E Test Router — send test emails into the real pipeline and verify results.

Flow: Graph API creates email in inbox → webhook fires → unified classifier
processes → results appear in activity log → this router checks them.

All test emails are tagged with [PP-TEST-{run_id}] in the subject for
tracing, verification, and cleanup.
"""

import asyncio
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.shared.models import AgentActivityLog
from app.core.config import get_settings
from app.db.session import get_db
from app.integrations.microsoft.graph_client import get_graph_client
from app.testing.scenarios import SCENARIOS

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/test", tags=["Testing"])


# --- Request / Response models ---

class SendEmailRequest(BaseModel):
    scenario: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    from_name: Optional[str] = "Test Sender"
    from_email: Optional[str] = "test-sender@example.com"
    mailbox: Optional[str] = None


class RunSuiteRequest(BaseModel):
    scenarios: Optional[list[str]] = None
    mailbox: Optional[str] = None
    delay_seconds: float = 2.0


# --- Endpoints ---

@router.get("/scenarios")
async def list_scenarios():
    """List all available test scenarios and their expected outcomes."""
    return {
        name: {
            "description": s["description"],
            "subject": s["subject"],
            "from": f"{s['from_name']} <{s['from_email']}>",
            "expected": s["expected"],
        }
        for name, s in SCENARIOS.items()
    }


@router.post("/send-email")
async def send_test_email(req: SendEmailRequest):
    """Send a single test email into the monitored mailbox.

    Either provide a `scenario` name (from /test/scenarios) or custom
    `subject` + `body`. The email is created directly in the mailbox inbox
    via Graph API, which triggers the webhook and runs the full pipeline.

    Returns the run_id tag to use with /test/results/{run_id}.
    """
    mailbox = req.mailbox or _get_default_mailbox()
    if not mailbox:
        return {"error": "No mailbox configured. Set MONITORED_MAILBOXES or pass mailbox param."}

    run_id = uuid.uuid4().hex[:8]
    tag = f"[PP-TEST-{run_id}]"

    if req.scenario:
        if req.scenario not in SCENARIOS:
            return {
                "error": f"Unknown scenario: {req.scenario}",
                "available": list(SCENARIOS.keys()),
            }
        scenario = SCENARIOS[req.scenario]
        subject = f"{tag} {scenario['subject']}"
        body = scenario["body"]
        from_name = scenario["from_name"]
        from_email = scenario["from_email"]
    elif req.subject and req.body:
        subject = f"{tag} {req.subject}"
        body = req.body
        from_name = req.from_name
        from_email = req.from_email
    else:
        return {"error": "Provide either 'scenario' name or custom 'subject' + 'body'."}

    graph = get_graph_client()
    try:
        message = await graph.create_message_in_inbox(
            mailbox=mailbox,
            subject=subject,
            body=body,
            from_name=from_name,
            from_email=from_email,
        )
        return {
            "status": "sent",
            "run_id": run_id,
            "tag": tag,
            "message_id": message.get("id"),
            "subject": subject,
            "mailbox": mailbox,
            "hint": f"Check results: GET /api/v1/test/results/{run_id}",
        }
    except Exception as e:
        logger.error(f"Failed to create test email: {e}")
        return {"status": "error", "error": str(e)}


@router.post("/run-suite")
async def run_test_suite(req: RunSuiteRequest):
    """Run multiple test scenarios sequentially and return all run IDs.

    If `scenarios` is omitted, runs ALL scenarios. Adds a small delay
    between emails so the pipeline can process them without overlap.
    """
    mailbox = req.mailbox or _get_default_mailbox()
    if not mailbox:
        return {"error": "No mailbox configured."}

    scenario_names = req.scenarios or list(SCENARIOS.keys())
    invalid = [s for s in scenario_names if s not in SCENARIOS]
    if invalid:
        return {"error": f"Unknown scenarios: {invalid}", "available": list(SCENARIOS.keys())}

    suite_id = uuid.uuid4().hex[:6]
    results = []
    graph = get_graph_client()

    for i, name in enumerate(scenario_names):
        scenario = SCENARIOS[name]
        run_id = f"{suite_id}-{i}"
        tag = f"[PP-TEST-{run_id}]"
        subject = f"{tag} {scenario['subject']}"

        try:
            message = await graph.create_message_in_inbox(
                mailbox=mailbox,
                subject=subject,
                body=scenario["body"],
                from_name=scenario["from_name"],
                from_email=scenario["from_email"],
            )
            results.append({
                "scenario": name,
                "status": "sent",
                "run_id": run_id,
                "tag": tag,
                "message_id": message.get("id"),
                "subject": subject,
            })
        except Exception as e:
            results.append({
                "scenario": name,
                "status": "error",
                "run_id": run_id,
                "error": str(e),
            })

        # Small delay between emails to avoid rate limiting
        if i < len(scenario_names) - 1:
            await asyncio.sleep(req.delay_seconds)

    return {
        "suite_id": suite_id,
        "mailbox": mailbox,
        "total": len(results),
        "sent": sum(1 for r in results if r["status"] == "sent"),
        "errors": sum(1 for r in results if r["status"] == "error"),
        "emails": results,
        "hint": f"Check results: GET /api/v1/test/results?suite_id={suite_id}",
    }


@router.get("/results/{run_id}")
async def get_test_results(
    run_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Check processing results for a specific test email by run_id.

    Searches the activity log for entries matching the [PP-TEST-{run_id}] tag.
    Returns all agent actions taken on this email.
    """
    tag = f"[PP-TEST-{run_id}]"
    query = (
        select(AgentActivityLog)
        .where(AgentActivityLog.subject.contains(tag))
        .order_by(AgentActivityLog.created_at.asc())
    )
    result = await db.execute(query)
    rows = result.scalars().all()

    if not rows:
        return {
            "run_id": run_id,
            "tag": tag,
            "status": "pending",
            "message": "No results yet. The email may still be processing (webhook + AI classification takes a few seconds).",
            "hint": "Try again in 5-10 seconds.",
        }

    activities = []
    for r in rows:
        activities.append({
            "agent": r.agent_name,
            "action": r.action,
            "status": r.status,
            "confidence": r.confidence_score,
            "processing_time_ms": r.processing_time_ms,
            "details": r.details,
            "error": r.error_message,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {
        "run_id": run_id,
        "tag": tag,
        "status": "processed",
        "subject": rows[0].subject,
        "mailbox": rows[0].mailbox,
        "agents": activities,
    }


@router.get("/results")
async def get_suite_results(
    suite_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
):
    """Check processing results for a test suite or all recent test emails.

    Pass `suite_id` to see results for a specific suite run, or omit
    to see all recent test email results.
    """
    search = f"[PP-TEST-{suite_id}" if suite_id else "[PP-TEST-"
    query = (
        select(AgentActivityLog)
        .where(AgentActivityLog.subject.contains(search))
        .order_by(AgentActivityLog.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    rows = result.scalars().all()

    if not rows:
        return {
            "suite_id": suite_id,
            "status": "pending",
            "message": "No results yet. Emails may still be processing.",
        }

    # Group by subject
    by_subject: dict[str, list] = {}
    for r in rows:
        subj = r.subject or "unknown"
        by_subject.setdefault(subj, []).append({
            "agent": r.agent_name,
            "action": r.action,
            "status": r.status,
            "confidence": r.confidence_score,
            "processing_time_ms": r.processing_time_ms,
            "details": r.details,
            "error": r.error_message,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    emails = []
    for subject, activities in by_subject.items():
        emails.append({
            "subject": subject,
            "agents": activities,
        })

    return {
        "suite_id": suite_id,
        "status": "processed",
        "total_emails": len(emails),
        "total_activities": len(rows),
        "emails": emails,
    }


@router.delete("/cleanup/{run_id}")
async def cleanup_test_email(run_id: str):
    """Delete a test email from the mailbox by finding it via the tag.

    Searches for the [PP-TEST-{run_id}] tagged email and deletes it
    from the mailbox to keep things clean.
    """
    tag = f"[PP-TEST-{run_id}]"
    mailbox = _get_default_mailbox()
    if not mailbox:
        return {"error": "No mailbox configured."}

    graph = get_graph_client()
    try:
        messages = await graph.list_messages(
            mailbox=mailbox,
            folder="inbox",
            top=10,
            filter_query=f"contains(subject, '{tag}')",
        )
        deleted = 0
        for msg in messages:
            msg_id = msg["id"]
            await graph._request("DELETE", f"https://graph.microsoft.com/v1.0/users/{mailbox}/messages/{msg_id}")
            deleted += 1

        return {"status": "ok", "deleted": deleted, "tag": tag}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@router.delete("/cleanup-suite/{suite_id}")
async def cleanup_suite(suite_id: str):
    """Delete all test emails from a suite run."""
    tag = f"[PP-TEST-{suite_id}"
    mailbox = _get_default_mailbox()
    if not mailbox:
        return {"error": "No mailbox configured."}

    graph = get_graph_client()
    try:
        messages = await graph.list_messages(
            mailbox=mailbox,
            folder="inbox",
            top=50,
            filter_query=f"contains(subject, '[PP-TEST-{suite_id}')",
        )
        deleted = 0
        for msg in messages:
            msg_id = msg["id"]
            await graph._request("DELETE", f"https://graph.microsoft.com/v1.0/users/{mailbox}/messages/{msg_id}")
            deleted += 1

        return {"status": "ok", "deleted": deleted, "suite_id": suite_id}
    except Exception as e:
        return {"status": "error", "error": str(e)}


# --- Helpers ---

def _get_default_mailbox() -> Optional[str]:
    """Return the first monitored mailbox from config."""
    mailboxes = settings.monitored_mailbox_list
    return mailboxes[0] if mailboxes else None
