"""Client portal service.

Owns: account issuance (at qualify) with per-(org,email) dedup, credential
re-share/regeneration for the consultant card, client auth (login / set-password /
forgot), and assembly of the client's "applications" (qualified+ pre-cases merged
with their promoted case) for the portal dashboard.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.immigration.cases.models import Case
from app.agents.immigration.cases.service import CaseService
from app.agents.immigration.clients.models import Client, ClientPortalAccount
from app.agents.immigration.engagement.models import EngagementLetter
from app.agents.immigration.orgs.models import Organization
from app.agents.immigration.portal import auth as portal_auth
from app.agents.immigration.portal import schemas as S
from app.agents.immigration.precases.models import PreCase
from app.core.config import get_settings
from app.core.jwt_auth import hash_password, verify_password
from app.core.password_policy import assert_password_acceptable
from app.integrations.resend import templates as email_templates

logger = logging.getLogger(__name__)

# Pre-case statuses that surface as a portal "application" (qualified onwards).
PORTAL_VISIBLE_PRECASE_STATUSES = (
    "qualified",
    "letter_sent",
    "letter_signed",
    "paid",
    "converted",
)

_STEP_TOTAL = 7
_CASE_STAGE_STEP = {
    "inquiry": 5,
    "consultation": 5,
    "visa_pathway": 5,
    "checklist": 5,
    "document_collection": 5,
    "document_review": 6,
    "application_prep": 6,
    "lodgement": 7,
    "post_lodgement": 7,
    "decision": 7,
}
_CASE_STAGE_LABEL = {
    "inquiry": "Getting started",
    "consultation": "Consultation",
    "visa_pathway": "Confirming your visa pathway",
    "checklist": "Preparing your checklist",
    "document_collection": "Document collection",
    "document_review": "Document review",
    "application_prep": "Preparing your application",
    "lodgement": "Lodged — awaiting decision",
    "post_lodgement": "Lodged — awaiting decision",
    "decision": "Decision",
}


# ── Org / URL helpers ────────────────────────────────────────────────────────


def portal_path(org_slug: str) -> str:
    return f"/portal/{org_slug}"


def portal_url(org_slug: str) -> str:
    base = get_settings().frontend_url.rstrip("/")
    return f"{base}{portal_path(org_slug)}"


def _share_message(first_name: str, url: str, email: str, temp_password: Optional[str]) -> str:
    name = first_name or "there"
    if temp_password:
        return (
            f"Hi {name}, here's your secure client portal: {url}\n"
            f"Email: {email}\n"
            f"Temporary password: {temp_password}\n"
            f"You'll set your own password on first login."
        )
    return (
        f"Hi {name}, here's your secure client portal: {url}\n"
        f"Email: {email}\n"
        f"Sign in with the password you set."
    )


async def ensure_account_slug(db: AsyncSession, org: Organization) -> str:
    """Ensure the org has a portal slug (generating one if absent). Does not commit."""
    return await portal_auth.ensure_portal_slug(db, org)


async def get_org_by_slug(db: AsyncSession, org_slug: str) -> Organization:
    org = (
        await db.execute(select(Organization).where(Organization.portal_slug == org_slug))
    ).scalar_one_or_none()
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Portal not found")
    return org


# ── Account issuance (called at qualify) ─────────────────────────────────────


async def create_or_get_account(
    db: AsyncSession,
    *,
    org: Organization,
    client_id: UUID,
    email: str,
) -> tuple[ClientPortalAccount, bool]:
    """Idempotent per (org, email). Creates with a temp password on first call;
    reuses the existing account otherwise. Does NOT commit (caller owns the txn).

    Returns (account, created) — `created` is True only on first issuance, so the
    caller knows whether to send the welcome email.
    """
    email = email.lower().strip()
    account = (
        await db.execute(
            select(ClientPortalAccount).where(
                ClientPortalAccount.org_id == org.id,
                ClientPortalAccount.email == email,
            )
        )
    ).scalar_one_or_none()
    if account is not None:
        # Keep CRM link fresh, but never overwrite an existing credential.
        if account.client_id != client_id:
            account.client_id = client_id
        return account, False

    temp = portal_auth.generate_temp_password()
    account = ClientPortalAccount(
        org_id=org.id,
        client_id=client_id,
        email=email,
        password_hash=hash_password(temp),
        temp_password_encrypted=portal_auth.encrypt_temp_password(temp),
        status="invited",
        must_reset=True,
    )
    db.add(account)
    await db.flush()
    return account, True


async def account_for_client(
    db: AsyncSession, org_id: UUID, client_id: UUID
) -> Optional[ClientPortalAccount]:
    return (
        await db.execute(
            select(ClientPortalAccount).where(
                ClientPortalAccount.org_id == org_id,
                ClientPortalAccount.client_id == client_id,
            )
        )
    ).scalars().first()


async def access_for_client(
    db: AsyncSession, org: Organization, client_id: Optional[UUID]
) -> Optional[S.ClientAccessOut]:
    """Build the consultant 'Client access' card for a client, or None if no account."""
    if client_id is None:
        return None
    account = await account_for_client(db, org.id, client_id)
    if account is None:
        return None
    client = (await db.execute(select(Client).where(Client.id == client_id))).scalar_one_or_none()
    return await build_client_access(db, org, account, client_name=client.name if client else None)


async def regenerate_password(db: AsyncSession, account: ClientPortalAccount) -> str:
    """Issue a fresh temporary password (manual override). Returns plaintext once."""
    temp = portal_auth.generate_temp_password()
    account.password_hash = hash_password(temp)
    account.temp_password_encrypted = portal_auth.encrypt_temp_password(temp)
    account.status = "invited"
    account.must_reset = True
    account.failed_login_count = 0
    await db.flush()
    return temp


def current_temp_password(account: ClientPortalAccount) -> Optional[str]:
    """The unredeemed temp password, if the client hasn't set their own yet."""
    if not account.must_reset:
        return None
    return portal_auth.decrypt_temp_password(account.temp_password_encrypted)


