"""End-to-end proof that an account and a browser are now different things.

Run against a live DB:  PYTHONPATH=src python tests/e2e_community_identity_swap.py

``anon_identities`` used to be the browser row and the account row at once,
welded together by ``device_token NOT NULL UNIQUE``. Every consequence of that
was the same consequence — a browser and an account could not be told apart:

  - signing up on a browser that already had an account returned 409, a dead
    end on any shared or second-hand computer;
  - after logging out the browser still resolved to the account, so the next
    anonymous post was filed under a stranger's pseudonym, their posts rendered
    as ``is_mine``, and their rate-limit bucket was charged;
  - logging in rebound the browser to the account's token, so two browsers
    converged onto one identity.

Everything here runs on ONE simulated browser, because that is the only place
those bugs are visible. The whole file is a single narrative: arrive → post
anonymously → join → log out → post again → join again → log in. It ends on the
duplicate-email recovery case, which is the other half of the same decision:
pending addresses stay non-unique, so recovery must serve every claimant rather
than refusing to guess between them.
"""

import os

# Must be set before the first get_settings() — encryption.py calls it at import.
os.environ["BREACH_CHECK_ENABLED"] = "false"

import asyncio
import uuid

import httpx
from httpx import ASGITransport

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
_failures = []


def check(label, cond):
    print(f"  {PASS if cond else FAIL} {label}")
    if not cond:
        _failures.append(label)
    return cond


class Browser:
    """One browser: a live cookie jar plus a localStorage mirror.

    Deliberately *not* the ``NoCookieClient`` of ``e2e_community_accounts.py``.
    That helper drops the cookie jar after every call so device identity is
    purely header-driven, which is exactly right for proving the cross-device
    claims it makes — and exactly wrong here. The bug this file guards is that
    the HttpOnly ``ip_device`` cookie outlived logout, and a client that forgets
    cookies cannot see it.

    Header assembly mirrors the real frontend interceptor (``lib/api/client.ts``):
    the device token rides on every request, and the community session rides on
    community routes.
    """

    def __init__(self, client: httpx.AsyncClient, api_key: str):
        self._c = client
        self._api_key = api_key
        self.device_token: str | None = None  # localStorage mirror
        self.session: str | None = None  # ip_community_token

    def _headers(self, *, anon: bool = False) -> dict:
        headers = {"X-API-Key": self._api_key}
        if self.device_token:
            headers["X-Device-Token"] = self.device_token
        if self.session and not anon:
            headers["Authorization"] = f"Bearer {self.session}"
        return headers

    async def post(self, url, *, anon: bool = False, **kw):
        return await self._c.post(url, headers=self._headers(anon=anon), **kw)

    async def get(self, url, *, anon: bool = False, **kw):
        return await self._c.get(url, headers=self._headers(anon=anon), **kw)

    @property
    def cookie(self) -> str | None:
        return self._c.cookies.get("ip_device")

    # --- The three actions that move identity around ---

    async def bootstrap(self):
        r = await self.post("/community/public/identity", anon=True)
        self.device_token = r.json()["device_token"]
        return r

    async def signup(self, email: str, password: str):
        r = await self.post(
            "/community/public/auth/signup",
            json={"password": password, "email": email},
        )
        if r.status_code == 201:
            self.session = r.json()["token"]
        return r

    async def login(self, handle: str, password: str):
        r = await self.post(
            "/community/public/auth/login",
            anon=True,
            json={"handle": handle, "password": password},
        )
        if r.status_code == 200:
            self.session = r.json()["token"]
        return r

    async def logout(self):
        """Mirrors ``useCommunityLogout``: drop the local copies, then take the
        fresh anonymous identity the server hands back."""
        r = await self.post("/community/public/auth/logout")
        self.session = None
        if r.status_code == 200:
            self.device_token = r.json()["device_token"]
        return r


