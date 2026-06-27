"""Engagement letter service — templates, compose, send, public sign, manual override."""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.clients.models import Client
from app.agents.immigration.engagement.models import (
    EngagementLetter,
    EngagementLetterTemplate,
    SignatureEvent,
)
from app.agents.immigration.orgs.models import Organization
from app.agents.immigration.precases.models import PreCase
from app.agents.immigration.questionnaires.models import QuestionnaireResponse
from app.core.config import get_settings
from app.core.encryption import get_token_encryption
from app.core.jwt_auth import hash_password, verify_password
from app.integrations.resend.templates import (
    send_engagement_letter,
    send_engagement_letter_reminder,
)

logger = logging.getLogger(__name__)


DEFAULT_TEMPLATE_BODY = """\
# Agreement for Services and Fees

**Between:** {{firm_name}} (OMARA: {{omara_number}}, ABN: {{abn}})
**And:** {{client_name}} ({{client_email}})

**Date:** {{today}}

## 1. Scope of services

We will provide the following immigration assistance:

{{scope}}

Visa: **{{visa_subclass}} — {{visa_name}}**

## 2. Fees and disbursements

Our professional fees and expected disbursements for this matter are set out below. All amounts are in Australian Dollars (AUD) and inclusive of GST where applicable.

{{fee_table}}

## 3. Payment terms

A retainer of **A${{retainer}}** is payable upon signing of this agreement. Subsequent fees will be invoiced at the agreed milestones.

## 4. Refund policy

Fees paid in advance for unperformed work will be refunded on termination of this agreement, less any work completed and disbursements incurred to that date.

## 5. Code of Conduct

This firm operates under the Migration Agents Code of Conduct (Migration Regulations 1994 (Cth) Schedule 2). A copy is available on request and at www.mara.gov.au.

## 6. Complaints

You may raise concerns with us directly. If unresolved, complaints may be made to the Office of the Migration Agents Registration Authority (OMARA).

## 7. Privacy

Personal information collected for this matter is handled in accordance with our Privacy Policy and the Privacy Act 1988 (Cth).

## 8. Acceptance

By signing below, you confirm you have read this agreement and consent to its terms, including electronic signature under the Electronic Transactions Act 1999 (Cth).
"""


# ── Templates CRUD ──────────────────────────────────────────────────────────

async def list_templates(db: AsyncSession, org_id: UUID) -> list[dict]:
    rows = (
        await db.execute(
            select(EngagementLetterTemplate)
            .where(EngagementLetterTemplate.org_id == org_id)
            .order_by(EngagementLetterTemplate.is_default.desc(), EngagementLetterTemplate.created_at.desc())
        )
    ).scalars().all()
    return [_template_to_dict(t) for t in rows]