async def build_client_access(
    db: AsyncSession, org: Organization, account: ClientPortalAccount, *, client_name: Optional[str] = None
) -> S.ClientAccessOut:
    slug = await portal_auth.ensure_portal_slug(db, org)
    url = portal_url(slug)
    temp = current_temp_password(account)
    first = (client_name or "").split()[0] if client_name else ""
    return S.ClientAccessOut(
        account_id=account.id,
        client_id=account.client_id,
        email=account.email,
        temp_password=temp,
        status=account.status,
        must_reset=account.must_reset,
        last_login_at=account.last_login_at,
        portal_path=portal_path(slug),
        portal_url=url,
        share_message=_share_message(first, url, account.email, temp),
    )


async def send_welcome_email(
    *,
    org: Organization,
    account: ClientPortalAccount,
    temp_password: Optional[str],
    client_name: Optional[str],
    org_slug: str,
) -> bool:
    """Best-effort branded welcome with portal link + temp password. Never raises."""
    settings = get_settings()
    if not settings.resend_configured:
        logger.info("[portal] Resend not configured; skipping welcome email to %s", account.email)
        return False
    try:
        await email_templates.send_client_portal_welcome(
            to=account.email,
            recipient_name=client_name or account.email,
            firm_name=org.name,
            portal_url=portal_url(org_slug),
            login_email=account.email,
            temp_password=temp_password,
        )
        return True
    except Exception as err:  # pragma: no cover - external dependency
        logger.warning("[portal] welcome email to %s failed: %s", account.email, err)
        return False


# ── Client auth ──────────────────────────────────────────────────────────────


def _client_name_for(account: ClientPortalAccount, client: Optional[Client]) -> Optional[str]:
    return (client.name if client and client.name else None)