async def main():
    from app.integrations.resend import templates as email_templates

    sent_emails = []

    async def _fake_send_generic(**kw):
        sent_emails.append(kw)
        return {"id": "fake-" + uuid.uuid4().hex[:8]}

    email_templates.send_generic = _fake_send_generic

    from sqlalchemy import select

    from app.agents.immigration.community.models import AnonIdentity
    from app.agents.immigration.community.service import hash_ip, reset_rate_counters
    from app.core.config import get_settings
    from app.db.session import get_async_session
    from app.main import app

    settings = get_settings()
    suffix = uuid.uuid4().hex[:8]
    api_key = settings.api_key

    # Every ASGITransport request reports as 127.0.0.1 and the write-allowance
    # counters are durable, so without this a few runs in one UTC day would
    # exhaust the ceiling and this script would fail on its own history.
    async with get_async_session() as db:
        await reset_rate_counters(db, scope_type="ip", scope_key=hash_ip("127.0.0.1"))
        await db.commit()

    async def row_for(handle: str) -> AnonIdentity | None:
        async with get_async_session() as db:
            return (
                await db.execute(
                    select(AnonIdentity).where(AnonIdentity.handle == handle)
                )
            ).scalar_one_or_none()

    transport = ASGITransport(app=app)
    base = "http://test/api/v1"
    svc = {"X-API-Key": api_key}

    async with httpx.AsyncClient(transport=transport, base_url=base) as client:
        b = Browser(client, api_key)

        # ══ 1. A visitor arrives, posts, and only then joins ══════════════════
        #
        # The order matters: the product asks people to do the thing first and
        # sign up after, so signup has to be able to *adopt* what is already
        # here rather than start them over.
        r = await b.bootstrap()
        check("browser bootstrapped an anonymous identity", r.status_code == 200)
        anon_handle = r.json()["handle"]
        device_1 = b.device_token
        check("...and the durable cookie was set", bool(b.cookie))
        check("...matching the token it was handed", b.cookie == device_1)

        r = await b.post(
            "/community/journeys",
            json={
                "post_type": "question",
                "title": f"Is my wait normal? {suffix}",
                "note": "Asked before I had an account.",
            },
        )
        check("anonymous question posted", r.status_code == 201)
        pre_join_id = r.json()["id"]
        check(
            "...attributed to the browser's anonymous handle",
            r.json()["handle"] == anon_handle,
        )

        email_1 = f"first.{suffix}@example.com"
        r = await b.signup(email_1, "first-account-password-1")
        check("signup on an unclaimed browser succeeds", r.status_code == 201)
        check(
            "...and ADOPTS the row, keeping the handle it already had",
            r.json()["account"]["handle"] == anon_handle,
        )
        account_1_handle = anon_handle

        r = await b.get(f"/community/public/journeys/{pre_join_id}")
        check(
            "...so the pre-join post carries over as theirs",
            r.json().get("is_mine") is True,
        )

        row = await row_for(account_1_handle)
        check("the account exists in the database", row is not None)
        check(
            "...and holds NO device token — an account is not a browser",
            row is not None and row.device_token is None,
        )

        # ══ 2. Logging out has to make the browser a stranger ═════════════════
        #
        # This is the headline bug. The device token lived in an HttpOnly
        # cookie no script could clear, so "log out" cleared the session and
        # left the browser still resolving to the account behind it.
        r = await b.logout()
        check("logout succeeds", r.status_code == 200)
        check(
            "...and hands back a usable identity rather than nothing",
            bool(r.json().get("device_token")) and bool(r.json().get("handle")),
        )
        check("...with a different device token", b.device_token != device_1)
        check("...and a rewritten cookie", b.cookie == b.device_token)
        post_logout_handle = r.json()["handle"]
        check(
            "...whose handle is not the account's",
            post_logout_handle != account_1_handle,
        )

        r = await b.post(
            "/community/journeys",
            anon=True,
            json={
                "post_type": "question",
                "title": f"Second question, signed out {suffix}",
                "note": "Posted by whoever sat down next.",
            },
        )
        check("a signed-out write still works", r.status_code == 201)
        check(
            "...and is NOT stamped with the previous member's handle",
            r.json()["handle"] != account_1_handle,
        )
        check(
            "...it belongs to the fresh identity instead",
            r.json()["handle"] == post_logout_handle,
        )

        r = await b.get(f"/community/public/journeys/{pre_join_id}", anon=True)
        check(
            "the member's own post is no longer 'mine' to this browser",
            r.json().get("is_mine") is not True,
        )

        # ══ 3. Joining again on the same browser ══════════════════════════════
        #
        # Used to be 409 "This device already has an account. Log in instead."
        # — advice the person at the keyboard cannot take, because it is not
        # their account and they do not have its password.
        email_2 = f"second.{suffix}@example.com"
        r = await b.signup(email_2, "second-account-password-2")
        check("a second signup on the SAME browser succeeds (no 409)", r.status_code == 201)
        account_2_handle = r.json()["account"]["handle"]
        check(
            "...and it is a genuinely different account",
            account_2_handle != account_1_handle,
        )

        row_1, row_2 = await row_for(account_1_handle), await row_for(account_2_handle)
        check("both accounts exist as distinct rows", row_1 is not None and row_2 is not None)
        check(
            "...with distinct ids",
            row_1 is not None and row_2 is not None and row_1.id != row_2.id,
        )
        check(
            "...and neither is addressable by a browser",
            row_1 is not None
            and row_2 is not None
            and row_1.device_token is None
            and row_2.device_token is None,
        )

        # ══ 4. Logging in must not touch the browser ══════════════════════════
        #
        # Every session issue used to rebind the cookie to the account's token,
        # which is how a second browser stopped having an identity of its own.
        await b.logout()
        r = await b.bootstrap()
        browsers_own_handle = r.json()["handle"]
        device_before_login = b.device_token
        cookie_before_login = b.cookie

        r = await b.login(account_1_handle, "first-account-password-1")
        check("login from this browser succeeds", r.status_code == 200)
        check(
            "...and resolves the right account",
            r.json()["account"]["handle"] == account_1_handle,
        )
        check(
            "...and the response carries no device token to copy",
            "device_token" not in r.json(),
        )
        check(
            "...and sets no device cookie",
            "ip_device" not in r.headers.get("set-cookie", ""),
        )
        check("...so the browser's token is untouched", b.device_token == device_before_login)
        check("...and so is its cookie", b.cookie == cookie_before_login)

        r = await b.post("/community/public/identity", anon=True)
        check(
            "the browser still has its own anonymous identity behind the session",
            r.json()["handle"] == browsers_own_handle,
        )

        # ══ 5. Two accounts, one unverified email — both must recover ═════════
        #
        # Pending addresses are deliberately non-unique: making them unique is
        # what lets a stranger burn an address before its owner arrives. The
        # price was that a duplicate locked BOTH members out of recovery,
        # permanently and silently. Serving every claimant is the fix.
        shared_email = f"shared.{suffix}@example.com"
        handles = []
        for n in (1, 2):
            async with httpx.AsyncClient(transport=transport, base_url=base) as fresh:
                other = Browser(fresh, api_key)
                await other.bootstrap()
                r = await other.signup(shared_email, f"shared-claimant-pass-{n}0")
                check(f"claimant {n} signs up on the shared address", r.status_code == 201)
                handles.append(r.json()["account"]["handle"])

        sent_emails.clear()
        r = await client.post(
            "/community/public/auth/recover", headers=svc, json={"email": shared_email}
        )
        check("recovery on the duplicated address is accepted", r.status_code == 200)
        check("...and mails BOTH claimants", len(sent_emails) == 2)
        check(
            "...each naming its own handle so they can be told apart",
            {h for h in handles if any(h in e.get("body_html", "") for e in sent_emails)}
            == set(handles),
        )

        tokens = [e.get("cta_url", "").split("token=", 1)[-1] for e in sent_emails]
        check("...with a distinct single-use token each", len(set(tokens)) == 2)

        # The real test of "recovery works for everyone": both get back in.
        recovered = 0
        for token in tokens:
            r = await client.post(
                "/community/public/auth/reset",
                headers=svc,
                json={"token": token, "password": f"recovered-{suffix}-99"},
            )
            if r.status_code == 200:
                recovered += 1
        check("both claimants can reset their password", recovered == 2)

        logged_in = 0
        for handle in handles:
            r = await client.post(
                "/community/public/auth/login",
                headers=svc,
                json={"handle": handle, "password": f"recovered-{suffix}-99"},
            )
            if r.status_code == 200:
                logged_in += 1
        check("...and both can log in afterwards", logged_in == 2)

    print()
    if _failures:
        print(f"{FAIL} {len(_failures)} check(s) failed:")
        for f in _failures:
            print(f"    - {f}")
        raise SystemExit(1)
    print(f"{PASS} All identity-swap checks passed.")


if __name__ == "__main__":
    asyncio.run(main())
