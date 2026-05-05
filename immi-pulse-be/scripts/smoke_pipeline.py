"""End-to-end smoke test of the Phase 1 consultant pipeline.

Hits the live FastAPI app via httpx + a real test DB (whatever DATABASE_URL
points at). Walks the full happy path:

1. Sign up new consultant → org created
2. Public submit on a seeded questionnaire → precase + client created
3. Qualify → status: qualified
4. Send engagement letter → status: letter_sent + sign URL/PIN minted
5. Public view + sign the letter → status: letter_signed
6. Record payment → status: paid
7. Promote to case → status: converted, Case row created
8. Manual override paths: skip-payment, mark-signed-manual, force-convert, open-case-direct

Usage: PYTHONPATH=src .venv/bin/python scripts/smoke_pipeline.py
"""

import asyncio
import os
import sys
import uuid
from contextlib import asynccontextmanager

import httpx

BASE = os.getenv("API_URL", "http://localhost:8000/api/v1")
API_KEY = os.getenv("INTERNAL_API_KEY", "dev-internal-api-key")


def banner(msg: str) -> None:
    print(f"\n\033[95m▸ {msg}\033[0m")


def ok(msg: str) -> None:
    print(f"  \033[92m✓ {msg}\033[0m")


def fail(msg: str) -> None:
    print(f"  \033[91m✗ {msg}\033[0m")
    sys.exit(1)


@asynccontextmanager
async def client():
    async with httpx.AsyncClient(base_url=BASE, headers={"X-API-Key": API_KEY}, timeout=30) as c:
        yield c


