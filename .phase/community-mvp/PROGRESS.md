# PROGRESS — Community-first MVP, end to end

Epic: Turn immi360 into a community platform — pseudonymous Reddit-style accounts with an inbox, app-shell homepage, unified wait-check/timeline flow, dual-source (Official vs Room) wait data, and a self-running trust ladder.
Integration branch: feat/community-mvp
Base: main
Phase status: [done] p1 · [done] p2 · [done] p3 · [done] p4 · [pending] p5 · [pending] p6

<!--
Legend: pending → in_progress → done  (or blocked)
Append one handoff block per finished phase below. The handoff carries CONCLUSIONS
the next phase needs — not the conversation.
-->

## Standing constraints (apply to every phase)

- **Do not deploy.** No Heroku push, no Vercel deploy, no merge to `main`. The final `feat/community-mvp` → `main` PR is left for the human.
- Backend: `source .venv/bin/activate` + `PYTHONPATH=src` for every command. Run locally on `PORT=8001` (the frontend's `.env.local` expects it).
- Frontend: **bun only** — never npm/yarn/pnpm.
- Alembic must stay on a **single head** (`e5f7a9c1b3d5` before p1; `b3d5f7a9c1e4` after p2;
  `c5e7a9b1d3f6` after p3; `d7f9b3c5e1a8` after p4).
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

1. ~~**Do the 141 scraped `is_sample` timelines feed public numbers?**~~ — **RESOLVED 2026-07-18: INCLUDE, with provenance always visible.**
   The founder delegated the call; the recommendation stands. Sample timelines now feed public stats, but **every figure they contribute to must state its composition in the open** — e.g. "based on 141 reported timelines, 66 collected from public forums". Being visibly honest about where a number comes from is more defensible than an empty column, and it matches the show-your-working tone of the whole product.
   **Binding requirements for p4:**
   - The stats payload carries a provenance breakdown (`member_reported` vs `forum_collected` counts), not just a total `sample_size`
   - The UI renders that breakdown wherever a Room figure appears — never a bare number
   - `is_sample` rows remain individually flagged; this decision changes **stats only**
   - Reversible by one flag if it ever reads as inflating the numbers

   **Correction (2026-07-18, caught by p4):** the original wording above said sample rows "stay excluded from the *feed*". That was **factually wrong** — it describes the opposite of the code. Samples have always *populated* the feed (they are most of its current content) and were excluded from *stats*. p4 correctly changed stats only and left feed behaviour untouched rather than "fixing" the feed to match a mistaken premise, which would have emptied it. **Whether samples should also leave the feed is a separate, unmade decision**, and it cannot be made until enough member-reported content exists to fill the gap.

2. **Real per-IP ceiling.** (p2 set the starting value — **still open for p6 to tune**)
   Accounts are free to create, so per-account caps alone do not bind — the per-IP ceiling and new-account probation are the controls that do.
   *Shipped starting value:* 25 posts / 60 replies / 30 reports per IP per day (`tiers.IP_CEILING`). Every rejection is logged at WARNING with `scope=ip action=… cap=… signed_in=…`, so the first fortnight of real traffic can move it.
   **Known tension p6 must confront with data:** the ceiling applies to signed-in accounts too, so a lecture theatre or share house behind one NAT holding more than five active T1 members would trip it. Applying it only to account-less writers was considered and rejected — it would be defeated by signing up, which is free. The mitigations shipped instead: the bucket resets at UTC midnight, and an operator can clear a scope outright (`service.reset_rate_counters`), so the failure mode is "come back tomorrow or ask us", never a ban.

3. ~~**Kaplan–Meier scope in p4.**~~ — **RESOLVED 2026-07-18: DEFERRED, as the plan permitted.**
   p4 shipped honest denominators instead: `pending` travels with every median, the verdict copy names the still-waiting count, and `tests/agents/immigration/test_processing_engine.py::test_decided_only_median_is_optimistic_when_slow_cases_are_still_waiting` pins the bias with a fixture where the decided-only and censoring-aware medians differ by more than 2×, so the omission is documented in a test rather than in a comment. The engine's module docstring states plainly that the median is optimistic and why. **Whoever picks KM up:** the sample is already provenance-split and window-filtered in `service._cohort_sample`, so the input shape it needs exists; what is missing is the survival curve itself and a decision about how to present a KM median beside an official band that is *not* censoring-corrected (they would no longer be comparing like with like — that is a product decision, not a maths one).

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

## Handoff — p3 Inbox & profile · done · 2026-07-18

Branch `feat/community-mvp-p3-inbox` → PR into `feat/community-mvp`. **Backend only** —
the inbox UI is p5's, exactly as planned.

### Shipped vs planned

Every Phase-3 acceptance criterion is met. Three things go past the written scope,
each because the phase could not honestly be called done without it:

1. **`notify_replies_email` + a preferences endpoint.** Shipping an email people cannot
   turn off is not something to leave for later, and an unsubscribe link needs a column
   to write to. Defaults to **true**: supplying an email at signup is itself the opt-in,
   since p1's copy offers the field with "so we can tell you when someone replies"
   attached — a second consent step would contradict what the member was just told. With
   no address on file the column is inert.
2. **Notifications are banked for passwordless device identities too.** Free, because
   `anon_identities` is both device and account: a reply to a visitor waits on the row
   they already are and is there the moment they claim it. No backfill, no stitching.
   Asserted in section 12 of the e2e.
3. **Fan-out lives in a new `community/notifications.py`**, not in `service.py` as the
   plan's file list suggested. `service.py` was already 1442 lines and none of this needs
   `CommunityService`. `service.create_journey_comment` calls into it; the module imports
   nothing from `service`, so there is no cycle.

Deliberately NOT built (out of scope, as planned): push notifications, DMs, digests
beyond the reply case, vote/mention notifications, the frontend inbox UI (p5).

### Key decisions

- **One notification per reply, to the person who was answered** — a top-level reply
  notifies the post's author, a reply to a comment notifies that commenter, and never
  both. Notifying the OP about every reply anywhere under their post is how a popular
  thread makes its own author the most-spammed person in the room. Asserted both ways.
- **Votes are not notified.** A room where a number going up pings you trains people to
  post for the number. `NOTIFICATION_TYPES` has exactly two members on purpose.
- **The email says nothing.** Not just a neutral subject — the preheader (which inbox
  lists render *beside* the subject, so it leaks identically) and the body are neutral
  too. No subclass, no question title, no reply text anywhere. The member opens the room
  to find out what it was: one click, and an entire category of harm removed. The e2e
  sweeps subject + preheader + headline + eyebrow + body for eight topic terms, and then
  **runs the same sweep function over the subject line we refuse to ship** so an
  all-green result cannot mean the sweep was looking at nothing.
- **Batching is a query, not a scheduler.** One send per (recipient, journey, UTC day),
  decided by looking for a sibling notification with `email_sent_at >= day_window_start()`.
  Same day boundary as the rate counters, so the product has one notion of "a day". Two
  simultaneous replies could both read "no" and both send; accepted — the failure mode is
  one duplicate email, and the fix would cost every reply a lock.
- **Email sends after the commit, fan-out inside it.** A notification must never point at
  a reply that failed to save; an email must never describe one. Those pull in opposite
  directions, so they sit on opposite sides of the commit
  (`router.create_journey_comment`).
- **Moderation is handled twice, on purpose.** `hide_for_target` flips rows to `hidden`
  from the moderation path (keeps the unread badge honest with no join on every count),
  **and** every inbox read joins `JourneyComment`/`Journey` and requires both `active`.
  The explicit one is fast; the join is the one that cannot be forgotten by a future
  moderation path that has never heard of inboxes.
- **`mark_read` scopes by recipient in the WHERE clause** rather than checking ownership
  and erroring. Marking someone else's notification returns `marked: 0`, not a 403 — an
  endpoint that distinguishes "not yours" from "already read" is an oracle for which
  notification ids exist.
- **`unread_count` is always the total**, never "unread on this page". A badge that
  changes when you paginate is a badge nobody believes.
- **`/community/me/*`, not `/community/public/me/*`.** These carry the X-API-Key like
  every other non-public route *and* require a session. There is nothing public about
  someone's notifications. p5's client already sends the key on every request.

### Interfaces produced

- `community/notifications.py` (new, no imports from `service` — no cycle):
  - `:77` `fan_out_reply(db, *, journey, comment, author) -> list[CommunityNotification]`
  - `:143` `hide_for_target(db, *, target_type, target_id) -> int` (`journey` |
    `journey_comment`)
  - `:173` `_inbox_query(account)` — the status join that makes moderation automatic
  - `:195` `unread_count(db, *, account) -> int`
  - `:205` `list_inbox(db, *, account, limit, offset, unread_only) -> dict`
  - `:253` `mark_read(db, *, account, ids=None) -> int` (`ids=None` → mark all)
  - `:279` `list_my_posts(db, *, account, limit, offset) -> list[Journey]`
  - `:299` `list_my_comments(db, *, account, limit, offset) -> list[dict]`
  - `:367` `send_reply_notification_email(*, to)` — the neutral email
  - `:398` `deliver_reply_emails(db, *, comment_id) -> int` — post-commit, best-effort
  - `:55-56` `REPLY_TO_POST` / `REPLY_TO_COMMENT`, `:60` `PREVIEW_CHARS = 160`
- `community/models.py`:
  - `:220` `CommunityNotification` — table `community_notifications`
  - `:67`/`:71` `NOTIFICATION_TYPES`, `NOTIFICATION_STATUSES`
  - `:146` `AnonIdentity.notify_replies_email` (default `true`)
- `community/service.py`:
  - `create_journey_comment` now calls `notifications.fan_out_reply` after flush
  - `resolve_report` now calls `notifications.hide_for_target` on hide/remove
- Routes (`community/router.py:565-649`), all behind `require_community_account`:
  - `GET /community/me/inbox` → `InboxOut {items, unread_count}`
  - `POST /community/me/inbox/read` → `MarkReadOut {marked, unread_count}`
  - `GET /community/me/posts` → `list[JourneyOut]`
  - `GET /community/me/comments` → `list[MyCommentOut]`
  - `GET|POST /community/me/notification-preferences` → `NotificationPreferencesOut`
- Schemas: `NotificationOut`, `InboxOut`, `MarkReadRequest/Out`, `MyCommentOut`,
  `NotificationPreferencesRequest/Out` (`community/schemas.py:523-598`)
- Migration `c5e7a9b1d3f6` (down_revision `b3d5f7a9c1e4`)
- `tests/e2e_community_inbox.py` — 80 checks

### Gotchas for the next phase

1. **`tests/e2e_community_inbox.py` writes, so it resets the IP scope at startup** like
   its siblings (p2 gotcha 1 still applies verbatim). p4's new e2e must do the same.
2. **The e2e forces `settings.resend_api_key` on** for its email section, because with no
   key `deliver_reply_emails` correctly does nothing and the whole section would pass by
   testing nothing. It mutates the cached settings object in-process only — nothing is
   actually sent, `send_generic` is monkeypatched. If p4/p5 add an email path, copy the
   pattern rather than assuming a key exists.
3. **`create_journey_comment`'s contract changed in effect, not in signature** — it now
   writes a notification row inside the caller's transaction. Any *new* call site must
   commit for the notification to land, and should call
   `notifications.deliver_reply_emails(db, comment_id=…)` after that commit or replies
   through that path will silently never email.
4. **p4 hides/unpublishes journeys.** Unpublished (draft) timelines must not generate or
   surface notifications. `_inbox_query` filters on `Journey.status == "active"`, which
   covers moderation but **not** a new `published` flag — if p4 adds one, add it to that
   query too, and consider whether `hide_for_target` needs a draft branch.
5. **Notification FKs cascade from `community_journeys` and
   `community_journey_comments`.** Deleting a journey silently deletes its inbox entries.
   That is intended, but a p4 migration that rebuilds either table must preserve it.
6. **`CommunityNotification` is declared before `Journey`/`JourneyComment` in
   `models.py`** and references them by string FK. Fine for SQLAlchemy, surprising to
   read — do not "fix" it by reordering without running the suite.
7. `email_sent_at` is the batching key. Backfilling or clearing it changes who gets mail;
   it is not a cosmetic audit column.
8. The p1 leak sweep does not know about the new endpoints. They are all
   `require_community_account`-scoped so they only ever return the caller's own data, and
   no new serializer carries `email` or `trust_tier` (p2 gotcha 6) — but if p5 adds a
   public profile page, that is where this stops being true by construction.

### Verify → result

- `PYTHONPATH=src pytest tests/ -v` → **101 passed** (unchanged; this phase's coverage is
  flow-shaped, so it lands in the e2e per the project's testing convention)
- `PYTHONPATH=src python tests/e2e_community_inbox.py` → **80 checks, all passed**;
  re-run twice more in the same UTC day, still green
- `PYTHONPATH=src alembic upgrade head && PYTHONPATH=src alembic heads` →
  **`c5e7a9b1d3f6`, exactly one head**
- Regression: `e2e_community_accounts.py`, `e2e_community_ratelimit.py`,
  `e2e_community_moderation.py`, `e2e_portal_flow.py` all still pass
- `ruff check` clean on every file this phase touched
- **Driven live over real HTTP** (uvicorn on :8001, real socket, not ASGI in-process):
  two accounts → A posts → B replies (201) → A's inbox shows 1 unread with B's handle,
  preview and context title → B's own inbox stays 0 → `/me/inbox` with a valid API key
  but no session returns **401** → `/me/posts` shows A's post with `is_mine: true` →
  `/me/comments` shows B's reply carrying its post title → mark-read returns
  `{"marked":1,"unread_count":0}`, and again `{"marked":0,"unread_count":0}`

---

## Handoff — p4 Wait Check ↔ timeline, and honest numbers · done · 2026-07-18

Branch `feat/community-mvp-p4-waitcheck` → PR into `feat/community-mvp`. Backend + the two
frontend surfaces the plan named (`wait-check.tsx`, `official-times.tsx`); the app shell is
still p5's.

### Shipped vs planned

Every Phase-4 acceptance criterion is met. Kaplan–Meier is deferred, which the plan
explicitly permitted — see resolved open decision 3 above. Four things go past the written
scope, each because the phase could not honestly be called done without it:

1. **`POST /public/journeys/{id}/milestones`.** "A saved timeline accepts later milestones"
   was an acceptance criterion with no endpoint behind it. Without one the saved check is a
   snapshot that rots, and — worse — the grant that would *correct* the community median
   never arrives, so the published numbers stay biased toward whatever people happened to
   report on the day they signed up.
2. **`_sync_timeline_mirror`.** Draft/publish/edit each change whether a journey should
   count, and three call sites deciding that independently is three chances to get it
   wrong. One idempotent function owns the whole relationship, including deleting the
   mirror row when a journey stops qualifying.
3. **`get_journey(viewer=…)` and `get_owned_journey`.** Drafts need an owner-only read path,
   and it has to 404 rather than 403 — an endpoint that distinguishes "not yours" from "no
   such post" is an oracle for which draft ids exist.
4. **The seeder now writes mirror rows** (`scripts/seed_community_scraped.py`). Otherwise
   the next harvest run would silently re-create stats-invisible sample journeys and quietly
   undo the decision this phase implemented.

Deliberately NOT built (still out of scope): Kaplan–Meier, official-figure ingestion, the
app shell, the `/wait-check` route, any UI for editing milestones (the endpoint exists; p5
owns the surface).

### Key decisions

- **Draft state is its own column, not a `status` value.** `status` is moderation's axis
  (active/hidden/removed); a draft is a perfectly healthy row its author has not shared.
  Overloading `status` would make "hidden" mean both "we took this down" and "you haven't
  posted it yet", and every moderation surface would then have to disambiguate by guessing.
  `is_published` defaults to TRUE, so nothing that was public yesterday is invisible today.
- **Allowance is consumed at save, not at publish.** Publishing flips a flag on a row
  already paid for. This makes draft-flooding impossible while leaving publication free —
  and publication is the act we actually want people to take.
- **Consent is a required field, not an implied one.** `POST /publish` rejects a body
  without `consent_public: true` (422). Treating the URL itself as consent would let a
  mis-wired client publish someone's private timeline by accident; the intent has to be
  stated. Asserted three ways in the e2e (no body, `false`, and a non-owner).
- **A draft has no mirror row at all** — not a filtered-out one. The strongest available
  guarantee that an unpublished timeline cannot move a public number is that the table the
  numbers come from has never heard of it. The e2e asserts the row count is zero directly,
  not just that the API omits it.
- **`sample_size` stays 0 when `basis == "official"`, while `provenance` reports the real
  cohort.** These look contradictory and are not: `sample_size` counts the decided cases
  *behind the percentiles being shown*, and those are the department's. `provenance`
  describes the community cohort that exists, used or not. That distinction is what lets the
  UI say "official figures, and we have 7 timelines — not enough yet", which is both honest
  and the thing that invites the eighth. Documented at `processing.py:342`.
- **The n-floor raised 5 → 20, and it now gates the *fallback*, not just a label.** Below 20
  decided cases `wait_verdict` returns `unknown`, which `service.wait_check` reads as "answer
  from the official bands". Twenty is not statistically magic; it is roughly where a median
  stops swinging on one more grant, which is the property that matters when someone is
  reading it to decide whether to worry.
- **Forum-collected rows count, and every figure they touch states its composition.**
  `provenance_note` is generated in `processing.py`, not in copy, so the sentence cannot
  drift from the data. Three shapes: member-only (never mentions forums), forum-only, and
  mixed ("Based on 7 timelines — 3 reported by members, 4 collected from public immigration
  forums"). Returns `None` at zero, so nothing can render "based on 0 timelines".
- **The 12-month window uses 30.44-day months**, not a calendar-month subtraction. A
  cohort boundary that jitters with month length would make the same query return different
  samples on different days for no defensible reason.
- **The processing board hides the community-vs-official delta unless `sufficient`.** A
  "12 days faster" built on four timelines is not a finding, it is noise wearing a badge.
  It shows `"3 so far · need 20"` instead.

### Interfaces produced

- `community/processing.py` (pure, still no framework imports):
  - `:40-41` `DEFAULT_MIN_SAMPLE = 20`, `DEFAULT_WINDOW_MONTHS = 12`
  - `:103` `provenance_block(*, member_reported, forum_collected) -> dict`
  - `:121` `provenance_note(...) -> Optional[str]` — the sentence; `None` when empty
  - `:148` `compute_stats(decided_days, pending=0, *, member_reported, forum_collected,
    min_sample, window_months)` — now also returns `sufficient`, `min_sample`,
    `window_months`, `provenance`, `provenance_note`
  - `:226` `wait_verdict(...)` — same new kwargs; `unknown` below the floor
  - `:318` `wait_verdict_official(...)` — same new kwargs
- `community/service.py`:
  - `:715` `_cohort_sample(db, subclass_slug) -> {decided_days, pending, member_reported,
    forum_collected}` — **the one place that decides what counts**: active, published,
    within window, provenance-flag-respecting
  - `:793` `_timeline_durations(...)` — back-compat shim, unchanged signature
  - `:801` `_stats_from_cohort(cohort) -> dict`
  - `:847` `_official_block(sc) -> dict`
  - `:1215` `_sync_timeline_mirror(db, journey, *, ip_hash=None)` — idempotent; creates,
    updates and **deletes** the stats mirror row
  - `:1277` `save_wait_check(db, *, identity, ip_hash, subclass_slug, lodged_on,
    milestones=None, note=None) -> Journey` (unpublished)
  - `:1313` `get_owned_journey(db, journey_id, identity) -> Optional[Journey]`
  - `:1332` `publish_journey(db, journey, *, ip_hash=None) -> Journey` (idempotent)
  - `:1349` `append_milestones(db, journey, milestones, *, outcome=None, ip_hash=None)`
  - `create_journey(..., publish: bool = True)` — new kwarg, default preserves old behaviour
  - `get_journey(db, journey_id, *, viewer=None)` — new kwarg; drafts 404 for everyone else
- `community/models.py`:
  - `:79-81` `TIMELINE_SOURCES`, `TIMELINE_SOURCE_MEMBER`, `TIMELINE_SOURCE_FORUM`
  - `:386` `Journey.is_published` (default True, indexed) · `:387` `.published_at`
  - `:689` `CommunityTimeline.source` (default `"member"`, indexed)
- `core/config.py:105-114` — `community_stats_include_forum` (**the one reversal switch**),
  `community_stats_min_sample`, `community_stats_window_months`
- Routes (`community/router.py`):
  - `:197` `POST /community/public/wait-check/save` → `JourneyDetailOut`, 201
  - `:239` `POST /community/public/journeys/{id}/publish` → `JourneyDetailOut`
  - `:265` `POST /community/public/journeys/{id}/milestones` → `JourneyDetailOut`
  - `GET /community/public/wait-check` — **contract unchanged**, fields added only
- Schemas (`community/schemas.py`): `ProvenanceOut:181`, `OfficialFiguresOut:218`,
  `SaveWaitCheckRequest:334`, `PublishJourneyRequest:353`, `AddMilestonesRequest:373`;
  `CommunityDurationStats` / `WaitCheckOut` / `ProcessingStatOut` extended;
  `JourneyOut.is_published`
- Migration `d7f9b3c5e1a8` (down_revision `c5e7a9b1d3f6`) — columns **plus** the
  INSERT…SELECT that materialises mirror rows for existing sample journeys
- Frontend: `useSaveWaitCheck`, `usePublishJourney`, `useAddMilestones`
  (`src/lib/api/hooks/community.ts`); `Provenance` / `OfficialFigures` types;
  `ProvenanceLine` + `OfficialLine` + `SaveAndShare` in `wait-check.tsx`
- `tests/e2e_community_waitcheck_save.py` — 76 checks

### Gotchas for the next phase

1. **A discrepancy in the source doc, resolved conservatively.** Resolved decision 1 says
   sample rows "stay excluded from the *feed*" — but in the code they have always *populated*
   the feed and been excluded from the *stats*, which is the opposite. Since the same
   decision says "this changes **stats only**", p4 changed stats only and left feed behaviour
   untouched. If the founder actually wants samples out of the feed, that is a separate,
   unimplemented change — and it would empty the feed, so it needs a real decision, not a
   patch.
2. **`is_published` must be added to any NEW query that reads journeys publicly.** The feed
   funnels through `list_journeys`, and `feed_summary`, `_inbox_query` and `list_my_comments`
   were each updated by hand. There is no global default scope enforcing this — a new query
   that forgets it will leak drafts. `list_my_posts` deliberately **includes** drafts (it is
   the member's own profile and the only place to publish from), so it is not a
   copy-paste-safe template.
3. **p5 must render `provenance_note` wherever a Room figure appears.** This is the term on
   which forum data was allowed to count at all, not a nice-to-have. `wait-check.tsx` and
   `official-times.tsx` show the pattern. A bare community number in the new shell is a
   regression even though nothing will fail.
4. **Never render `official` without `room`, or `room` without `official`.** The official
   figure alone is an unchecked claim; the room's alone has nothing corroborating it. Both
   blocks are on every stats payload for this reason.
5. **Nothing may claim official figures are refreshed automatically.** They are hand-seeded
   into `VisaSubclass.official_updated`; `OfficialFiguresOut.is_live` is hard-coded false and
   the e2e sweeps the payload for "checked daily" / "updated daily" / "live from". Copy in
   the new shell is bound by the same rule.
6. **The e2e creates its own throwaway `VisaSubclass`** (`p4test-<hex>`) so its assertions do
   not depend on seed data, and deletes it in a `finally`. If it is ever interrupted mid-run,
   a stray `p4test-*` subclass will show up in `/public/subclasses`; delete it by slug.
7. **`tests/e2e_community_waitcheck_save.py` resets the IP scope at startup**, like its
   siblings (p2 gotcha 1 applies verbatim).
8. **Band-classification tests now pass `min_sample=5` explicitly** via the `BANDS` dict
   (`test_processing_engine.py:84`). They are about which tier a wait lands in, not about
   the floor; padding `SAMPLE` to 20 values would have moved the percentiles they assert
   against. The real default floor is covered separately below them.
9. **Replying to a draft is impossible by construction** — `create_journey_comment` calls
   `get_journey` without a viewer, so a draft is 404 to it. That is what closes p3 gotcha 4
   at the source, in addition to the `_inbox_query` filter.
10. **`_cohort_sample` runs one query per subclass** and `processing_board` loops every
    active subclass. Fine at ~10 subclasses; if p5 puts the board on the homepage for every
    visitor, this wants a single grouped query or a cache.

### Verify → result (p4)

- `PYTHONPATH=src .venv/bin/python -m pytest tests/ -q` → **117 passed** (101 before, 16 new
  in `test_processing_engine.py`)
- `PYTHONPATH=src .venv/bin/python tests/e2e_community_waitcheck_save.py` → **76 checks, all
  passed**; re-run in the same UTC day, still green
- `PYTHONPATH=src .venv/bin/alembic upgrade head && … heads` → **`d7f9b3c5e1a8`, exactly one
  head**
- Regression: `e2e_community_accounts.py`, `e2e_community_ratelimit.py`,
  `e2e_community_moderation.py`, `e2e_community_inbox.py`, `e2e_portal_flow.py` all pass
- `ruff check` clean on every file this phase touched
- `cd immi-pulse-fe && bun run lint && bunx tsc --noEmit && bun run build` → tsc clean, build
  succeeds, **lint error count identical to baseline (7)** — verified by stashing the diff
  and re-running; all remaining findings are pre-existing and in files this phase never
  opened
- **Driven live over real HTTP** (uvicorn on :8001, real socket): wait-check with *no*
  API key, *no* session, *no* device token → **200** with the full payload · save → 201
  unpublished, absent from the feed, 404 to a stranger, 200 to its owner, **zero rows in
  `community_timelines`** · publish with no body → 422, `consent_public:false` → 422,
  non-owner → 404, owner with consent → 200 · room total 2 → 3 the moment it published ·
  grant milestone appended → `processing_days: 200`, case moved from pending into the sample
- **Driven in a real browser** (`bun run dev`, Playwright): selecting a visa + lodgement date
  renders "Department of Home Affairs · 50% by 5 weeks · 90% by 8 weeks · **as at Mar 2026**"
  and "Based on 2 timelines reported by members. That is fewer than the 20 decided cases we
  need before publishing a median of our own" — no bare number anywhere · "Keep this as my
  timeline" → "**Saved. Only you can see this.** It is not in the feed and it is not in any
  of the numbers above." · "Share it with the room" → "Shared with the room", and the figure
  above it updated 2 → 3 · the official-times panel shows every row's as-at date and
  "3 so far · need 20" in place of a delta it should not publish
- Mixed-provenance sentence confirmed live against seeded forum rows: **"Based on 7
  timelines — 3 reported by members, 4 collected from public immigration forums."**

---
