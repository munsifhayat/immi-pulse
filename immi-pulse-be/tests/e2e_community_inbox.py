"""End-to-end exercise of the inbox, the "You" profile, and reply email (Phase 3).

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_inbox.py

The loop under test is the one the room lives on: A asks something, B answers,
and A is told. Everything else here exists because it is a way that loop can be
wrong in a way nobody notices until it matters —

  * A replying to her own post must notify nobody (authors clarify their own
    questions constantly; getting this wrong makes the inbox useless noise);
  * marking read must be idempotent, and must not let one member mark another
    member's notifications;
  * moderating a reply away must take it out of the victim's inbox, or hiding
    abuse leaves "AbusiveHandle replied to you" sitting there;
  * three rapid replies must send exactly ONE email, not three;
  * and the email must give nothing away. That last one is asserted hardest:
    a subject line naming a visa subclass can out someone's immigration status
    to whoever else reads that inbox, and members share inboxes with partners,
    employers and family. The assertion sweeps the subject, the preheader (which
    inbox lists render beside the subject) and the body for every visa term this
    run put into the room.
"""

import os

# Must be set before the first get_settings() — encryption.py calls it at import.
os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import uuid

import httpx
import sqlalchemy as sa
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []

TEST_CLIENT_IP = "127.0.0.1"
PASSWORD = "inbox-closes-the-loop-42"

# Words that must never appear in a notification email. The first few are the
# subclass/topic terms this script deliberately puts into the room; the rest are
# the generic shapes of a leak.
LEAKY_TERMS = [
    "820",
    "partner visa",
    "subclass",
    "onshore",
    "bridging",
    "sponsor",
    "medical",
    "police check",
]


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)
    return cond


def _leaks(text: str, terms: list[str] | None = None) -> list[str]:
    """Which forbidden terms appear in ``text``. Empty list means it is safe.

    A function rather than an inline comprehension so the same code can be run
    against a deliberately-bad subject line, proving the check can fail.
    """
    haystack = (text or "").lower()
    return [t for t in (terms or LEAKY_TERMS) if t in haystack]


class NoCookieClient:
    """An httpx client that forgets cookies between calls.

    The backend sets a durable HttpOnly ``ip_device`` cookie and httpx's jar
    would replay it, quietly collapsing "two different people" into "the same
    device twice" — which would make almost every assertion below pass for the
    wrong reason. See tests/e2e_community_accounts.py.
    """

    def __init__(self, inner: httpx.AsyncClient):
        self._inner = inner

    async def get(self, url, **kw):
        return await self._call("GET", url, **kw)

    async def post(self, url, **kw):
        return await self._call("POST", url, **kw)

    async def _call(self, method, url, **kw):
        response = await self._inner.request(method, url, **kw)
        self._inner.cookies.clear()
        return response


async def _signup(client, svc, *, email=None):
    """Fresh device -> claimed account. Returns (session_token, handle)."""
    r = await client.post("/community/public/identity", headers=svc)
    device = r.json()["device_token"]
    body = {"password": PASSWORD}
    if email:
        body["email"] = email
    else:
        body["email"] = f"inbox-{uuid.uuid4().hex[:8]}@example.com"
    r = await client.post(
        "/community/public/auth/signup",
        headers={**svc, "X-Device-Token": device},
        json=body,
    )
    payload = r.json()
    return payload.get("token"), payload.get("account", {}).get("handle")


