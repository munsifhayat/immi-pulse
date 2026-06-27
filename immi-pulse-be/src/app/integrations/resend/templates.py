"""Email template rendering + high-level send helpers.

Each helper renders a brand-consistent IMMI-PULSE template via Jinja2 and dispatches
through `send_email`. Callers should reach for these — not raw HTML — so the look
stays consistent and copy changes happen in one place.
"""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.integrations.resend.client import send_email

_TEMPLATES_DIR = Path(__file__).parent / "templates"
_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
    trim_blocks=True,
    lstrip_blocks=True,
)


def render(name: str, **context) -> str:
    """Render a template by filename. `year` defaults to current year."""
    context.setdefault("year", datetime.utcnow().year)
    return _env.get_template(name).render(**context)


# --- High-level helpers ---------------------------------------------------

async def send_welcome(
    *,
    to: str,
    recipient_name: str,
    dashboard_url: str,
    support_email: str = "support@immi-pulse.com",
    subject: Optional[str] = None,
) -> dict:
    first = recipient_name.split()[0] if recipient_name else "there"
    html = render(
        "welcome.html",
        recipient_name=recipient_name,
        dashboard_url=dashboard_url,
        support_email=support_email,
    )
    return await send_email(
        to=to,
        subject=subject or f"Welcome to IMMI-PULSE, {first}",
        html=html,
        tags=[{"name": "template", "value": "welcome"}],
    )


async def send_client_portal_welcome(
    *,
    to: str,
    recipient_name: str,
    firm_name: str,
    portal_url: str,
    login_email: str,
    temp_password: Optional[str] = None,
    support_email: str = "support@immi-pulse.com",
    subject: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> dict:
    """Welcome the client to their persistent portal account (created at qualify).

    `temp_password` is the one-time plaintext to include; omit on a plain re-share
    once the client has set their own password.
    """
    html = render(
        "welcome_client.html",
        recipient_name=recipient_name,
        firm_name=firm_name,
        portal_url=portal_url,
        login_email=login_email,
        temp_password=temp_password,
        support_email=support_email,
    )
    return await send_email(
        to=to,
        subject=subject or f"Your client portal is ready — {firm_name}",
        html=html,
        reply_to=reply_to,
        tags=[{"name": "template", "value": "welcome_client"}],
    )


async def send_upload_link(
    *,
    to: str,
    recipient_name: str,
    consultant_name: str,
    firm_name: str,
    upload_url: str,
    pin: str,
    expires_at_label: str,
    support_email: str = "support@immi-pulse.com",
    subject: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> dict:
    """Secure document upload link with one-time PIN.

    `expires_at_label` is a pre-formatted human string (e.g. "Mar 12 at 3:45 PM AEDT").
    Format upstream so the email never has to guess at locale/timezone.
    """
    html = render(
        "upload_link.html",
        recipient_name=recipient_name,
        consultant_name=consultant_name,
        firm_name=firm_name,
        upload_url=upload_url,
        pin=pin,
        expires_at_label=expires_at_label,
        support_email=support_email,
    )
    return await send_email(
        to=to,
        subject=subject or f"Documents requested — {firm_name}",
        html=html,
        reply_to=reply_to,
        tags=[{"name": "template", "value": "upload_link"}],
    )


async def send_engagement_letter(
    *,
    to: str,
    recipient_name: str,
    consultant_name: Optional[str],
    firm_name: str,
    sign_url: str,
    pin: str,
    expires_at_label: str,
    visa_label: Optional[str] = None,
    fee_summary: Optional[list[dict]] = None,
    support_email: str = "support@immi-pulse.com",
    subject: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> dict:
    """Engagement letter signing link with one-time PIN.

    `fee_summary` is a list of `{"label": str, "amount": str}` for the inline fee block.
    `visa_label` is a free-form display string (e.g. "Subclass 482 — TSS work visa").
    `expires_at_label` is pre-formatted upstream (e.g. "Mar 12 at 3:45 PM AEDT").
    """
    html = render(
        "engagement_letter.html",
        recipient_name=recipient_name,
        consultant_name=consultant_name,
        firm_name=firm_name,
        sign_url=sign_url,
        pin=pin,
        expires_at_label=expires_at_label,
        visa_label=visa_label,
        fee_summary=fee_summary or [],
        support_email=support_email,
    )
    return await send_email(
        to=to,
        subject=subject or f"Engagement letter to sign — {firm_name}",
        html=html,
        reply_to=reply_to,
        tags=[{"name": "template", "value": "engagement_letter"}],
    )


async def send_engagement_letter_reminder(
    *,
    to: str,
    recipient_name: str,
    consultant_name: Optional[str],
    firm_name: str,
    sign_url: str,
    expires_at_label: str,
    visa_label: Optional[str] = None,
    support_email: str = "support@immi-pulse.com",
    subject: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> dict:
    """Reminder email — re-shares the signing link without exposing the PIN.

    The applicant still needs the PIN they received in the original email
    (or from their consultant out-of-band). We never store the PIN in plaintext,
    so a reminder cannot include it.
    """
    visa_line = f" for the <strong>{visa_label}</strong>" if visa_label else ""
    body_html = (
        f"This is a friendly reminder that your engagement agreement{visa_line} is still waiting "
        f"for your signature. Use the same one-time PIN {consultant_name or firm_name} sent you "
        f"earlier — if you can&rsquo;t find it, just reply and we&rsquo;ll resend a fresh letter."
        f"<br/><br/>The signing link expires {expires_at_label}."
    )
    return await send_generic(
        to=to,
        subject=subject or f"Reminder: engagement letter to sign — {firm_name}",
        eyebrow_text="Reminder",
        headline=f"Your engagement letter from {firm_name} is still waiting",
        body_html=body_html,
        recipient_name=recipient_name,
        cta_label="Review and sign",
        cta_url=sign_url,
        signoff=consultant_name or firm_name,
        preheader=f"Your engagement letter is waiting for your signature. Link expires {expires_at_label}.",
        support_email=support_email,
        reply_to=reply_to,
    )


async def send_generic(
    *,
    to: str,
    subject: str,
    headline: str,
    body_html: str,
    eyebrow_text: Optional[str] = None,
    recipient_name: Optional[str] = None,
    cta_label: Optional[str] = None,
    cta_url: Optional[str] = None,
    signoff: Optional[str] = None,
    preheader: Optional[str] = None,
    support_email: str = "support@immi-pulse.com",
    reply_to: Optional[str] = None,
) -> dict:
    """Flexible notification template.

    `body_html` is rendered with the `safe` filter — the caller owns escaping.
    Pass plain text or pre-sanitized HTML; never user-controlled markup.
    """
    html = render(
        "generic.html",
        eyebrow_text=eyebrow_text,
        headline=headline,
        body_html=body_html,
        recipient_name=recipient_name,
        cta_label=cta_label,
        cta_url=cta_url,
        signoff=signoff,
        preheader=preheader,
        support_email=support_email,
    )
    return await send_email(
        to=to,
        subject=subject,
        html=html,
        reply_to=reply_to,
        tags=[{"name": "template", "value": "generic"}],
    )
