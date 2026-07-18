# PROGRESS — Community-first MVP, end to end

Epic: Turn immi360 into a community platform — pseudonymous Reddit-style accounts with an inbox, app-shell homepage, unified wait-check/timeline flow, dual-source (Official vs Room) wait data, and a self-running trust ladder.
Integration branch: feat/community-mvp
Base: main
Phase status: [done] p1 · [done] p2 · [pending] p3 · [pending] p4 · [pending] p5 · [pending] p6

<!--
Legend: pending → in_progress → done  (or blocked)
Append one handoff block per finished phase below. The handoff carries CONCLUSIONS
the next phase needs — not the conversation.
-->

## Standing constraints (apply to every phase)

- **Do not deploy.** No Heroku push, no Vercel deploy, no merge to `main`. The final `feat/community-mvp` → `main` PR is left for the human.
- Backend: `source .venv/bin/activate` + `PYTHONPATH=src` for every command. Run locally on `PORT=8001` (the frontend's `.env.local` expects it).
- Frontend: **bun only** — never npm/yarn/pnpm.
- Alembic must stay on a **single head** (`e5f7a9c1b3d5` before p1; `b3d5f7a9c1e4` after p2).
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

2. **Real per-IP ceiling.** (p2 set the starting value — **still open for p6 to tune**)
   Accounts are free to create, so per-account caps alone do not bind — the per-IP ceiling and new-account probation are the controls that do.
   *Shipped starting value:* 25 posts / 60 replies / 30 reports per IP per day (`tiers.IP_CEILING`). Every rejection is logged at WARNING with `scope=ip action=… cap=… signed_in=…`, so the first fortnight of real traffic can move it.
   **Known tension p6 must confront with data:** the ceiling applies to signed-in accounts too, so a lecture theatre or share house behind one NAT holding more than five active T1 members would trip it. Applying it only to account-less writers was considered and rejected — it would be defeated by signing up, which is free. The mitigations shipped instead: the bucket resets at UTC midnight, and an operator can clear a scope outright (`service.reset_rate_counters`), so the failure mode is "come back tomorrow or ask us", never a ban.

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

### Verify → result (p1)

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

## Handoff — p2 Durable rate limiting & tier scaffolding · done · 2026-07-18

Branch `feat/community-mvp-p2-ratelimits` → PR into `feat/community-mvp` (squash-merged).

### Shipped vs planned

Every Phase-2 acceptance criterion is met. Three things went slightly past the written
scope, each because the phase could not be called done without it:

1. **`reset_rate_counters`.** Durable counters need an escape hatch or the standing
   "IP throttling must never hard-ban" constraint is unenforceable — a shared campus
   address that trips the ceiling honestly would otherwise just have to wait out the day.
   It is also what makes the e2e scripts re-runnable (see gotcha 1).
2. **`remaining_allowance`.** p5's criterion is "show the sign-in prompt **before** a write
   is attempted — never a 429 after the fact", which is impossible without a read-only peek
   at what is left. Built as a service function only; p5 wires the route and the UI.
3. **Two existing e2e scripts gained a counter reset** at startup. A real consequence of
   durability, not a fudge — see gotcha 1.

Deliberately NOT built (still p6, as planned): promotion criteria, the nightly recompute
job, link gating, touting patterns, velocity/similarity detection, shadow-limit
*enforcement*. p2 added the columns those will write to and read from, nothing more.

### Key decisions

- **Concrete actions collapse into three families before a counter is touched** —
  `post` (journey/question/timeline/thread), `reply` (comment), `report`. One knob per
  family instead of one per endpoint. Reports are their own family on purpose: throttling
  them like posts would suppress the moderation signal that keeps the room clean.
- **Fixed daily buckets, not a rolling window.** `window_start` = UTC midnight, so an
  increment is one `INSERT … ON CONFLICT DO UPDATE … RETURNING` — atomic, race-free, one
  round trip. A rolling window needs read-filter-write, which two concurrent requests
  interleave into a lost update. The cost is a boundary effect (spend today's allowance at
  23:59 and tomorrow's at 00:01); acceptable for daily caps on a forum.
- **Consumption rides the caller's transaction.** A write rejected for any later reason
  (cap error, validation, the 409 timeline cap) rolls its own consumption back, so
  allowance is only spent on writes that actually landed. Consequence p6 should know:
  *rejected attempts are not themselves counted*. Counting attempts is velocity detection
  and belongs in p6, not in this counter.
- **A passwordless row is T0 regardless of its `trust_tier` column.** The column defaults
  to 1 on every row including bare devices, so reading it alone would hand a brand-new
  visitor a member's allowance. `tiers.effective_tier` checks for an account first.
- **T0 is tighter than T1, not zero.** Anonymous writing is on its way out but the gate is
  p5's; zeroing it here would have broken every anonymous write in a scaffolding phase.
  T0 = 2 posts / 10 replies vs T1 = 5 / 20, so the value of signing up is already visible.
- **T4 mirrors T3 on volume.** Being a registered agent is a disclosure obligation, not a
  licence to post more; the only thing T4 unlocks is the badge saying who you are.
- **Limit messages never state the number.** A visible cap is a plannable cap, and "you
  have 2 posts left" reads as an accusation to the many more people who will meet it
  innocently than abusively. The e2e asserts the message contains no digits.
- **Account and IP refusals say different things.** IP refusals name the *network*, offer
  signing in as the remedy, and are temporary on their face — asserted in the e2e.
- **Login lockout still bypasses this layer**, exactly as p1 left it (8 failures → 15-min
  lock on the account row). It was deliberately kept off the module dict p2 replaced, and
  routing it through daily counters now would be a downgrade: lockout needs minutes, not
  days.

### Interfaces produced

- `community/tiers.py` — pure policy, no I/O, no service imports:
  - `:171` `caps_for(tier) -> Caps` (clamps out-of-range rather than raising)
  - `:46-50` `T0_VISITOR … T4_PROFESSIONAL`, `:52-53` `MIN_TIER`/`MAX_TIER`
  - `:142` `_TIER_CAPS` — T1 = 5 posts / 20 replies, the specified anchor
  - `:159` `IP_CEILING` = 25 posts / 60 replies / 30 reports
  - `:168` `ANON_IP_TIMELINE_CAP` = 2 (moved here from `service.py`; **not** a rate
    counter — it counts materialised timeline rows, not writes in a window)
  - `:181` `effective_tier(*, has_account, stored_tier)` — **use this, never the column**
  - `:96` `family_for(action)`, `:76-78` `POST`/`REPLY`/`REPORT`, `:82` `ACTION_FAMILY`
  - `:204` `day_window_start(now=None)` — the bucket key
- `community/service.py`:
  - `:167` `consume_rate(db, action, *, ip_hash, identity=None) -> None` — **replaces
    `_consume_rate`**; async now, needs the session, `identity` optional
  - `:100` `_bump_counter(...)` — the atomic upsert
  - `:228` `remaining_allowance(db, *, ip_hash, identity=None) -> dict` — read-only;
    returns `{tier, tier_name, actions: {family: {remaining, limited_by}}}` (**for p5**)
  - `:284` `reset_rate_counters(db, *, scope_type, scope_key, action=None) -> int`
  - `:73` `CommunityRateLimitError` now carries `.scope` (`"account"` | `"ip"`)
- `community/models.py`:
  - `:155` `RateCounter` — table `rate_counters`, unique constraint
    `uq_rate_counter_scope_action_window` (`:183`; **named — the upsert targets it by name**)
  - `:118` `AnonIdentity.trust_tier` (default 1) · `:120` `.tier_computed_at` ·
    `:122` `.upheld_reports` · `:126` `.shadow_limited`
  - `:62` `RATE_SCOPE_TYPES = ("account", "ip")`
- Migration `b3d5f7a9c1e4` (down_revision `f1a3c5e7b9d2`)
- `tests/agents/immigration/test_community_tiers.py` — 26 pure tests
- `tests/e2e_community_ratelimit.py` — 28 checks, incl. the cross-process proof

### Gotchas for the next phase

1. **Counters are durable, and every ASGITransport request reports as `127.0.0.1`** — so
   the whole e2e suite shares one IP scope, *across runs*. Without a reset, a handful of
   runs in one UTC day would exhaust the 25-post ceiling and scripts would start failing on
   their own history. `e2e_community_accounts.py`, `e2e_community_moderation.py` and
   `e2e_community_ratelimit.py` each clear `scope_type="ip", scope_key=hash_ip("127.0.0.1")`
   at startup. **Any new e2e that writes must do the same.**
2. **`consume_rate` is `async` and takes the session** — the old `_consume_rate(action,
   ip_hash)` was sync and is gone. Any new write path must `await` it and pass `db`.
3. **Pass `identity=` on new write paths.** Omitting it silently downgrades that endpoint to
   IP-only enforcement with no per-account cap at all. The legacy paths that omit it do so
   knowingly: `create_thread`, `create_comment`, `submit_timeline`, `report_target` never
   resolve an identity, so they are IP-ceiling-only exactly as they were before.
4. **The upsert targets the unique constraint by name.** Renaming
   `uq_rate_counter_scope_action_window` in a later migration breaks the limiter at runtime,
   not at import.
5. **`shadow_limited` and `upheld_reports` are written by nothing yet.** They exist, they
   default to `false`/`0`, and p6 owns both the writer and the reader. Do not assume a
   non-default value can appear before then.
6. **`trust_tier` is not member-facing and must stay that way.** No serializer exposes it;
   the only visible tier is ever T4. Keep it out of every public and consultant surface —
   the p1 leak sweep does not currently assert this, so it is on the author to not add it.
7. Pre-existing lint noise unrelated to p2: `ruff` flags `F841 journey_report_id` at
   `tests/e2e_community_moderation.py:192` (from p1). Left alone deliberately to keep the
   p2 diff honest.

### Verify → result

- `PYTHONPATH=src pytest tests/ -v` → **101 passed** (75 before, 26 new in
  `tests/agents/immigration/test_community_tiers.py`)
- `PYTHONPATH=src python tests/e2e_community_ratelimit.py` → **28 checks, all passed**;
  re-run twice more in the same UTC day, still green (proves the reset works)
- `PYTHONPATH=src alembic upgrade head && PYTHONPATH=src alembic heads` →
  **`b3d5f7a9c1e4`, exactly one head**
- Regression: `e2e_community_accounts.py` (65 checks), `e2e_community_moderation.py` and
  `e2e_portal_flow.py` all still pass
- **The cross-process check, which is the point of the phase:** account exhausts its 5
  posts in process A → `subprocess` launches a *fresh interpreter* → that process refuses
  the same account with 429, **while a brand-new account created inside that same child
  process posts successfully (201)**. The second half is load-bearing: without it a child
  broken for an unrelated reason would look identical to a child correctly hitting the cap.
- Driven live over real HTTP (uvicorn on :8001, real socket, not ASGI in-process):
  bootstrap a device → 2 posts land → the 3rd returns
  `429 {"detail":"You've posted a lot today. Try again tomorrow."}` — T0 caps enforced
  end-to-end through the real server.

---