async def login(db: AsyncSession, org_slug: str, email: str, password: str) -> S.PortalLoginResponse:
    settings = get_settings()
    org = await get_org_by_slug(db, org_slug)
    email = email.lower().strip()
    account = (
        await db.execute(
            select(ClientPortalAccount).where(
                ClientPortalAccount.org_id == org.id,
                ClientPortalAccount.email == email,
            )
        )
    ).scalar_one_or_none()

    # Uniform failure to avoid leaking which emails exist.
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password.")
    if account is None:
        raise invalid
    if account.status == "disabled":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been disabled.")
    if account.failed_login_count >= settings.portal_account_max_login_attempts:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many attempts. Ask your agent to reset your access, or use 'Forgot password'.",
        )
    if not verify_password(password, account.password_hash):
        account.failed_login_count = (account.failed_login_count or 0) + 1
        await db.commit()
        raise invalid

    account.failed_login_count = 0
    account.last_login_at = datetime.now(timezone.utc)
    if account.status == "invited" and not account.must_reset:
        account.status = "active"
    token, exp = portal_auth.issue_account_session_jwt(account)
    await db.commit()

    client = (
        await db.execute(select(Client).where(Client.id == account.client_id))
    ).scalar_one_or_none()
    return S.PortalLoginResponse(
        access_token=token,
        expires_at=exp,
        must_reset=account.must_reset,
        account=S.PortalMeOut(
            account_id=account.id,
            email=account.email,
            name=_client_name_for(account, client),
            status=account.status,
            must_reset=account.must_reset,
            firm_name=org.name,
            org_slug=org_slug,
        ),
    )


async def set_password(db: AsyncSession, account: ClientPortalAccount, new_password: str) -> None:
    client = (
        await db.execute(select(Client).where(Client.id == account.client_id))
    ).scalar_one_or_none()
    compare = [account.email.split("@")[0]]
    if client and client.name:
        compare.append(client.name)
    try:
        await assert_password_acceptable(new_password, also_compare=compare)
    except Exception as err:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(err))

    account.password_hash = hash_password(new_password)
    account.temp_password_encrypted = None
    account.must_reset = False
    account.status = "active"
    account.failed_login_count = 0
    await db.commit()


async def forgot_password(db: AsyncSession, org_slug: str, email: str) -> None:
    """Always succeeds from the caller's view. If the account exists, issue a fresh
    temp password and email it (manual-override-friendly, no reset-token table)."""
    org = await get_org_by_slug(db, org_slug)
    email = email.lower().strip()
    account = (
        await db.execute(
            select(ClientPortalAccount).where(
                ClientPortalAccount.org_id == org.id,
                ClientPortalAccount.email == email,
            )
        )
    ).scalar_one_or_none()
    if account is None or account.status == "disabled":
        return
    temp = await regenerate_password(db, account)
    client = (
        await db.execute(select(Client).where(Client.id == account.client_id))
    ).scalar_one_or_none()
    await db.commit()
    slug = await portal_auth.ensure_portal_slug(db, org)
    await send_welcome_email(
        org=org,
        account=account,
        temp_password=temp,
        client_name=client.name if client else None,
        org_slug=slug,
    )


async def me(db: AsyncSession, account: ClientPortalAccount) -> S.PortalMeOut:
    org = (
        await db.execute(select(Organization).where(Organization.id == account.org_id))
    ).scalar_one()
    client = (
        await db.execute(select(Client).where(Client.id == account.client_id))
    ).scalar_one_or_none()
    slug = await portal_auth.ensure_portal_slug(db, org)
    await db.commit()
    return S.PortalMeOut(
        account_id=account.id,
        email=account.email,
        name=_client_name_for(account, client),
        status=account.status,
        must_reset=account.must_reset,
        firm_name=org.name,
        org_slug=slug,
    )