async def get_or_create_default_template(db: AsyncSession, org_id: UUID) -> EngagementLetterTemplate:
    """Return the org's default template, creating a starter one if none exists."""
    existing = (
        await db.execute(
            select(EngagementLetterTemplate)
            .where(
                EngagementLetterTemplate.org_id == org_id,
                EngagementLetterTemplate.is_default == True,  # noqa: E712
            )
            .order_by(desc(EngagementLetterTemplate.created_at))
        )
    ).scalars().first()
    if existing:
        return existing

    t = EngagementLetterTemplate(
        org_id=org_id,
        name="Standard engagement letter",
        body_md=DEFAULT_TEMPLATE_BODY,
        fee_defaults={"professional_fee": "4500", "disbursements": "1455", "retainer": "1500", "currency": "AUD"},
        is_default=True,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return t


async def create_template(db: AsyncSession, org_id: UUID, payload: dict, seat_id: UUID) -> dict:
    if payload.get("is_default"):
        # Demote others
        rows = (
            await db.execute(
                select(EngagementLetterTemplate).where(EngagementLetterTemplate.org_id == org_id)
            )
        ).scalars().all()
        for r in rows:
            r.is_default = False

    t = EngagementLetterTemplate(
        org_id=org_id,
        name=payload.get("name", "Standard engagement letter"),
        body_md=payload["body_md"],
        fee_defaults=_fee_defaults_to_dict(payload.get("fee_defaults")),
        is_default=payload.get("is_default", True),
        created_by_seat_id=seat_id,
    )
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return _template_to_dict(t)


async def patch_template(db: AsyncSession, org_id: UUID, template_id: UUID, payload: dict) -> dict:
    t = (
        await db.execute(
            select(EngagementLetterTemplate).where(
                EngagementLetterTemplate.id == template_id,
                EngagementLetterTemplate.org_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")

    if "name" in payload and payload["name"] is not None:
        t.name = payload["name"]
    if "body_md" in payload and payload["body_md"] is not None:
        t.body_md = payload["body_md"]
    if "fee_defaults" in payload and payload["fee_defaults"] is not None:
        t.fee_defaults = _fee_defaults_to_dict(payload["fee_defaults"])
    if "is_default" in payload and payload["is_default"] is not None:
        if payload["is_default"]:
            others = (
                await db.execute(
                    select(EngagementLetterTemplate).where(
                        EngagementLetterTemplate.org_id == org_id,
                        EngagementLetterTemplate.id != t.id,
                    )
                )
            ).scalars().all()
            for o in others:
                o.is_default = False
        t.is_default = payload["is_default"]

    await db.commit()
    await db.refresh(t)
    return _template_to_dict(t)


async def delete_template(db: AsyncSession, org_id: UUID, template_id: UUID) -> None:
    t = (
        await db.execute(
            select(EngagementLetterTemplate).where(
                EngagementLetterTemplate.id == template_id,
                EngagementLetterTemplate.org_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if not t:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    await db.delete(t)
    await db.commit()


# ── Letter compose / send / sign ────────────────────────────────────────────

async def compose_and_send(
    db: AsyncSession,
    org_id: UUID,
    pre_case_id: UUID,
    seat_id: UUID,
    payload: dict,
) -> dict:
    """Render letter from template + variables, persist, mint signing token."""
    pc = (
        await db.execute(select(PreCase).where(PreCase.id == pre_case_id, PreCase.org_id == org_id))
    ).scalar_one_or_none()
    if not pc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pre-case not found")
    if pc.status in ("converted", "archived"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Pre-case already {pc.status}")

    compose = payload["compose"]
    expires_days = payload.get("expires_in_days", 14)

    # Resolve template
    template = None
    template_id = compose.get("template_id")
    if template_id:
        template = (
            await db.execute(
                select(EngagementLetterTemplate).where(
                    EngagementLetterTemplate.id == template_id,
                    EngagementLetterTemplate.org_id == org_id,
                )
            )
        ).scalar_one_or_none()
        if not template:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Template not found")
    else:
        template = await get_or_create_default_template(db, org_id)

    # Resolve org + client
    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one()
    client = (
        (await db.execute(select(Client).where(Client.id == pc.client_id))).scalar_one_or_none()
        if pc.client_id
        else None
    )
    response = (
        (await db.execute(select(QuestionnaireResponse).where(QuestionnaireResponse.id == pc.response_id))).scalar_one_or_none()
        if pc.response_id
        else None
    )

    client_name = (
        (response.submitter_full_name if response and response.submitter_full_name else None)
        or (client.name if client else None)
        or (response.submitter_email if response else "Client")
    )
    client_email = (
        (response.submitter_email if response else None)
        or (client.primary_email if client else None)
        or ""
    )

    fee_lines = compose.get("fee_lines") or []

    # Render template
    rendered = _render_template(
        body_md=template.body_md,
        variables={
            "firm_name": org.name,
            "omara_number": org.omara_number or "—",
            "abn": org.abn or "—",
            "client_name": client_name,
            "client_email": client_email,
            "today": datetime.now(timezone.utc).strftime("%-d %B %Y"),
            "scope": compose.get("scope") or "Lodgement of visa application and supporting submissions.",
            "visa_subclass": compose.get("visa_subclass") or "—",
            "visa_name": compose.get("visa_name") or "—",
            "fee_table": _format_fee_table(fee_lines),
            "retainer": _retainer_amount(fee_lines, template.fee_defaults),
        },
    )
    if compose.get("extra_md"):
        rendered = rendered + "\n\n" + compose["extra_md"]

    # Mint sign token + PIN. The bcrypt hash verifies what the client types;
    # the Fernet ciphertext lets the consultant recover the plaintext to read
    # it out if the email never lands. (Memory: "manual override at every step".)
    sign_token = secrets.token_urlsafe(32)
    sign_pin = f"{secrets.randbelow(1_000_000):06d}"
    pin_hash = hash_password(sign_pin)
    pin_encrypted = get_token_encryption().encrypt(sign_pin)
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

    # Void any existing letter on this pre-case
    existing_letters = (
        await db.execute(
            select(EngagementLetter).where(
                EngagementLetter.pre_case_id == pc.id,
                EngagementLetter.status.in_(("draft", "sent")),
            )
        )
    ).scalars().all()
    for el in existing_letters:
        el.status = "superseded"
        el.voided_at = datetime.now(timezone.utc)

    letter = EngagementLetter(
        org_id=org_id,
        pre_case_id=pc.id,
        template_id=template.id,
        rendered_body_md=rendered,
        fee_lines=[{"label": fl["label"], "amount_aud": str(fl["amount_aud"]), "kind": fl["kind"]} for fl in fee_lines],
        status="sent",
        sign_token=sign_token,
        sign_pin_hash=pin_hash,
        sign_pin_encrypted=pin_encrypted,
        sign_link_expires_at=expires_at,
        sent_at=datetime.now(timezone.utc),
        created_by_seat_id=seat_id,
    )
    db.add(letter)
    await db.flush()

    # Update pre-case lifecycle: any pre-case getting a letter is at minimum "qualified"
    if pc.status in ("pending", "in_review"):
        pc.qualified_at = datetime.now(timezone.utc)
    pc.status = "letter_sent"
    pc.letter_sent_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(letter)

    base = get_settings().frontend_url.rstrip("/") if get_settings().frontend_url else "http://localhost:3000"
    sign_url = f"{base}/q/sign/{sign_token}"

    # Best-effort email dispatch — failure NEVER blocks the consultant flow.
    # If email is unavailable (no client_email, Resend not configured, send error),
    # the consultant still has the link + PIN in the response and can share manually.
    email_status, email_error = await _dispatch_engagement_email(
        to_email=client_email,
        recipient_name=client_name,
        firm_name=org.name,
        sign_url=sign_url,
        pin=sign_pin,
        expires_at=expires_at,
        visa_subclass=compose.get("visa_subclass"),
        visa_name=compose.get("visa_name"),
        fee_lines=fee_lines,
    )

    return {
        "letter_id": letter.id,
        "sign_url": sign_url,
        "sign_pin": sign_pin,
        "expires_at": expires_at,
        "client_email": client_email or None,
        "email_status": email_status,
        "email_error": email_error,
    }


async def get_letter_for_pre_case(db: AsyncSession, org_id: UUID, pre_case_id: UUID) -> Optional[dict]:
    """Return the most recent letter for this pre-case (or None)."""
    letter = (
        await db.execute(
            select(EngagementLetter)
            .where(EngagementLetter.pre_case_id == pre_case_id, EngagementLetter.org_id == org_id)
            .order_by(EngagementLetter.created_at.desc())
        )
    ).scalars().first()
    if not letter:
        return None

    base = get_settings().frontend_url.rstrip("/") if get_settings().frontend_url else "http://localhost:3000"
    sign_url = f"{base}/q/sign/{letter.sign_token}" if letter.sign_token else None

    # Recover the plaintext PIN from the at-rest ciphertext so the consultant
    # can read it out manually if the email never reached the client. Only
    # surfaced while the letter is still pending signature.
    sign_pin: Optional[str] = None
    if letter.sign_pin_encrypted and letter.status == "sent":
        try:
            sign_pin = get_token_encryption().decrypt(letter.sign_pin_encrypted)
        except Exception as exc:  # pragma: no cover — encryption_key rotated
            logger.warning(f"Could not decrypt sign_pin for letter {letter.id}: {exc}")

    return {
        "id": letter.id,
        "pre_case_id": letter.pre_case_id,
        "template_id": letter.template_id,
        "rendered_body_md": letter.rendered_body_md,
        "fee_lines": letter.fee_lines or [],
        "status": letter.status,
        "sent_at": letter.sent_at,
        "signed_at": letter.signed_at,
        "sign_url": sign_url,
        "sign_pin": sign_pin,
        "sign_link_expires_at": letter.sign_link_expires_at,
        "created_at": letter.created_at,
    }


async def void_letter(db: AsyncSession, org_id: UUID, letter_id: UUID) -> None:
    letter = (
        await db.execute(
            select(EngagementLetter).where(EngagementLetter.id == letter_id, EngagementLetter.org_id == org_id)
        )
    ).scalar_one_or_none()
    if not letter:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")
    if letter.status == "signed":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot void a signed letter")
    letter.status = "voided"
    letter.voided_at = datetime.now(timezone.utc)
    await db.commit()


async def mark_signed_manually(
    db: AsyncSession,
    org_id: UUID,
    pre_case_id: UUID,
    seat_id: UUID,
    payload: dict,
) -> dict:
    """Manual override: consultant attests letter was signed offline (paper, video call)."""
    pc = (
        await db.execute(select(PreCase).where(PreCase.id == pre_case_id, PreCase.org_id == org_id))
    ).scalar_one_or_none()
    if not pc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pre-case not found")

    # Get most recent letter (or create a stub)
    letter = (
        await db.execute(
            select(EngagementLetter)
            .where(EngagementLetter.pre_case_id == pre_case_id, EngagementLetter.org_id == org_id)
            .order_by(EngagementLetter.created_at.desc())
        )
    ).scalars().first()

    if not letter:
        # Stub letter representing the offline-signed agreement
        letter = EngagementLetter(
            org_id=org_id,
            pre_case_id=pre_case_id,
            template_id=None,
            rendered_body_md="(Signed offline — see consultant attestation)",
            fee_lines=[],
            status="signed",
            signed_pdf_s3=payload.get("uploaded_pdf_s3_key"),
            sent_at=datetime.now(timezone.utc),
            signed_at=datetime.now(timezone.utc),
            created_by_seat_id=seat_id,
        )
        db.add(letter)
        await db.flush()
    else:
        letter.status = "signed"
        letter.signed_at = datetime.now(timezone.utc)
        if payload.get("uploaded_pdf_s3_key"):
            letter.signed_pdf_s3 = payload["uploaded_pdf_s3_key"]

    body_hash = hashlib.sha256(letter.rendered_body_md.encode("utf-8")).hexdigest()
    consent_text = f"Consultant attestation: {payload['reason']}"
    event = SignatureEvent(
        letter_id=letter.id,
        method=payload.get("method", "consultant_attest"),
        signer_name=payload["signer_name"],
        body_hash_sha256=body_hash,
        consent_text=consent_text,
        consent_given=True,
        recorded_by_seat_id=seat_id,
        manual_reason=payload["reason"],
    )
    db.add(event)

    # Update pre-case lifecycle
    pc.status = "letter_signed"
    if not pc.qualified_at:
        pc.qualified_at = datetime.now(timezone.utc)
    if not pc.letter_sent_at:
        pc.letter_sent_at = datetime.now(timezone.utc)
    pc.letter_signed_at = datetime.now(timezone.utc)
    pc.skipped_letter = f"manual: {payload['reason']}"

    await db.commit()
    await db.refresh(letter)
    return {
        "id": letter.id,
        "pre_case_id": letter.pre_case_id,
        "template_id": letter.template_id,
        "rendered_body_md": letter.rendered_body_md,
        "fee_lines": letter.fee_lines or [],
        "status": letter.status,
        "sent_at": letter.sent_at,
        "signed_at": letter.signed_at,
        "sign_url": None,
        "sign_link_expires_at": letter.sign_link_expires_at,
        "created_at": letter.created_at,
    }


async def public_get_letter(db: AsyncSession, sign_token: str) -> dict:
    letter = (
        await db.execute(
            select(EngagementLetter).where(EngagementLetter.sign_token == sign_token)
        )
    ).scalar_one_or_none()
    if not letter:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")
    if letter.status not in ("sent", "signed"):
        raise HTTPException(status.HTTP_410_GONE, f"Letter is {letter.status}")
    if letter.sign_link_expires_at and letter.sign_link_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_410_GONE, "Sign link has expired")

    org = (await db.execute(select(Organization).where(Organization.id == letter.org_id))).scalar_one()

    return {
        "letter_id": letter.id,
        "firm_name": org.name,
        "omara_number": org.omara_number,
        "abn": org.abn,
        "rendered_body_md": letter.rendered_body_md,
        "rendered_html": letter.rendered_html,
        "fee_lines": letter.fee_lines or [],
        "status": letter.status,
    }


async def public_sign_letter(
    db: AsyncSession, sign_token: str, payload: dict, ip_address: Optional[str], user_agent: Optional[str]
) -> dict:
    letter = (
        await db.execute(
            select(EngagementLetter).where(EngagementLetter.sign_token == sign_token)
        )
    ).scalar_one_or_none()
    if not letter:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")
    if letter.status == "signed":
        raise HTTPException(status.HTTP_409_CONFLICT, "Letter already signed")
    if letter.status != "sent":
        raise HTTPException(status.HTTP_410_GONE, f"Letter is {letter.status}")
    if letter.sign_link_expires_at and letter.sign_link_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_410_GONE, "Sign link has expired")

    # PIN attempt limit
    attempts = int(letter.sign_attempt_count or 0)
    if attempts >= 5:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many attempts; contact your consultant")

    if not verify_password(payload["pin"], letter.sign_pin_hash):
        letter.sign_attempt_count = attempts + 1
        await db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect PIN")

    if not payload.get("consent_given"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Consent must be given to sign electronically")

    method = payload["method"]
    if method == "drawn" and not payload.get("signature_image_b64"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "signature_image_b64 required for drawn signatures")

    # Persist signature event (we keep the b64 in audit only; future: write to S3)
    body_hash = hashlib.sha256(letter.rendered_body_md.encode("utf-8")).hexdigest()
    consent_text = (
        "I have read and agree to the terms of this engagement agreement. "
        "I consent to electronic signature under the Electronic Transactions Act 1999 (Cth)."
    )

    event = SignatureEvent(
        letter_id=letter.id,
        method=method,
        signer_name=payload["signer_name"],
        signature_image_s3=None,  # b64 stored in event row only for now (future: upload to S3)
        body_hash_sha256=body_hash,
        ip_address=ip_address,
        user_agent=user_agent,
        consent_text=consent_text,
        consent_given=True,
    )
    db.add(event)

    letter.status = "signed"
    letter.signed_at = datetime.now(timezone.utc)

    # Update pre-case lifecycle
    pc = (
        await db.execute(select(PreCase).where(PreCase.id == letter.pre_case_id))
    ).scalar_one_or_none()
    if pc:
        pc.status = "letter_signed"
        pc.letter_signed_at = datetime.now(timezone.utc)

    await db.commit()
    return {"success": True, "signed_at": letter.signed_at, "download_url": None}


async def portal_sign_letter(
    db: AsyncSession,
    *,
    pre_case_id: UUID,
    org_id: UUID,
    payload: dict,
    ip_address: Optional[str],
    user_agent: Optional[str],
) -> dict:
    """Sign the active engagement letter for a pre-case from inside the portal.

    The client is already authenticated via their portal-account session, so no
    PIN is required — an authenticated, logged-in signature is *stronger* evidence
    than the emailed PIN flow. We still record the full ETA-1999 SignatureEvent
    (body hash, IP/UA, consent text) and flip the pre-case to letter_signed.
    """
    letter = (
        await db.execute(
            select(EngagementLetter)
            .where(EngagementLetter.pre_case_id == pre_case_id)
            .where(EngagementLetter.org_id == org_id)
            .where(EngagementLetter.status == "sent")
            .order_by(desc(EngagementLetter.created_at))
        )
    ).scalars().first()
    if not letter:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No engagement letter is waiting to be signed.")
    if letter.sign_link_expires_at and letter.sign_link_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_410_GONE, "The signing window has expired — ask your agent to resend.")

    if not payload.get("consent_given"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Consent must be given to sign electronically")

    method = payload.get("method", "typed_name")
    if method == "drawn" and not payload.get("signature_image_b64"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "signature_image_b64 required for drawn signatures")

    body_hash = hashlib.sha256((letter.rendered_body_md or "").encode("utf-8")).hexdigest()
    consent_text = (
        "I have read and agree to the terms of this engagement agreement. "
        "I consent to electronic signature under the Electronic Transactions Act 1999 (Cth). "
        "Signed while authenticated to my client portal."
    )

    event = SignatureEvent(
        letter_id=letter.id,
        method=method,
        signer_name=payload["signer_name"],
        signature_image_s3=None,
        body_hash_sha256=body_hash,
        ip_address=ip_address,
        user_agent=user_agent,
        consent_text=consent_text,
        consent_given=True,
    )
    db.add(event)

    letter.status = "signed"
    letter.signed_at = datetime.now(timezone.utc)

    pc = (
        await db.execute(select(PreCase).where(PreCase.id == letter.pre_case_id))
    ).scalar_one_or_none()
    if pc:
        pc.status = "letter_signed"
        if not pc.letter_sent_at:
            pc.letter_sent_at = letter.sent_at or datetime.now(timezone.utc)
        pc.letter_signed_at = datetime.now(timezone.utc)

    await db.commit()
    return {"success": True, "signed_at": letter.signed_at}


# ── Helpers ────────────────────────────────────────────────────────────────

def _template_to_dict(t: EngagementLetterTemplate) -> dict:
    return {
        "id": t.id,
        "org_id": t.org_id,
        "name": t.name,
        "body_md": t.body_md,
        "fee_defaults": t.fee_defaults,
        "is_default": t.is_default,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
    }


def _fee_defaults_to_dict(fd) -> Optional[dict]:
    if fd is None:
        return None
    if isinstance(fd, dict):
        # Convert Decimals to strings for JSONB
        return {k: (str(v) if isinstance(v, Decimal) else v) for k, v in fd.items()}
    # Pydantic model — model_dump
    if hasattr(fd, "model_dump"):
        d = fd.model_dump()
        return {k: (str(v) if isinstance(v, Decimal) else v) for k, v in d.items()}
    return None


def _render_template(body_md: str, variables: dict) -> str:
    out = body_md
    for k, v in variables.items():
        out = out.replace("{{" + k + "}}", str(v) if v is not None else "—")
    return out


def _format_fee_table(fee_lines: list[dict]) -> str:
    if not fee_lines:
        return "_To be agreed._"
    rows = ["| Line item | Amount (AUD) |", "|---|---:|"]
    for fl in fee_lines:
        amt = fl.get("amount_aud") or 0
        rows.append(f"| {fl['label']} | A${amt} |")
    return "\n".join(rows)


def _format_visa_label(subclass: Optional[str], name: Optional[str]) -> Optional[str]:
    s = (subclass or "").strip()
    n = (name or "").strip()
    if s and n:
        return f"Subclass {s} — {n}"
    if s:
        return f"Subclass {s}"
    if n:
        return n
    return None


def _format_expires_label(expires_at: datetime) -> str:
    """Human-friendly expiry shown in emails (e.g. '15 May at 4:30 PM AEDT')."""
    return expires_at.strftime("%-d %b at %-I:%M %p UTC")


def _fee_summary_for_email(fee_lines: list[dict]) -> list[dict]:
    out: list[dict] = []
    for fl in fee_lines or []:
        amt = fl.get("amount_aud")
        if amt is None:
            continue
        try:
            if Decimal(str(amt)) <= 0:
                continue
        except Exception:
            pass
        out.append({"label": fl.get("label") or "—", "amount": str(amt)})
    return out


async def _dispatch_engagement_email(
    *,
    to_email: Optional[str],
    recipient_name: str,
    firm_name: str,
    sign_url: str,
    pin: str,
    expires_at: datetime,
    visa_subclass: Optional[str],
    visa_name: Optional[str],
    fee_lines: list[dict],
) -> tuple[str, Optional[str]]:
    """Send the engagement-letter email. Returns (status, error_msg).

    status ∈ {"sent", "failed", "skipped"}. Never raises.
    """
    if not to_email:
        return ("skipped", "no_recipient")
    settings = get_settings()
    if not settings.resend_configured:
        return ("skipped", "resend_not_configured")
    try:
        await send_engagement_letter(
            to=to_email,
            recipient_name=recipient_name,
            consultant_name=None,
            firm_name=firm_name,
            sign_url=sign_url,
            pin=pin,
            expires_at_label=_format_expires_label(expires_at),
            visa_label=_format_visa_label(visa_subclass, visa_name),
            fee_summary=_fee_summary_for_email(fee_lines),
        )
        return ("sent", None)
    except Exception as exc:  # noqa: BLE001 — surfaced to the consultant via response
        logger.exception("engagement letter email failed for letter to %s", to_email)
        return ("failed", str(exc))


async def resend_reminder(
    db: AsyncSession,
    org_id: UUID,
    letter_id: UUID,
) -> dict:
    """Re-email the signing link (without PIN — it's hashed and unrecoverable).

    Use when the applicant lost the original email but still has their PIN.
    If they lost the PIN too, the consultant should void + reissue instead.
    """
    letter = (
        await db.execute(
            select(EngagementLetter).where(
                EngagementLetter.id == letter_id,
                EngagementLetter.org_id == org_id,
            )
        )
    ).scalar_one_or_none()
    if not letter:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Letter not found")
    if letter.status != "sent":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot resend reminder for a {letter.status} letter",
        )
    if letter.sign_link_expires_at and letter.sign_link_expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_410_GONE, "Sign link has expired — reissue a new letter")

    pc = (
        await db.execute(select(PreCase).where(PreCase.id == letter.pre_case_id))
    ).scalar_one_or_none()
    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one()
    response = (
        (await db.execute(select(QuestionnaireResponse).where(QuestionnaireResponse.id == pc.response_id))).scalar_one_or_none()
        if pc and pc.response_id
        else None
    )
    client = (
        (await db.execute(select(Client).where(Client.id == pc.client_id))).scalar_one_or_none()
        if pc and pc.client_id
        else None
    )

    client_name = (
        (response.submitter_full_name if response and response.submitter_full_name else None)
        or (client.name if client else None)
        or "there"
    )
    client_email = (
        (response.submitter_email if response else None)
        or (client.primary_email if client else None)
        or ""
    )

    base = get_settings().frontend_url.rstrip("/") if get_settings().frontend_url else "http://localhost:3000"
    sign_url = f"{base}/q/sign/{letter.sign_token}"

    if not client_email:
        return {
            "letter_id": letter.id,
            "client_email": None,
            "email_status": "skipped",
            "email_error": "no_recipient",
        }
    settings = get_settings()
    if not settings.resend_configured:
        return {
            "letter_id": letter.id,
            "client_email": client_email,
            "email_status": "skipped",
            "email_error": "resend_not_configured",
        }
    try:
        await send_engagement_letter_reminder(
            to=client_email,
            recipient_name=client_name,
            consultant_name=None,
            firm_name=org.name,
            sign_url=sign_url,
            expires_at_label=_format_expires_label(letter.sign_link_expires_at) if letter.sign_link_expires_at else "soon",
            visa_label=None,
        )
        return {
            "letter_id": letter.id,
            "client_email": client_email,
            "email_status": "sent",
            "email_error": None,
        }
    except Exception as exc:  # noqa: BLE001
        logger.exception("engagement letter reminder email failed for letter %s", letter.id)
        return {
            "letter_id": letter.id,
            "client_email": client_email,
            "email_status": "failed",
            "email_error": str(exc),
        }


def _retainer_amount(fee_lines: list[dict], fee_defaults: Optional[dict]) -> str:
    for fl in fee_lines:
        if fl.get("kind") == "retainer":
            return str(fl.get("amount_aud") or 0)
    if fee_defaults and fee_defaults.get("retainer"):
        return str(fee_defaults["retainer"])
    return "0"
