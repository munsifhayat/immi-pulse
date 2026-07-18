# PROGRESS — Community-first MVP, end to end

Epic: Turn immi360 into a community platform — pseudonymous Reddit-style accounts with an inbox, app-shell homepage, unified wait-check/timeline flow, dual-source (Official vs Room) wait data, and a self-running trust ladder.
Integration branch: feat/community-mvp
Base: main
Phase status: [done] p1 · [pending] p2 · [pending] p3 · [pending] p4 · [pending] p5 · [pending] p6

<!--
Legend: pending → in_progress → done  (or blocked)
Append one handoff block per finished phase below. The handoff carries CONCLUSIONS
the next phase needs — not the conversation.
-->

## Standing constraints (apply to every phase)

- **Do not deploy.** No Heroku push, no Vercel deploy, no merge to `main`. The final `feat/community-mvp` → `main` PR is left for the human.
- Backend: `source .venv/bin/activate` + `PYTHONPATH=src` for every command. Run locally on `PORT=8001` (the frontend's `.env.local` expects it).
- Frontend: **bun only** — never npm/yarn/pnpm.
- Alembic must stay on a **single head** (`e5f7a9c1b3d5` before p1).
- New no-API-key routes must live under `/api/v1/community/public/...`.
- Backend testing convention: pure-logic tests in `tests/agents/...`; flow coverage in standalone `tests/e2e_*.py` scripts driven by `httpx.ASGITransport`. There is no router-level pytest.
- Frontend has **no test runner**. `bun run lint && bunx tsc --noEmit && bun run build` are the only gates — drive the real flow before calling a phase done.

## Decided (do not re-litigate)

- **One pseudonymous account, Reddit-style.** Assigned username (existing `generate_handle()`), member-set password, **email optional** — used only for password recovery and reply notifications, never displayed, never required.
- **No email means no account recovery.** Say it plainly at signup.
- **The in-app inbox is the primary notification channel.** Email is the opt-in pull-back layer on top. This is what makes optional email workable.
- **Writing requires an account.** T0 visitors read, search, and run Wait Check freely.
- **Implementation:** evolve `anon_identities` into the account table rather than adding a parallel one — every `Journey`/`JourneyComment` already FKs to `identity_id`, so no content migration is needed. Table keeps its name; the naming debt is accepted deliberately.
- **Five tiers:** T0 Visitor · T1 New account (probation) · T2 Established · T3 Trusted · T4 Registered professional. Email verification is not a tier — it shortens probation.
- **Two post actions** (upvote, reply) with share as a quiet third; reply nesting capped at one level.
- **Neutral notification email subjects** — never name a visa subclass or topic. Members share inboxes with partners and employers.

## Open decisions (resolve when the phase reaches them)

1. **Do the 141 scraped `is_sample` timelines feed public numbers?** (blocks p4)
   Stats-isolated today. Excluded, most cohorts have no publishable median at launch and the dual-source table shows a dash beside every official figure. Included, the numbers work immediately but rest partly on forum-scraped data.
   *Recommendation:* include them with provenance stated in the open — "based on 141 reported timelines, 66 collected from public forums". Transparency about a number's origin is more defensible than a dash.

2. **Real per-IP ceiling.** (p2 sets a starting value, p6 tunes it)
   Accounts are free to create, so per-account caps alone do not bind — the per-IP ceiling and new-account probation are the controls that do.
   *Starting value:* 25 posts / 60 replies per IP per day; log every rejection and tune from the first fortnight of real traffic.

3. **Kaplan–Meier scope in p4.** If the censoring-corrected median does not land comfortably inside the phase, ship honest denominators (sample size + pending + as-at date on every figure) and record the deferral rather than stretching the phase.

## Known risk accepted

Requiring an account before the first post will cost some early volume while the room is empty. Accepted knowingly: an anonymous fifteen-second signup is a low bar, and the alternative is people posting into a void they can never find again.

---

## Handoff — p1 Pseudonymous accounts · done · 2026-07-18

Branch `feat/community-mvp-p1-accounts` → PR into `feat/community-mvp` (squash-merged).
Note the branch name: git cannot create `feat/community-mvp/p1-accounts` while the branch
`feat/community-mvp` exists (a ref cannot be both file and directory), so every phase branch
in this epic must use the hyphenated `feat/community-mvp-pN-...` form.

### Shipped vs planned

All Phase-1 acceptance criteria are met. Three things went beyond the written scope because
the phase could not honestly be called done without them:

1. **Session-aware reads and writes.** "Log in from a second device and find your posts"
   is the phase goal, but the feed resolved identity from the device token only, so a
   signed-in member on a new device would have seen their own posts as a stranger's. The
   public journey/comment/vote routes now resolve the session first and the device token
   second (`_viewer_identity`, `_writer_identity`).
2. **Device cookie applied at bootstrap, not just at signup** — otherwise the durable
   cookie would only ever reach members who already signed up, which is backwards.
3. **`e2e_community_moderation.py` updated** (see gotcha 1 — a real behaviour change, not
   a flaky test).

Deliberately NOT built (still out of scope, as planned): email *verification* send/confirm
(the column exists and is always NULL), magic links, OAuth, frontend auth UI, trust tiers,
inbox.

### Key decisions

- **Handle is the login identifier**, not the email — email is optional, so it cannot be
  the credential. Handle lookup is case-insensitive; rerolling is blocked once a password
  exists (`service.py:711`), since a reroll would silently change what you sign in with.
- **`account_out` carries `has_email`, never the address.** A serializer that never holds
  the value cannot leak it, which is a stronger guarantee than remembering to strip it.
- **Recovery is a non-oracle**: identical response and identical body for known and unknown
  addresses, asserted by comparing the two responses in the e2e.
- **Login failures are indistinguishable** — unknown handle and wrong password return the
  same string, also asserted.
- **Lockout over rate-limiting** for login: 8 failures → 15-minute lock, on the account row.
  Deliberately not routed through `_consume_rate`, which p2 is about to replace wholesale.
- **Recovery tokens stored hashed** (SHA-256), single-use, 60-minute TTL.
- **Session TTL 90 days** — this audience returns monthly across a 14-month wait; a 14-day
  token would log people out between visits.
- **Community accounts lift the one-timeline cap** exactly as a portal account does
  (`identity_out.is_claimed` now ORs `password_hash`).

### Interfaces produced

- `community/accounts.py:79` `issue_community_session_jwt(account) -> (token, exp)`
- `community/accounts.py:91` `decode_community_session_jwt(token) -> CommunitySession`
- `community/accounts.py:118` `require_community_account` — **no seat, no org**; the
  dependency p3 should hang the inbox off
- `community/accounts.py:141` `optional_community_account` — 401-free variant for open reads
- `community/accounts.py:161` `device_token_from_request(request)` — header, then cookie
- `community/accounts.py:174` `set_device_cookie(response, token)`
- `community/accounts.py:224` `CommunityAccountService` — `.signup` `.login`
  `.begin_recovery` `.complete_recovery` `.get_by_handle` `.get_by_email` `.account_out`
- `community/accounts.py:48` `SESSION_JWT_AUDIENCE = "immi-pulse.community.session"`
- `community/models.py:61` `AnonIdentity` + `.is_account` property
- Routes: `POST /community/public/auth/{signup,login,recover,reset}`,
  `GET /community/public/auth/me` (`community/router.py:256-360`)
- Migration `f1a3c5e7b9d2` (down_revision `e5f7a9c1b3d5`)

### Gotchas for the next phase

1. **The device cookie changes multi-device test simulation.** One httpx client = one cookie
   jar = one device now. `e2e_community_moderation.py` was simulating two devices on one
   client and started failing correctly; it now clears cookies between bootstraps
   (`e2e_community_moderation.py:85-96`). Any new e2e that fakes several devices must do the
   same, or use the `NoCookieClient` wrapper in `tests/e2e_community_accounts.py:39`.
2. **The moderation queue legitimately exposes a handle.** `/community/admin/reports`
   returns `target_handle` — a moderator cannot action content without knowing whose it is.
   The leak sweep treats this as one explicit, named exception and asserts the sweep would
   have caught it ("sweep is load-bearing"), so an all-green result cannot mean the sweep
   was simply looking at nothing. **Email has no exception anywhere.** If p6 adds moderator
   surfaces, keep email out of them.
3. **`server.py` ignores `PORT`** — it binds 8000 regardless. Use
   `uvicorn app.main:app --port 8001` directly. There was also a stale dev server already
   holding :8000 on this machine, which silently shadows a newly started one; check
   `lsof -nP -iTCP:8000 -sTCP:LISTEN` before trusting a live-HTTP result.
4. **Cookie is `SameSite=Lax` in dev, `None; Secure` in prod**, switched off
   `settings.frontend_url` starting with `http://localhost` (`accounts.py:174`). Browsers
   drop a `Secure` cookie over plain http, so this cannot be a single fixed value. p5 must
   send `credentials: 'include'` for the cookie to travel cross-origin.
5. **`login` commits on failure** to persist the failed-attempt counter — do not "tidy" that
   commit away or throttling silently stops counting.
6. Two accounts may both have NULL email under the unique index (Postgres treats NULLs as
   distinct) — which is exactly what makes optional email workable.

### Verify → result

- `PYTHONPATH=src pytest tests/ -v` → **75 passed** (60 before, 15 new in
  `tests/agents/immigration/test_community_accounts.py`)
- `PYTHONPATH=src python tests/e2e_community_accounts.py` → **65 checks, all passed**
- `PYTHONPATH=src alembic upgrade head && PYTHONPATH=src alembic heads` → **`f1a3c5e7b9d2`,
  exactly one head**
- Regression: `e2e_community_moderation.py` and `e2e_portal_flow.py` both pass
- Driven live over real HTTP (not just ASGI in-process): bootstrap → signup → `auth/me`
  with and without the API key (public prefix exempt, 200 both ways) → cross-device login →
  identical failure strings → non-oracle recovery → `Set-Cookie: ip_device … HttpOnly`

---