# ── Applications assembly ────────────────────────────────────────────────────


def _visa_interest(pc: PreCase) -> Optional[str]:
    if pc.ai_extracted and isinstance(pc.ai_extracted, dict):
        return pc.ai_extracted.get("visa_interest") or pc.ai_extracted.get("visa_subclass")
    return None


def _app_progress(pc: PreCase, case: Optional[Case]) -> tuple[int, str, bool]:
    """Return (step_index, stage_label, is_complete) on the unified 7-step ladder."""
    if case is not None:
        stage = case.stage or "consultation"
        return (
            _CASE_STAGE_STEP.get(stage, 5),
            _CASE_STAGE_LABEL.get(stage, "In progress"),
            stage == "decision",
        )
    mapping = {
        "qualified": (1, "Qualified — welcome aboard"),
        "letter_sent": (2, "Awaiting your signature"),
        "letter_signed": (3, "Agreement signed"),
        "paid": (4, "Deposit received"),
    }
    step, label = mapping.get(pc.status, (1, "In progress"))
    return step, label, False


async def _active_letter(db: AsyncSession, pre_case_id: UUID) -> Optional[EngagementLetter]:
    rows = (
        await db.execute(
            select(EngagementLetter)
            .where(EngagementLetter.pre_case_id == pre_case_id)
            .where(EngagementLetter.status.in_(("sent", "signed")))
            .order_by(EngagementLetter.created_at.desc())
        )
    ).scalars().all()
    return rows[0] if rows else None


async def _list_visible_precases(db: AsyncSession, account: ClientPortalAccount) -> list[PreCase]:
    rows = (
        await db.execute(
            select(PreCase)
            .where(PreCase.org_id == account.org_id)
            .where(PreCase.client_id == account.client_id)
            .where(PreCase.status.in_(PORTAL_VISIBLE_PRECASE_STATUSES))
            .order_by(PreCase.created_at.desc())
        )
    ).scalars().all()
    return list(rows)


async def list_applications(db: AsyncSession, account: ClientPortalAccount) -> list[S.PortalApplicationSummary]:
    precases = await _list_visible_precases(db, account)
    out: list[S.PortalApplicationSummary] = []
    for pc in precases:
        case = None
        if pc.promoted_case_id:
            case = (
                await db.execute(select(Case).where(Case.id == pc.promoted_case_id))
            ).scalar_one_or_none()
        out.append(await _summary(db, pc, case))
    return out


async def _needs_count(db: AsyncSession, pc: PreCase, case: Optional[Case], letter: Optional[EngagementLetter]) -> int:
    count = 0
    if letter is not None and letter.status == "sent":
        count += 1
    if case is not None:
        checklist = (case.metadata_json or {}).get("checklist") or []
        pending_required = [
            it for it in checklist
            if it.get("required") and it.get("status") in (None, "pending")
        ]
        if pending_required:
            count += 1
    return count


async def _summary(db: AsyncSession, pc: PreCase, case: Optional[Case]) -> S.PortalApplicationSummary:
    step, stage_label, is_complete = _app_progress(pc, case)
    letter = await _active_letter(db, pc.id)
    needs = await _needs_count(db, pc, case, letter)
    subclass = (case.visa_subclass if case else None) or _visa_interest(pc)
    visa_name = (case.visa_name if case else None)
    title = visa_name or (f"Subclass {subclass}" if subclass else "Immigration matter")
    pct = 100 if is_complete else min(100, round(step / _STEP_TOTAL * 100))
    return S.PortalApplicationSummary(
        application_id=pc.id,
        case_id=case.id if case else None,
        title=title,
        subclass=subclass,
        stage_label=stage_label,
        status=("case:" + case.stage) if case else pc.status,
        progress_pct=pct,
        step_index=step,
        step_total=_STEP_TOTAL,
        needs_count=needs,
        is_complete=is_complete,
        updated_at=(case.updated_at if case else pc.updated_at),
    )


