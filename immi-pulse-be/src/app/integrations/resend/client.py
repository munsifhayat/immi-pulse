"""Resend transactional email client.

Single entry point for outbound mail. Wraps `resend.Emails.send_async` so callers
get a coroutine and don't need to know about the SDK module-level api_key state.
"""

from __future__ import annotations

import logging
from typing import Iterable, Optional

import resend

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_initialized = False


def _ensure_initialized() -> None:
    global _initialized
    if _initialized:
        return
    settings = get_settings()
    if not settings.resend_api_key:
        raise RuntimeError(
            "Resend is not configured. Set RESEND_API_KEY in the environment."
        )
    resend.api_key = settings.resend_api_key
    _initialized = True


def _as_list(value: str | Iterable[str]) -> list[str]:
    if isinstance(value, str):
        return [value]
    return [v for v in value if v]


async def send_email(
    *,
    to: str | Iterable[str],
    subject: str,
    html: str,
    text: Optional[str] = None,
    from_email: Optional[str] = None,
    reply_to: Optional[str] = None,
    cc: Optional[str | Iterable[str]] = None,
    bcc: Optional[str | Iterable[str]] = None,
    tags: Optional[list[dict[str, str]]] = None,
) -> dict:
    """Send a transactional email via Resend. Returns the SDK response dict."""
    _ensure_initialized()
    settings = get_settings()

    params: resend.Emails.SendParams = {
        "from": from_email or settings.resend_from_email,
        "to": _as_list(to),
        "subject": subject,
        "html": html,
    }
    if text:
        params["text"] = text
    effective_reply_to = reply_to or settings.resend_reply_to
    if effective_reply_to:
        params["reply_to"] = effective_reply_to
    if cc:
        params["cc"] = _as_list(cc)
    if bcc:
        params["bcc"] = _as_list(bcc)
    if tags:
        params["tags"] = tags

    response = await resend.Emails.send_async(params)
    logger.info(
        "[resend] sent id=%s to=%s subject=%s",
        response.get("id") if isinstance(response, dict) else response,
        params["to"],
        subject,
    )
    return response