async def main() -> None:
    suffix = uuid.uuid4().hex[:8]
    test_email = f"smoke-{suffix}@example.com"
    consultant_email = f"consultant-{suffix}@example.com"

    async with client() as c:
        # ── 1. Signup ────────────────────────────────────────────────
        banner("1. Sign up new consultant")
        r = await c.post(
            "/auth/signup",
            json={
                "email": consultant_email,
                "password": "test123456",
                "first_name": "Test",
                "last_name": "Consultant",
                "firm_name": f"Test Firm {suffix}",
            },
        )
        if r.status_code != 200:
            fail(f"signup failed: {r.status_code} {r.text}")
        signup = r.json()
        token = signup["token"]
        org_id = signup["org"]["id"]
        ok(f"org_id={org_id[:8]}…  token issued")

        auth = {"Authorization": f"Bearer {token}"}

        # ── 2. Get a seeded questionnaire ────────────────────────────
        banner("2. Find a seeded questionnaire")
        r = await c.get("/questionnaires", headers=auth)
        qs = r.json()
        if not qs:
            fail("no seeded questionnaires found")
        q = qs[0]
        slug = q["slug"]
        ok(f"questionnaire={q['name']}  slug={slug}")

        # ── 3. Public submit ─────────────────────────────────────────
        banner("3. Public submit (no auth)")
        r = await c.post(
            f"/public/q/{slug}/submit",
            json={
                "submitter_email": test_email,
                "submitter_name": "Smoke Sarah",
                "answers": {"current_situation": "I want a 482 visa"},
            },
        )
        if r.status_code != 200:
            fail(f"public submit failed: {r.status_code} {r.text}")
        sub = r.json()
        precase_id = sub["pre_case_id"]
        ok(f"precase_id={precase_id[:8]}…  client created")

        # ── 4. List inbox ────────────────────────────────────────────
        banner("4. Inbox shows the new query")
        r = await c.get("/precases?group=inbox", headers=auth)
        items = r.json()
        if not any(i["id"] == precase_id for i in items):
            fail("inbox group=inbox missing the new precase")
        ok(f"inbox group=inbox returned {len(items)} item(s)")

        # ── 5. Qualify ───────────────────────────────────────────────
        banner("5. Qualify the precase")
        r = await c.post(f"/precases/{precase_id}/qualify", json={}, headers=auth)
        if r.status_code != 200:
            fail(f"qualify failed: {r.status_code} {r.text}")
        if r.json()["status"] != "qualified":
            fail(f"expected status=qualified, got {r.json()['status']}")
        ok("status → qualified")

        # ── 6. Verify in pre-cases group ─────────────────────────────
        r = await c.get("/precases?group=precase", headers=auth)
        items = r.json()
        if not any(i["id"] == precase_id for i in items):
            fail("precase group missing the qualified item")
        ok(f"pre-cases group returned {len(items)} item(s)")

        # ── 7. Send engagement letter ────────────────────────────────
        banner("7. Send engagement letter")
        r = await c.post(
            f"/engagement-letters/by-precase/{precase_id}/send",
            headers=auth,
            json={
                "compose": {
                    "visa_subclass": "482",
                    "visa_name": "TSS work",
                    "scope": "Lodgement of TSS application.",
                    "fee_lines": [
                        {"label": "Professional fees", "amount_aud": "4500", "kind": "professional_fee"},
                        {"label": "Retainer", "amount_aud": "1500", "kind": "retainer"},
                    ],
                },
                "expires_in_days": 14,
            },
        )
        if r.status_code != 200:
            fail(f"send letter failed: {r.status_code} {r.text}")
        send = r.json()
        sign_token = send["sign_url"].rsplit("/", 1)[-1]
        sign_pin = send["sign_pin"]
        ok(f"letter_id={send['letter_id'][:8]}…  pin={sign_pin}  url={send['sign_url']}")

        # ── 8. Public view of the letter ─────────────────────────────
        banner("8. Public view of letter (no auth, no PIN)")
        r = await c.get(f"/public/letters/{sign_token}")
        if r.status_code != 200:
            fail(f"public view failed: {r.status_code} {r.text}")
        view = r.json()
        if view["status"] != "sent":
            fail(f"expected sent, got {view['status']}")
        ok(f"public view returned firm={view['firm_name']}")

        # ── 9. Public sign with WRONG PIN should 401 ─────────────────
        r = await c.post(
            f"/public/letters/{sign_token}/sign",
            json={
                "pin": "000000",
                "consent_given": True,
                "signer_name": "Smoke Sarah",
                "method": "typed_name",
            },
        )
        if r.status_code != 401:
            fail(f"wrong PIN should 401, got {r.status_code}")
        ok("wrong PIN correctly rejected (401)")

        # ── 10. Public sign with correct PIN ─────────────────────────
        banner("10. Sign with correct PIN")
        r = await c.post(
            f"/public/letters/{sign_token}/sign",
            json={
                "pin": sign_pin,
                "consent_given": True,
                "signer_name": "Smoke Sarah",
                "method": "typed_name",
            },
        )
        if r.status_code != 200:
            fail(f"sign failed: {r.status_code} {r.text}")
        ok(f"signed_at={r.json()['signed_at']}")

        # Verify status advanced
        r = await c.get(f"/precases/{precase_id}", headers=auth)
        if r.json()["status"] != "letter_signed":
            fail(f"expected letter_signed, got {r.json()['status']}")
        ok("precase status → letter_signed")

        # ── 11. Record payment ───────────────────────────────────────
        banner("11. Record payment manually")
        from datetime import datetime, timezone
        r = await c.post(
            "/payments",
            headers=auth,
            json={
                "pre_case_id": precase_id,
                "method": "bank_transfer",
                "amount_aud": "1500",
                "reference": "SMK-001",
                "received_at": datetime.now(timezone.utc).isoformat(),
                "notes": "Smoke test payment",
            },
        )
        if r.status_code != 201:
            fail(f"record payment failed: {r.status_code} {r.text}")
        pmt = r.json()
        ok(f"payment receipt={pmt['receipt_number']}")

        r = await c.get(f"/precases/{precase_id}", headers=auth)
        if r.json()["status"] != "paid":
            fail(f"expected paid, got {r.json()['status']}")
        ok("precase status → paid")

        # ── 12. Promote to case ──────────────────────────────────────
        banner("12. Promote to case")
        r = await c.post(f"/precases/{precase_id}/promote", headers=auth)
        if r.status_code != 200:
            fail(f"promote failed: {r.status_code} {r.text}")
        case_id = r.json()["case_id"]
        ok(f"case_id={case_id[:8]}…")

        r = await c.get(f"/precases/{precase_id}", headers=auth)
        det = r.json()
        if det["status"] != "converted":
            fail(f"expected converted, got {det['status']}")
        if det["promoted_case_id"] != case_id:
            fail("promoted_case_id mismatch")
        ok("precase status → converted, promoted_case_id set")

        # ── 13. Verify Client + history ──────────────────────────────
        banner("13. Verify Client API + history")
        r = await c.get("/clients", headers=auth)
        clients_ = r.json()
        client_match = next((c for c in clients_ if c["primary_email"] == test_email), None)
        if not client_match:
            fail("client not in clients list")
        client_id = client_match["id"]
        if client_match["case_count"] != 1:
            fail(f"expected case_count=1, got {client_match['case_count']}")
        ok(f"client found, case_count={client_match['case_count']}")

        r = await c.get(f"/clients/{client_id}", headers=auth)
        detail = r.json()
        if not detail["history"]:
            fail("client history is empty")
        kinds = [h["kind"] for h in detail["history"]]
        for expected in ("query", "precase", "letter_sent", "letter_signed", "payment", "case_opened"):
            if expected not in kinds:
                fail(f"history missing kind={expected}")
        ok(f"client history has {len(detail['history'])} events: {set(kinds)}")

        # ── 14. Manual override: skip payment + force convert ────────
        banner("14. Manual override paths")
        # Create another precase via public submit
        r = await c.post(
            f"/public/q/{slug}/submit",
            json={"submitter_email": f"relative-{suffix}@example.com", "submitter_name": "Relative Test", "answers": {}},
        )
        pc2 = r.json()["pre_case_id"]
        # Qualify
        await c.post(f"/precases/{pc2}/qualify", json={}, headers=auth)
        # Skip payment (relative case)
        r = await c.post(
            "/payments/skip",
            headers=auth,
            json={"pre_case_id": pc2, "reason": "Family member - pro bono"},
        )
        if r.status_code != 201:
            fail(f"skip payment failed: {r.status_code} {r.text}")
        if r.json()["new_status"] != "paid":
            fail(f"expected paid after skip, got {r.json()['new_status']}")
        ok("skip-payment recorded, status → paid")

        # Force convert
        r = await c.post(
            f"/precases/{pc2}/force-convert",
            headers=auth,
            json={
                "reason": "Family case — paper agreement signed",
                "visa_subclass": "820",
            },
        )
        if r.status_code != 200:
            fail(f"force-convert failed: {r.status_code} {r.text}")
        ok(f"force-converted to case {r.json()['case_id'][:8]}…")

        # ── 15. Manual override: open case direct from client ────────
        banner("15. Open case direct (skip pre-case ladder entirely)")
        # Create new client manually
        new_email = f"manual-{suffix}@example.com"
        r = await c.post(
            "/clients",
            headers=auth,
            json={"primary_email": new_email, "name": "Manual Walkin"},
        )
        if r.status_code != 201:
            fail(f"create client failed: {r.status_code} {r.text}")
        cid = r.json()["id"]

        r = await c.post(
            f"/clients/{cid}/open-case",
            headers=auth,
            json={
                "visa_subclass": "186",
                "visa_name": "ENS",
                "skip_reason": "Walk-in client; engaged on the spot",
            },
        )
        if r.status_code != 201:
            fail(f"open-case-direct failed: {r.status_code} {r.text}")
        ok(f"opened case directly: {r.json()['case_id'][:8]}…")

        # ── 16. Mark-signed-manually flow on a fresh precase ─────────
        banner("16. Mark-signed-manually override")
        r = await c.post(
            f"/public/q/{slug}/submit",
            json={"submitter_email": f"paper-{suffix}@example.com", "submitter_name": "Paper Path", "answers": {}},
        )
        pc3 = r.json()["pre_case_id"]
        await c.post(f"/precases/{pc3}/qualify", json={}, headers=auth)

        r = await c.post(
            f"/engagement-letters/by-precase/{pc3}/mark-signed-manually",
            headers=auth,
            json={
                "signer_name": "Paper Path",
                "method": "consultant_attest",
                "reason": "Signed in person at our office on 1 May 2026",
            },
        )
        if r.status_code != 200:
            fail(f"mark-signed-manually failed: {r.status_code} {r.text}")

        r = await c.get(f"/precases/{pc3}", headers=auth)
        if r.json()["status"] != "letter_signed":
            fail(f"expected letter_signed after manual, got {r.json()['status']}")
        ok("manual sign attestation recorded, status → letter_signed")

        # ── 17. Bank settings ────────────────────────────────────────
        banner("17. Update bank/ABN settings")
        r = await c.patch(
            "/org",
            headers=auth,
            json={
                "abn": "51 824 753 556",
                "bsb": "062-001",
                "bank_account_number": "12345678",
                "bank_account_name": "Test Firm Pty Ltd",
                "payid": "pay@testfirm.com.au",
            },
        )
        if r.status_code != 200:
            fail(f"org patch failed: {r.status_code} {r.text}")
        if r.json()["abn"] != "51 824 753 556":
            fail("abn not persisted")
        ok("bank/ABN saved")

        # ── 18. Letter template CRUD ─────────────────────────────────
        banner("18. Engagement letter template CRUD")
        r = await c.get("/engagement-letters/templates/default", headers=auth)
        if r.status_code != 200:
            fail(f"get default template failed: {r.status_code}")
        tpl = r.json()
        ok(f"default template id={tpl['id'][:8]}… body_md len={len(tpl['body_md'])}")

        r = await c.patch(
            f"/engagement-letters/templates/{tpl['id']}",
            headers=auth,
            json={
                "name": "Updated standard letter",
                "fee_defaults": {
                    "professional_fee": "5000",
                    "disbursements": "1500",
                    "retainer": "2000",
                    "currency": "AUD",
                },
            },
        )
        if r.status_code != 200:
            fail(f"patch template failed: {r.status_code}")
        ok("template patched")

        print("\n\033[92m🎉 ALL SMOKE TESTS PASSED\033[0m")


if __name__ == "__main__":
    asyncio.run(main())