async def get_application_detail(
    db: AsyncSession, account: ClientPortalAccount, application_id: UUID
) -> S.PortalApplicationDetail:
    pc = (
        await db.execute(
            select(PreCase).where(
                PreCase.id == application_id,
                PreCase.org_id == account.org_id,
                PreCase.client_id == account.client_id,
            )
        )
    ).scalar_one_or_none()
    if pc is None or pc.status not in PORTAL_VISIBLE_PRECASE_STATUSES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")

    case = None
    if pc.promoted_case_id:
        case = (await db.execute(select(Case).where(Case.id == pc.promoted_case_id))).scalar_one_or_none()

    org = (await db.execute(select(Organization).where(Organization.id == account.org_id))).scalar_one()

    summary = await _summary(db, pc, case)
    letter = await _active_letter(db, pc.id)

    # ── Letter ──
    letter_info: Optional[S.PortalLetterInfo] = None
    if letter is not None:
        letter_info = S.PortalLetterInfo(
            letter_id=letter.id,
            status=letter.status,
            can_sign=(letter.status == "sent"),
            rendered_body_md=letter.rendered_body_md or "",
            fee_lines=letter.fee_lines or [],
            firm_name=org.name,
            omara_number=org.omara_number,
            abn=org.abn,
            sent_at=letter.sent_at,
            signed_at=letter.signed_at,
        )

    # ── Checklist + documents (case-scoped) ──
    checklist: list[S.PortalChecklistItem] = []
    documents: list[S.PortalDocument] = []
    if case is not None:
        for it in (case.metadata_json or {}).get("checklist") or []:
            try:
                checklist.append(S.PortalChecklistItem(**{
                    "id": it.get("id"),
                    "label": it.get("label"),
                    "description": it.get("description"),
                    "document_type": it.get("document_type"),
                    "required": bool(it.get("required")),
                    "status": it.get("status") or "pending",
                    "document_id": it.get("document_id"),
                }))
            except Exception:  # pragma: no cover - defensive
                continue
        for doc in await CaseService.list_documents(db, case.id):
            documents.append(S.PortalDocument(
                id=doc.id,
                file_name=doc.file_name,
                document_type=doc.document_type,
                status=doc.status,
                uploaded_by_type=doc.uploaded_by_type,
                uploaded_at=doc.uploaded_at,
            ))

    # ── Todos ──
    todos: list[S.PortalTodo] = []
    if letter_info and letter_info.can_sign:
        todos.append(S.PortalTodo(
            type="sign",
            title="Sign your engagement letter",
            subtitle="Review the scope and fees, then sign — it takes a minute.",
        ))
    pending_required = [c for c in checklist if c.required and c.status in ("pending",)]
    if pending_required:
        todos.append(S.PortalTodo(
            type="upload",
            title="Upload your documents",
            subtitle=f"{len(pending_required)} document(s) still needed.",
        ))

    # ── Facts ──
    facts: list[S.PortalFact] = []
    if summary.subclass:
        facts.append(S.PortalFact(label="Pathway", value=(summary.title)))
    facts.append(S.PortalFact(label="Agent", value=org.name))
    opened = pc.converted_at or pc.qualified_at or pc.created_at
    if opened:
        facts.append(S.PortalFact(label="Opened", value=opened.strftime("%d %b %Y")))

    # ── Timeline ──
    timeline = _build_timeline(pc, case, letter)

    return S.PortalApplicationDetail(
        **summary.model_dump(),
        summary_text=pc.ai_summary,
        facts=facts,
        todos=todos,
        letter=letter_info,
        checklist=checklist,
        documents=documents,
        timeline=timeline,
    )


