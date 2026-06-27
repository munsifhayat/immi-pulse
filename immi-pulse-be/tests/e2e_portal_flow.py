"""End-to-end exercise of the Phase-1 enquiry→case + client-portal flow.

Run against a live DB (PYTHONPATH=src python tests/e2e_portal_flow.py). Seeds two
orgs directly, then drives the HTTP surface in-process via httpx ASGITransport:

  qualify → portal account issued → client login (forced reset) → set password →
  in-portal sign (SignatureEvent audit) → record deposit → open case → checklist
  visible → in-portal upload. Plus the multi-agent acceptance criteria:
  same email across two orgs = two accounts (no uniqueness error, full isolation),
  same email returning to the same org = one account reused.
"""

import os

# Must be set before the first get_settings() (encryption.py calls it at import).
os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import uuid

import httpx
from httpx import ASGITransport
from sqlalchemy import func, select

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)
    return cond


async def main():
    # Patch the outbound welcome email so the test never hits Resend.
    from app.integrations.resend import templates as email_templates

    sent_emails = []

    async def _fake_welcome(**kw):
        sent_emails.append(kw)
        return {"id": "fake-" + uuid.uuid4().hex[:8]}

    email_templates.send_client_portal_welcome = _fake_welcome

    from app.agents.immigration.clients.models import (
        Client,
        ClientOrgLink,
        ClientPortalAccount,
    )
    from app.agents.immigration.engagement.models import EngagementLetter, SignatureEvent
    from app.agents.immigration.orgs.models import Organization, Seat
    from app.agents.immigration.precases.models import PreCase
    from app.agents.immigration.users.models import User
    from app.core.config import get_settings
    from app.core.jwt_auth import issue_token
    from app.db.session import get_async_session
    from app.main import app

    settings = get_settings()
    suffix = uuid.uuid4().hex[:8]
    client_email = f"priya.{suffix}@example.com"

    # ── Seed: two orgs, each with a consultant seat; a shared global Client;
    #         a qualified-able PreCase per org; a "sent" engagement letter for org A.
    async with get_async_session() as db:
        org_a = Organization(name=f"Gideon James Migration {suffix}", country="AU",
                             omara_number="1234567", abn="11 222 333 444")
        org_b = Organization(name=f"Northbridge Migration {suffix}", country="AU",
                             omara_number="7654321")
        db.add_all([org_a, org_b])
        await db.flush()

        user_a = User(email=f"agentA.{suffix}@firm.com", first_name="Gideon", last_name="James")
        user_b = User(email=f"agentB.{suffix}@firm.com", first_name="Nora", last_name="Bridge")
        db.add_all([user_a, user_b])
        await db.flush()

        seat_a = Seat(org_id=org_a.id, user_id=user_a.id, role="owner", status="active")
        seat_b = Seat(org_id=org_b.id, user_id=user_b.id, role="owner", status="active")
        db.add_all([seat_a, seat_b])
        await db.flush()

        client = Client(primary_email=client_email, name="Priya Sharma", phone="0400000000")
        db.add(client)
        await db.flush()
        db.add_all([
            ClientOrgLink(client_id=client.id, org_id=org_a.id, status="active"),
            ClientOrgLink(client_id=client.id, org_id=org_b.id, status="active"),
        ])

        pc_a = PreCase(org_id=org_a.id, client_id=client.id, status="in_review",
                       source="questionnaire", ai_status="succeeded",
                       ai_summary="Priya is on a 482 seeking PR via 186 (ENS).",
                       ai_extracted={"visa_interest": "186"})
        pc_a2 = PreCase(org_id=org_a.id, client_id=client.id, status="in_review",
                        source="questionnaire", ai_status="succeeded",
                        ai_summary="Second matter for same client at same agent.",
                        ai_extracted={"visa_interest": "600"})
        pc_b = PreCase(org_id=org_b.id, client_id=client.id, status="in_review",
                       source="questionnaire", ai_status="succeeded",
                       ai_summary="Different agent, different matter.",
                       ai_extracted={"visa_interest": "482"})
        db.add_all([pc_a, pc_a2, pc_b])
        await db.flush()

        letter = EngagementLetter(
            org_id=org_a.id, pre_case_id=pc_a.id, template_id=None,
            rendered_body_md="# Costs Agreement\n\nScope: 186 ENS PR. Professional fee A$3,500.",
            fee_lines=[{"label": "Professional fee", "amount_aud": "3500", "kind": "professional_fee"}],
            status="sent",
        )
        db.add(letter)
        await db.commit()

        org_a_id, org_b_id = org_a.id, org_b.id
        pc_a_id, pc_a2_id, pc_b_id = pc_a.id, pc_a2.id, pc_b.id
        letter_id = letter.id
        client_id = client.id

    jwt_a = issue_token(user_a.id, seat_a.id, org_a_id)
    jwt_b = issue_token(user_b.id, seat_b.id, org_b_id)
    api_key = settings.api_key

    transport = ASGITransport(app=app)
    base = "http://test/api/v1"
    async with httpx.AsyncClient(transport=transport, base_url=base) as c:
        hdr_a = {"X-API-Key": api_key, "Authorization": f"Bearer {jwt_a}"}
        hdr_b = {"X-API-Key": api_key, "Authorization": f"Bearer {jwt_b}"}

        # ── 1. Qualify org A's pre-case → account created + credentials returned ──
        print("\n[1] Qualify creates the portal account + returns credentials once")
        r = await c.post(f"/precases/{pc_a_id}/qualify", json={}, headers=hdr_a)
        check("qualify 200", r.status_code == 200)
        detail = r.json()
        access = detail.get("client_access")
        check("client_access present on qualify", access is not None)
        temp_password = access and access.get("temp_password")
        check("temp_password issued once", bool(temp_password))
        check("must_reset true", access and access.get("must_reset") is True)
        org_slug = access["portal_path"].rsplit("/", 1)[-1]
        check("portal_url absolute", access["portal_url"].endswith(access["portal_path"]))
        check("welcome email dispatched", len(sent_emails) == 1)
        account_id_a = access["account_id"]

        # ── 2. Exactly one account for (orgA, email) ──
        async with get_async_session() as db:
            cnt = (await db.execute(
                select(func.count()).select_from(ClientPortalAccount).where(
                    ClientPortalAccount.org_id == org_a_id,
                    ClientPortalAccount.email == client_email,
                )
            )).scalar_one()
        check("exactly one account for (orgA,email)", cnt == 1)

        # ── 3. Same email, SAME org returns → reuse the same account ──
        print("\n[2] Same email returning to the SAME agent reuses the account")
        r = await c.post(f"/precases/{pc_a2_id}/qualify", json={}, headers=hdr_a)
        check("second qualify 200", r.status_code == 200)
        access2 = r.json().get("client_access")
        check("same account_id reused", access2 and access2["account_id"] == account_id_a)
        async with get_async_session() as db:
            cnt = (await db.execute(
                select(func.count()).select_from(ClientPortalAccount).where(
                    ClientPortalAccount.org_id == org_a_id,
                    ClientPortalAccount.email == client_email,
                )
            )).scalar_one()
        check("still exactly one account after re-qualify", cnt == 1)
        check("no second welcome email on reuse", len(sent_emails) == 1)

        # ── 4. Same email, DIFFERENT org → separate account, no uniqueness error ──
        print("\n[3] Same email at a DIFFERENT agent → separate account (no collision)")
        r = await c.post(f"/precases/{pc_b_id}/qualify", json={}, headers=hdr_b)
        check("orgB qualify 200 (no uniqueness error)", r.status_code == 200)
        access_b = r.json().get("client_access")
        account_id_b = access_b and access_b["account_id"]
        check("orgB account distinct from orgA", account_id_b and account_id_b != account_id_a)
        temp_password_b = access_b.get("temp_password")

        # ── 5. Client login at org A's portal (forced reset) → set password ──
        print("\n[4] Client logs in at the firm's portal, is forced to reset, signs")
        r = await c.post(f"/public/portal/{org_slug}/login",
                         json={"email": client_email, "password": temp_password})
        check("login 200 with temp password", r.status_code == 200)
        login = r.json()
        check("login forces must_reset", login["must_reset"] is True)
        token_a = login["access_token"]
        check("firm name surfaced", login["account"]["firm_name"].startswith("Gideon James"))
        phdr = {"Authorization": f"Bearer {token_a}"}

        # cross-agent password must NOT work at org A's portal
        r = await c.post(f"/public/portal/{org_slug}/login",
                         json={"email": client_email, "password": temp_password_b})
        check("orgB password rejected at orgA portal", r.status_code == 401)

        # set a real password
        r = await c.post("/public/portal/set-password",
                         json={"new_password": "Brisbane-Harbour-92!"}, headers=phdr)
        check("set-password 200", r.status_code == 200)
        # re-login with the new password, must_reset now false
        r = await c.post(f"/public/portal/{org_slug}/login",
                         json={"email": client_email, "password": "Brisbane-Harbour-92!"})
        check("re-login with new password", r.status_code == 200 and r.json()["must_reset"] is False)
        token_a = r.json()["access_token"]
        phdr = {"Authorization": f"Bearer {token_a}"}

        # temp password no longer shown on the consultant card after reset
        r = await c.get(f"/clients/portal-accounts/by-precase/{pc_a_id}", headers=hdr_a)
        check("card hides temp password after client reset",
              r.status_code == 200 and r.json() and r.json().get("temp_password") is None)
        check("card shows status active", r.json().get("status") == "active")

        # ── 6. Applications list + detail (isolation) ──
        print("\n[5] Applications list is org-scoped and shows the letter to sign")
        r = await c.get("/public/portal/applications", headers=phdr)
        check("applications 200", r.status_code == 200)
        apps = r.json()
        check("orgA client sees their 2 qualified matters", len(apps) == 2)
        app_with_letter = next((a for a in apps if a["application_id"] == str(pc_a_id)), None)
        check("186 matter present", app_with_letter is not None)
        check("needs_count flags the unsigned letter", app_with_letter and app_with_letter["needs_count"] >= 1)

        r = await c.get(f"/public/portal/applications/{pc_a_id}", headers=phdr)
        check("application detail 200", r.status_code == 200)
        det = r.json()
        check("letter can_sign", det["letter"] and det["letter"]["can_sign"] is True)
        check("sign todo present", any(t["type"] == "sign" for t in det["todos"]))
        check("timeline has milestones", len(det["timeline"]) >= 5)

        # ── 7. In-portal sign → SignatureEvent recorded, letter signed ──
        r = await c.post(f"/public/portal/applications/{pc_a_id}/sign",
                         json={"signer_name": "Priya Sharma", "method": "typed_name",
                               "consent_given": True}, headers=phdr)
        check("in-portal sign 200", r.status_code == 200)
        async with get_async_session() as db:
            ev = (await db.execute(
                select(SignatureEvent).where(SignatureEvent.letter_id == letter_id)
            )).scalars().all()
            lt = (await db.execute(select(EngagementLetter).where(EngagementLetter.id == letter_id))).scalar_one()
            pc = (await db.execute(select(PreCase).where(PreCase.id == pc_a_id))).scalar_one()
        check("SignatureEvent recorded", len(ev) == 1)
        check("body_hash_sha256 captured", ev and len(ev[0].body_hash_sha256) == 64)
        check("consent text captured", ev and "Electronic Transactions Act" in ev[0].consent_text)
        check("letter status signed", lt.status == "signed")
        check("pre-case advanced to letter_signed", pc.status == "letter_signed")

        # after signing, the sign todo clears
        r = await c.get(f"/public/portal/applications/{pc_a_id}", headers=phdr)
        det = r.json()
        check("sign todo cleared after signing", not any(t["type"] == "sign" for t in det["todos"]))
        check("letter now reports signed", det["letter"]["status"] == "signed")

        # ── 8. Record deposit + open case (consultant) → checklist generated ──
        print("\n[6] Consultant records deposit, opens case, checklist appears in portal")
        r = await c.post("/payments", headers=hdr_a, json={
            "pre_case_id": str(pc_a_id), "method": "bank_transfer",
            "amount_aud": "1500", "received_at": "2026-06-19", "reference": "RTN-1"})
        check("record payment 2xx", r.status_code in (200, 201))
        r = await c.post(f"/precases/{pc_a_id}/promote", headers=hdr_a)
        check("promote → case 2xx", r.status_code in (200, 201))
        case_id = r.json()["case_id"]
        r = await c.post(f"/cases/{case_id}/generate-checklist", headers=hdr_a,
                         json={"visa_subclass": "186"})
        check("generate checklist 2xx", r.status_code in (200, 201))

        r = await c.get(f"/public/portal/applications/{pc_a_id}", headers=phdr)
        det = r.json()
        check("application now linked to a case", det["case_id"] == case_id)
        check("checklist visible in portal", len(det["checklist"]) > 0)
        check("upload todo appears once case open", any(t["type"] == "upload" for t in det["todos"]))

        # ── 9. In-portal document upload → reflects in the application ──
        print("\n[7] Client uploads a document in-portal")
        files = {"file": ("passport.pdf", b"%PDF-1.4 fake passport bytes", "application/pdf")}
        r = await c.post(f"/public/portal/applications/{pc_a_id}/documents",
                         files=files, headers=phdr)
        check("upload 201", r.status_code == 201)
        r = await c.get(f"/public/portal/applications/{pc_a_id}", headers=phdr)
        det = r.json()
        check("uploaded document listed", len(det["documents"]) >= 1)

        # ── 10. Cross-org isolation: orgB's client sees only orgB's matter ──
        print("\n[8] Cross-agent isolation")
        r = await c.post(f"/public/portal/{access_b['portal_path'].rsplit('/',1)[-1]}/login",
                         json={"email": client_email, "password": temp_password_b})
        check("orgB login ok", r.status_code == 200)
        tok_b = r.json()["access_token"]
        r = await c.get("/public/portal/applications", headers={"Authorization": f"Bearer {tok_b}"})
        apps_b = r.json()
        check("orgB client sees only orgB matter", len(apps_b) == 1 and apps_b[0]["application_id"] == str(pc_b_id))
        check("orgB cannot open orgA application",
              (await c.get(f"/public/portal/applications/{pc_a_id}",
                           headers={"Authorization": f"Bearer {tok_b}"})).status_code == 404)

        # ── 11. Consultant credential actions: regenerate ──
        print("\n[9] Consultant regenerate-password issues a fresh temp")
        r = await c.post(f"/clients/portal-accounts/{account_id_a}/regenerate-password", headers=hdr_a)
        check("regenerate 200", r.status_code == 200)
        check("fresh temp password returned", bool(r.json().get("temp_password")))
        # org B cannot touch org A's account
        r = await c.post(f"/clients/portal-accounts/{account_id_a}/regenerate-password", headers=hdr_b)
        check("cross-org account action blocked (404)", r.status_code == 404)

    # ── Cleanup seeded rows ──
    async with get_async_session() as db:
        await db.execute(SignatureEvent.__table__.delete().where(
            SignatureEvent.letter_id == letter_id))
        await db.execute(EngagementLetter.__table__.delete().where(
            EngagementLetter.org_id.in_([org_a_id, org_b_id])))
        await db.execute(ClientPortalAccount.__table__.delete().where(
            ClientPortalAccount.client_id == client_id))
        await db.execute(ClientOrgLink.__table__.delete().where(
            ClientOrgLink.client_id == client_id))
        # cases + precases + client cascade via FK where possible; delete explicitly
        from app.agents.immigration.cases.models import Case, CaseDocument, CaseTimelineEvent
        from app.agents.immigration.payments.models import PaymentRecord
        await db.execute(PaymentRecord.__table__.delete().where(
            PaymentRecord.pre_case_id.in_([pc_a_id, pc_a2_id, pc_b_id])))
        cases = (await db.execute(select(Case).where(Case.org_id.in_([org_a_id, org_b_id])))).scalars().all()
        for cs in cases:
            await db.execute(CaseTimelineEvent.__table__.delete().where(CaseTimelineEvent.case_id == cs.id))
            await db.execute(CaseDocument.__table__.delete().where(CaseDocument.case_id == cs.id))
        await db.execute(Case.__table__.delete().where(Case.org_id.in_([org_a_id, org_b_id])))
        await db.execute(PreCase.__table__.delete().where(PreCase.id.in_([pc_a_id, pc_a2_id, pc_b_id])))
        await db.execute(Client.__table__.delete().where(Client.id == client_id))
        await db.execute(Seat.__table__.delete().where(Seat.org_id.in_([org_a_id, org_b_id])))
        await db.execute(User.__table__.delete().where(User.id.in_([user_a.id, user_b.id])))
        await db.execute(Organization.__table__.delete().where(Organization.id.in_([org_a_id, org_b_id])))
        await db.commit()

    print("\n" + ("=" * 60))
    if _failures:
        print(f"{FAIL} {len(_failures)} check(s) FAILED:")
        for f in _failures:
            print("   -", f)
        raise SystemExit(1)
    print(f"{PASS} ALL E2E CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(main())