async def main():
    # Capture notification mail instead of sending it (pattern: e2e_portal_flow.py).
    from app.integrations.resend import templates as email_templates

    sent_emails = []

    async def _fake_send_generic(**kw):
        sent_emails.append(kw)
        return {"id": "fake-" + uuid.uuid4().hex[:8]}

    email_templates.send_generic = _fake_send_generic

    from app.agents.immigration.community.service import hash_ip, reset_rate_counters
    from app.agents.immigration.orgs.models import Organization, Seat
    from app.agents.immigration.users.models import User
    from app.core.config import get_settings
    from app.core.jwt_auth import issue_token
    from app.db.session import get_async_session
    from app.main import app

    settings = get_settings()
    suffix = uuid.uuid4().hex[:8]
    svc = {"X-API-Key": settings.api_key}

    # Rate counters are durable (Phase 2) and every ASGITransport request reports
    # as 127.0.0.1, so without this reset a few runs in one UTC day would exhaust
    # the network ceiling and this script would fail on its own history.
    async with get_async_session() as db:
        await reset_rate_counters(db, scope_type="ip", scope_key=hash_ip(TEST_CLIENT_IP))
        await db.commit()

    # An owner JWT for the moderation section (the admin queue is JWT-gated).
    async with get_async_session() as db:
        org = Organization(name=f"Inbox Test Org {suffix}", country="AU")
        db.add(org)
        await db.flush()
        user = User(email=f"mod.{suffix}@firm.com", first_name="Mo", last_name="Derator")
        db.add(user)
        await db.flush()
        seat = Seat(org_id=org.id, user_id=user.id, role="owner", status="active")
        db.add(seat)
        await db.commit()
        owner_jwt = issue_token(user.id, seat.id, org.id)

    transport = ASGITransport(app=app)
    admin = {**svc, "Authorization": f"Bearer {owner_jwt}"}

    async with httpx.AsyncClient(
        transport=transport, base_url="http://test/api/v1"
    ) as _inner:
        c = NoCookieClient(_inner)

        # ══ 1. Two members, and a question ══
        print("\n1. A asks the room a question")
        a_token, a_handle = await _signup(c, svc)
        b_token, b_handle = await _signup(c, svc)
        check("account A created", bool(a_token))
        check("account B created", bool(b_token))
        check("A and B really are different people", a_handle != b_handle)

        A = {**svc, "Authorization": f"Bearer {a_token}"}
        B = {**svc, "Authorization": f"Bearer {b_token}"}

        r = await c.post(
            "/community/journeys",
            headers=A,
            json={
                "publish": True,
                "post_type": "question",
                "title": f"820 partner visa onshore — how long after medical? {suffix}",
                "note": "Lodged a while back and still waiting on a decision.",
            },
        )
        check("A's question posted", r.status_code == 201)
        journey_id = r.json()["id"]

        # ══ 2. A starts with nothing ══
        print("\n2. Before anyone answers, the inbox is empty")
        r = await c.get("/community/me/inbox", headers=A)
        check("inbox readable by its owner", r.status_code == 200)
        check("no notifications yet", r.json()["unread_count"] == 0)
        check("no items yet", r.json()["items"] == [])

        # With the service key but no session: proves the *session* gate, not
        # just the API-key middleware, is what stands between a stranger and
        # someone's notifications.
        r = await c.get("/community/me/inbox", headers=svc)
        check(
            "the inbox is not public — a valid API key alone opens nothing",
            r.status_code in (401, 403),
        )

        # ══ 3. B answers: exactly one notification, to A only ══
        print("\n3. B answers → A is told, B is not")
        r = await c.post(
            f"/community/journeys/{journey_id}/comments",
            headers=B,
            json={"body": "Mine took about four months after the medical."},
        )
        check("B's reply landed", r.status_code == 201)
        b_comment_id = r.json()["id"]

        r = await c.get("/community/me/inbox", headers=A)
        inbox = r.json()
        check("A has exactly 1 unread", inbox["unread_count"] == 1)
        check("A has exactly 1 item", len(inbox["items"]) == 1)
        item = inbox["items"][0] if inbox["items"] else {}
        check("the notification names the replier", item.get("actor_handle") == b_handle)
        check("it is typed as a reply to a post", item.get("type") == "reply_to_post")
        check("it points back at the post", item.get("journey_id") == journey_id)
        check("it points at the reply itself", item.get("comment_id") == b_comment_id)
        check("it carries a preview of the reply", bool(item.get("preview")))
        check("it starts unread", item.get("is_read") is False)

        r = await c.get("/community/me/inbox", headers=B)
        check("B (who did the replying) has nothing", r.json()["unread_count"] == 0)

        # ══ 4. Talking to yourself notifies nobody ══
        print("\n4. A replies to her own question → still 1")
        r = await c.post(
            f"/community/journeys/{journey_id}/comments",
            headers=A,
            json={"body": "Adding: this was lodged onshore, if that matters."},
        )
        check("A's self-reply landed", r.status_code == 201)
        r = await c.get("/community/me/inbox", headers=A)
        check(
            "a self-reply creates no notification (still 1 unread)",
            r.json()["unread_count"] == 1,
        )

        # ══ 5. Replying to a comment notifies that commenter, not the OP ══
        print("\n5. A replies to B's comment → B is told, A is not re-told")
        r = await c.post(
            f"/community/journeys/{journey_id}/comments",
            headers=A,
            json={
                "body": "Thanks — did you get a s56 request first?",
                "parent_comment_id": b_comment_id,
            },
        )
        check("A's reply to B landed", r.status_code == 201)

        r = await c.get("/community/me/inbox", headers=B)
        b_inbox = r.json()
        check("B now has 1 unread", b_inbox["unread_count"] == 1)
        b_item = b_inbox["items"][0] if b_inbox["items"] else {}
        check(
            "it is typed as a reply to a comment",
            b_item.get("type") == "reply_to_comment",
        )
        check(
            "it remembers which comment was replied to",
            b_item.get("parent_comment_id") == b_comment_id,
        )

        r = await c.get("/community/me/inbox", headers=A)
        check(
            "the post's author is NOT notified about a reply aimed at B "
            "(one notification per reply, to the person answered)",
            r.json()["unread_count"] == 1,
        )

        # ══ 6. Marking read is idempotent, and scoped to its owner ══
        print("\n6. Marking read")
        notification_id = item.get("id")
        r = await c.post("/community/me/inbox/read", headers=A, json={"ids": [notification_id]})
        check("marking read succeeds", r.status_code == 200)
        check("it marked exactly one", r.json()["marked"] == 1)
        check("A's unread count drops to 0", r.json()["unread_count"] == 0)

        r = await c.post("/community/me/inbox/read", headers=A, json={"ids": [notification_id]})
        check(
            "marking the same one again is idempotent (0 marked, no error)",
            r.status_code == 200 and r.json()["marked"] == 0,
        )
        check("still 0 unread", r.json()["unread_count"] == 0)

        r = await c.get("/community/me/inbox", headers=A)
        check(
            "the read notification is still listed, just read",
            len(r.json()["items"]) == 1
            and r.json()["items"][0]["is_read"] is True,
        )

        # B tries to mark A's notification read. Must be a no-op, not an error:
        # a response that distinguishes "not yours" from "already read" is an
        # oracle for which notification ids exist.
        r = await c.post("/community/me/inbox/read", headers=B, json={"ids": [notification_id]})
        check(
            "one member cannot mark another's notification read",
            r.status_code == 200 and r.json()["marked"] == 0,
        )
        check("...and B's own unread is untouched", r.json()["unread_count"] == 1)

        r = await c.post("/community/me/inbox/read", headers=B, json={})
        check("mark-all clears the rest", r.json()["unread_count"] == 0)

        # ══ 7. The "You" profile ══
        print("\n7. The You profile: Posts and Comments")
        r = await c.get("/community/me/posts", headers=A)
        check("A's posts listed", r.status_code == 200)
        posts = r.json()
        check("A sees exactly her one post", len(posts) == 1)
        check("it is the question she asked", posts[0]["id"] == journey_id)
        check("her own post is marked as hers", posts[0]["is_mine"] is True)

        r = await c.get("/community/me/comments", headers=A)
        my_comments = r.json()
        check("A's comments listed", r.status_code == 200)
        check("A wrote two replies", len(my_comments) == 2)
        check(
            "each reply carries its post's context (a comment alone is unreadable)",
            all(cm["journey_id"] == journey_id for cm in my_comments)
            and all(cm.get("journey_title") for cm in my_comments),
        )

        r = await c.get("/community/me/posts", headers=B)
        check("B's post list does not contain A's post", r.json() == [])
        r = await c.get("/community/me/comments", headers=B)
        check("B's comment list holds only B's own reply", len(r.json()) == 1)

        # ══ 8. Moderating content away takes it out of the inbox ══
        print("\n8. Moderation removes the notification with the content")
        c_token, _ = await _signup(c, svc)
        C = {**svc, "Authorization": f"Bearer {c_token}"}
        # This body used to read "Message me on WhatsApp, I can lodge this for
        # you cheap." — which p6's touting screen now auto-holds before anyone
        # can report it, so it never reaches an inbox and there is no
        # notification left for a moderator to remove. That is the anti-spam
        # phase working, not this test breaking, but it made section 8 test
        # nothing.
        #
        # The body is now something only a human can judge — an unpleasant
        # remark with no pattern to match — so this section still exercises what
        # it was written for: a moderator taking content down, and the inbox
        # entry going with it. The auto-hold path is covered directly in
        # tests/e2e_community_antispam.py.
        r = await c.post(
            f"/community/journeys/{journey_id}/comments",
            headers=C,
            json={
                "body": "Honestly, people who ask this are wasting everyone's time."
            },
        )
        check("the objectionable reply landed", r.status_code == 201)
        bad_comment_id = r.json()["id"]

        r = await c.get("/community/me/inbox", headers=A)
        check("A was notified about it", r.json()["unread_count"] == 1)

        r = await c.post(
            f"/community/comments/{bad_comment_id}/report",
            headers=svc,
            json={"reason": "spam", "description": "touting"},
        )
        check("it was reported", r.status_code == 201)
        report_id = r.json()["id"]

        r = await c.post(
            f"/community/admin/reports/{report_id}/action",
            headers=admin,
            json={"action": "remove", "note": "touting"},
        )
        check("a moderator removed it", r.status_code == 200)

        r = await c.get("/community/me/inbox", headers=A)
        after = r.json()
        check(
            "the notification is gone from A's inbox",
            all(i["comment_id"] != bad_comment_id for i in after["items"]),
        )
        check("...and no longer counts as unread", after["unread_count"] == 0)

        # ══ 9. Email: opt-in, batched, and says nothing ══
        print("\n9. Reply email — one send for three replies, and it gives nothing away")
        # Force the send path on regardless of local env: without a Resend key
        # deliver_reply_emails correctly does nothing, and this section would
        # pass by testing nothing at all.
        settings.resend_api_key = settings.resend_api_key or "test-key-not-used"
        check("email sending is enabled for this section", settings.resend_configured)

        sent_emails.clear()
        d_email = f"member.{suffix}@example.com"
        d_token, _ = await _signup(c, svc, email=d_email)
        D = {**svc, "Authorization": f"Bearer {d_token}"}

        r = await c.post(
            "/community/journeys",
            headers=D,
            json={
                "publish": True,
                "post_type": "question",
                "title": f"820 partner visa — bridging while onshore? {suffix}",
                "note": "Sponsor lodged in March, still no medical request.",
            },
        )
        check("D's question posted", r.status_code == 201)
        d_journey = r.json()["id"]

        for i in range(3):
            r = await c.post(
                f"/community/journeys/{d_journey}/comments",
                headers=B,
                json={"body": f"Reply number {i} on the same thread."},
            )
            check(f"rapid reply {i + 1} landed", r.status_code == 201)

        r = await c.get("/community/me/inbox", headers=D)
        check("all three replies reached the in-app inbox", r.json()["unread_count"] == 3)
        check(
            "but exactly ONE email was sent for the three "
            "(a popular question must not send twenty)",
            len(sent_emails) == 1,
        )

        mail = sent_emails[0] if sent_emails else {}
        check("the email went to the right address", mail.get("to") == d_email)

        subject = (mail.get("subject") or "")
        check(
            "the subject is the neutral one",
            subject == "You have a new reply on immi360",
        )

        # The hard rule. Sweep everything that can be seen without opening the
        # email — subject and preheader — plus the body, for anything that names
        # the topic. Shared inboxes make a revealing subject a real-world harm.
        visible = " ".join(
            [
                subject,
                mail.get("preheader") or "",
                mail.get("headline") or "",
                mail.get("eyebrow_text") or "",
                mail.get("body_html") or "",
            ]
        )
        leaked = _leaks(visible)
        check(
            f"the email names no visa subclass or topic anywhere (found: {leaked})",
            not leaked,
        )
        check(
            "the email does not quote the question's title",
            not _leaks(visible, ["how long after medical"]),
        )
        check(
            "the email does not quote the reply body",
            not _leaks(visible, ["reply number"]),
        )
        check("the email still gets the member somewhere useful", bool(mail.get("cta_url")))

        # Load-bearing: the sweep above is only meaningful if it can fail. Run
        # the exact same function over the subject line we are refusing to ship
        # and confirm it objects. Without this, a sweep looking at nothing at
        # all would report all-green.
        check(
            "the sweep is load-bearing — it rejects the subject we refuse to send",
            _leaks("New reply on your 820 partner visa question") != [],
        )

        # ══ 10. A member with no email is not a problem ══
        print("\n10. No email address is a supported state, not a degraded one")
        sent_emails.clear()
        r = await c.post(
            f"/community/journeys/{journey_id}/comments",
            headers=B,
            json={"body": "One more thought on this."},
        )
        check("reply to the emailless member A landed", r.status_code == 201)
        r = await c.get("/community/me/inbox", headers=A)
        check("A still gets the in-app notification", r.json()["unread_count"] == 1)
        check("no email was attempted for her", len(sent_emails) == 0)

        # ══ 11. The off-switch works ══
        print("\n11. Reply emails can be switched off")
        r = await c.get("/community/me/notification-preferences", headers=D)
        check("preferences readable", r.status_code == 200)
        check("email replies default to on for a member with an address",
              r.json()["email_replies"] is True)
        check("...and the endpoint says an address exists",
              r.json()["email_available"] is True)

        r = await c.post(
            "/community/me/notification-preferences",
            headers=D,
            json={"email_replies": False},
        )
        check("preference saved", r.status_code == 200 and r.json()["email_replies"] is False)

        # Signup now requires an email, so an address-less member can only be a
        # legacy row — one claimed before the requirement landed. Build that
        # state directly, because the endpoint still has to report it honestly.
        async with get_async_session() as db:
            await db.execute(
                sa.text(
                    "UPDATE anon_identities SET email_pending = NULL, "
                    "email_verified = NULL WHERE handle = :h"
                ),
                {"h": a_handle},
            )
            await db.commit()

        r = await c.get("/community/me/notification-preferences", headers=A)
        check(
            "a legacy member with no address is told the preference is inert",
            r.json()["email_available"] is False,
        )

        # Saving the preference is not the point — it having an effect is. A
        # fresh member on a fresh thread, so today's batch cannot be what
        # suppresses the send.
        sent_emails.clear()
        e_email = f"optout.{suffix}@example.com"
        e_token, _ = await _signup(c, svc, email=e_email)
        E = {**svc, "Authorization": f"Bearer {e_token}"}
        r = await c.post(
            "/community/me/notification-preferences",
            headers=E,
            json={"email_replies": False},
        )
        check("E switches reply emails off", r.json()["email_replies"] is False)

        r = await c.post(
            "/community/journeys",
            headers=E,
            json={
                "publish": True,
                "post_type": "question",
                "title": f"Question from someone who opted out {suffix}",
                "note": "Should never generate an email.",
            },
        )
        e_journey = r.json()["id"]
        r = await c.post(
            f"/community/journeys/{e_journey}/comments",
            headers=B,
            json={"body": "Answering the member who opted out."},
        )
        check("the reply to E landed", r.status_code == 201)
        check("no email was sent — the off-switch is wired, not decorative",
              len(sent_emails) == 0)
        r = await c.get("/community/me/inbox", headers=E)
        check(
            "...but the in-app notification still arrived (the inbox has no off-switch)",
            r.json()["unread_count"] == 1,
        )

        # ══ 12. A notification banked before signup survives the claim ══
        print("\n12. A reply to a visitor waits for them to claim the account")
        r = await c.post("/community/public/identity", headers=svc)
        visitor_device = r.json()["device_token"]
        V = {**svc, "X-Device-Token": visitor_device}
        r = await c.post(
            "/community/journeys",
            headers=V,
            json={
                "publish": True,
                "post_type": "question",
                "title": f"Asked before signing up {suffix}",
                "note": "Posted from a device with no account yet.",
            },
        )
        check("a visitor can still post", r.status_code == 201)
        visitor_journey = r.json()["id"]

        r = await c.post(
            f"/community/journeys/{visitor_journey}/comments",
            headers=B,
            json={"body": "Answering someone who has not signed up yet."},
        )
        check("someone answered the visitor", r.status_code == 201)

        r = await c.post(
            "/community/public/auth/signup",
            headers={**svc, "X-Device-Token": visitor_device},
            json={"password": PASSWORD, "email": f"inbox-{uuid.uuid4().hex[:8]}@example.com"},
        )
        check("the visitor claims the account", r.status_code == 201)
        V_auth = {**svc, "Authorization": f"Bearer {r.json()['token']}"}

        r = await c.get("/community/me/inbox", headers=V_auth)
        check(
            "the reply was waiting in the inbox — no backfill needed",
            r.json()["unread_count"] == 1,
        )

        # Leave the machine clean for the next script.
        async with get_async_session() as db:
            await reset_rate_counters(
                db, scope_type="ip", scope_key=hash_ip(TEST_CLIENT_IP)
            )
            await db.commit()

    print()
    if _failures:
        print(f"{FAIL} {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"    - {f}")
        raise SystemExit(1)
    print(f"{PASS} All community inbox checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