def _build_timeline(pc: PreCase, case: Optional[Case], letter: Optional[EngagementLetter]) -> list[S.PortalTimelineItem]:
    items: list[S.PortalTimelineItem] = []

    def add(key: str, title: str, date, done: bool, is_now: bool = False, hint: Optional[str] = None):
        state = "done" if done else ("now" if is_now else "future")
        items.append(S.PortalTimelineItem(key=key, title=title, date=date, state=state, hint=hint))

    signed = pc.letter_signed_at is not None
    letter_sent = pc.letter_sent_at is not None
    paid = pc.paid_at is not None
    converted = pc.converted_at is not None

    add("enquiry", "Enquiry received", pc.created_at, True)
    add("qualified", "Qualified — portal account created", pc.qualified_at, pc.qualified_at is not None)
    add(
        "letter_sent",
        "Engagement letter sent to you",
        pc.letter_sent_at,
        letter_sent,
        is_now=(not letter_sent and not signed),
    )
    add(
        "sign",
        "You sign the agreement",
        pc.letter_signed_at,
        signed,
        is_now=(letter_sent and not signed),
        hint=None if signed else "Waiting on you",
    )
    add(
        "deposit",
        "Deposit confirmed",
        pc.paid_at,
        paid,
        is_now=(signed and not paid),
        hint=None if paid else "Upcoming",
    )
    add(
        "case_open",
        "Case opened",
        pc.converted_at,
        converted,
        is_now=(paid and not converted),
        hint=None if converted else "Upcoming",
    )
    if case is not None:
        add(
            "documents",
            "Documents collected & reviewed",
            None,
            case.stage in ("document_review", "application_prep", "lodgement", "post_lodgement", "decision"),
            is_now=case.stage in ("document_collection", "checklist", "visa_pathway", "consultation"),
            hint="Upcoming" if case.stage in ("consultation", "visa_pathway", "checklist") else None,
        )
        add(
            "lodged",
            "Application lodged",
            case.lodgement_date,
            case.stage in ("lodgement", "post_lodgement", "decision"),
            is_now=False,
            hint="Upcoming" if case.stage not in ("lodgement", "post_lodgement", "decision") else None,
        )
    return items


# ── Sign + upload ────────────────────────────────────────────────────────────


async def sign_application_letter(
    db: AsyncSession,
    account: ClientPortalAccount,
    application_id: UUID,
    payload: dict,
    ip_address: Optional[str],
    user_agent: Optional[str],
) -> S.PortalSignResponse:
    from app.agents.immigration.engagement import service as engagement_service

    pc = (
        await db.execute(
            select(PreCase).where(
                PreCase.id == application_id,
                PreCase.org_id == account.org_id,
                PreCase.client_id == account.client_id,
            )
        )
    ).scalar_one_or_none()
    if pc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")

    result = await engagement_service.portal_sign_letter(
        db,
        pre_case_id=pc.id,
        org_id=account.org_id,
        payload=payload,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return S.PortalSignResponse(success=True, signed_at=result["signed_at"])


async def upload_application_document(
    db: AsyncSession,
    account: ClientPortalAccount,
    application_id: UUID,
    *,
    file_name: str,
    file_bytes: bytes,
    content_type: Optional[str],
):
    pc = (
        await db.execute(
            select(PreCase).where(
                PreCase.id == application_id,
                PreCase.org_id == account.org_id,
                PreCase.client_id == account.client_id,
            )
        )
    ).scalar_one_or_none()
    if pc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    if not pc.promoted_case_id:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Document uploads open once your agent has opened your case.",
        )
    document = await CaseService.store_document(
        db,
        case_id=pc.promoted_case_id,
        file_name=file_name,
        file_bytes=file_bytes,
        content_type=content_type,
        uploaded_by_type="client",
    )
    await db.commit()
    await db.refresh(document)
    return S.PortalDocument(
        id=document.id,
        file_name=document.file_name,
        document_type=document.document_type,
        status=document.status,
        uploaded_by_type=document.uploaded_by_type,
        uploaded_at=document.uploaded_at,
    )
