"""Seed a deterministic scenario for a browser smoke test, then print the
handles the test needs. Idempotent-ish: uses a fixed suffix so re-runs reuse
or recreate the same rows by email."""

import asyncio
import os

os.environ["BREACH_CHECK_ENABLED"] = "false"

from sqlalchemy import select


async def main():
    from app.agents.immigration.clients.models import Client, ClientOrgLink
    from app.agents.immigration.engagement.models import EngagementLetter
    from app.agents.immigration.orgs.models import (
        CreditWallet,
        Organization,
        Seat,
        Subscription,
    )
    from app.agents.immigration.precases.models import PreCase
    from app.agents.immigration.users.models import User
    from app.core.jwt_auth import hash_password
    from app.db.session import get_async_session

    CONSULTANT_EMAIL = "smoke.agent@firm.com"
    CONSULTANT_PW = "Consultant-Smoke-1!"
    CLIENT_EMAIL = "smoke.client@example.com"

    async with get_async_session() as db:
        # Clean any prior smoke rows for a fresh run.
        prior = (await db.execute(select(User).where(User.email == CONSULTANT_EMAIL))).scalar_one_or_none()
        if prior:
            seats = (await db.execute(select(Seat).where(Seat.user_id == prior.id))).scalars().all()
            for s in seats:
                org = (await db.execute(select(Organization).where(Organization.id == s.org_id))).scalar_one_or_none()
                if org:
                    pcs = (await db.execute(select(PreCase).where(PreCase.org_id == org.id))).scalars().all()
                    for pc in pcs:
                        await db.execute(EngagementLetter.__table__.delete().where(EngagementLetter.pre_case_id == pc.id))
                    from app.agents.immigration.clients.models import ClientPortalAccount
                    await db.execute(ClientPortalAccount.__table__.delete().where(ClientPortalAccount.org_id == org.id))
                    await db.execute(PreCase.__table__.delete().where(PreCase.org_id == org.id))
                    await db.execute(ClientOrgLink.__table__.delete().where(ClientOrgLink.org_id == org.id))
                await db.execute(Seat.__table__.delete().where(Seat.id == s.id))
                if org:
                    await db.execute(Organization.__table__.delete().where(Organization.id == org.id))
            await db.execute(User.__table__.delete().where(User.id == prior.id))
        old_client = (await db.execute(select(Client).where(Client.primary_email == CLIENT_EMAIL))).scalar_one_or_none()
        if old_client:
            await db.execute(Client.__table__.delete().where(Client.id == old_client.id))
        await db.commit()

        org = Organization(name="Gideon James Migration", country="AU",
                            omara_number="1801234", abn="11 222 333 444")
        db.add(org)
        await db.flush()
        db.add(Subscription(org_id=org.id, tier="starter", status="active", seat_count=1))
        db.add(CreditWallet(org_id=org.id, balance=1000, monthly_grant=1000))

        user = User(email=CONSULTANT_EMAIL, password_hash=hash_password(CONSULTANT_PW),
                    first_name="Gideon", last_name="James", email_verified=True, status="active")
        db.add(user)
        await db.flush()
        seat = Seat(org_id=org.id, user_id=user.id, role="owner", status="active")
        db.add(seat)

        client = Client(primary_email=CLIENT_EMAIL, name="Priya Sharma", phone="0400123123")
        db.add(client)
        await db.flush()
        db.add(ClientOrgLink(client_id=client.id, org_id=org.id, status="active"))

        pc = PreCase(org_id=org.id, client_id=client.id, status="in_review",
                     source="questionnaire", ai_status="succeeded",
                     ai_summary="Priya is on a subclass 482 in Brisbane, working as an "
                                "electrical engineer, and wants permanent residence via 186 (ENS). "
                                "Her employer is willing to sponsor. Onshore, no obvious blockers.",
                     ai_suggested_outcome="likely_fit", ai_confidence=0.82,
                     ai_extracted={"visa_interest": "186", "occupation": "Electrical engineer",
                                   "location": "Brisbane", "current_visa": "482"})
        db.add(pc)
        await db.flush()

        letter = EngagementLetter(
            org_id=org.id, pre_case_id=pc.id, template_id=None,
            rendered_body_md=(
                "# Costs Agreement — Gideon James Migration\n\n"
                "**Scope:** Advice and lodgement for subclass 186 (ENS) permanent "
                "residence, including nomination support.\n\n"
                "This agreement sets out the professional fees and disbursements for your matter."
            ),
            fee_lines=[
                {"label": "Professional fee", "amount_aud": "3500", "kind": "professional_fee"},
                {"label": "Disbursements", "amount_aud": "540", "kind": "disbursement"},
                {"label": "Retainer payable now", "amount_aud": "1500", "kind": "retainer"},
            ],
            status="sent",
        )
        db.add(letter)
        await db.commit()
        pc_id = pc.id

    print("SEED_OK")
    print(f"CONSULTANT_EMAIL={CONSULTANT_EMAIL}")
    print(f"CONSULTANT_PW={CONSULTANT_PW}")
    print(f"CLIENT_EMAIL={CLIENT_EMAIL}")
    print(f"PRECASE_ID={pc_id}")


if __name__ == "__main__":
    asyncio.run(main())
