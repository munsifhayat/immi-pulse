# PROGRESS — Community-first MVP, end to end

Epic: Turn immi360 into a community platform — pseudonymous Reddit-style accounts with an inbox, app-shell homepage, unified wait-check/timeline flow, dual-source (Official vs Room) wait data, and a self-running trust ladder.
Integration branch: feat/community-mvp
Base: main
Phase status: [done] p1 · [done] p2 · [done] p3 · [done] p4 · [done] p5 · [done] p6
**Epic complete** — see the closing section at the foot of this file.

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

2. ~~**Real per-IP ceiling.**~~ — **RESOLVED 2026-07-18 by p6: the ceiling is now tier-aware.**
   Enforced against T0 and T1; **not** enforced above T1 (`tiers.ip_ceiling_applies`). The
   counter is still *incremented* for every writer at every tier, so the number stays
   observable and tunable — only the refusal is scoped.
   **The argument:** p2 correctly rejected "exempt anyone signed in", because signing up is
   free and the exemption would be defeated in one click. p6 has a signal p2 did not: T2 costs
   seven days, five contributions that survived moderation, and net-positive votes from other
   members. Five flatmates each clear that within a fortnight; a spam ring does not clear it at
   volume, because each account costs a week of genuine participation. So the backstop stays
   exactly where free account creation would otherwise defeat the per-account cap, and stops
   landing on the lecture theatre. Both halves are asserted in `e2e_community_antispam.py` §12
   (a probationer on an exhausted network is refused; an established account on the same
   exhausted network is not).
   **Still soft, and still never a ban** — asserted in the same section: the refusal offers
   signing in, names tomorrow, states no number, and contains none of "ban", "blocked",
   "blacklist", "forbidden". The bucket resets at UTC midnight and `reset_rate_counters` clears
   it on demand.
   *Original note, kept for the record:*
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

## Handoff — p5 The app shell homepage · done · 2026-07-18

Branch `feat/community-mvp-p5-appshell` → PR into `feat/community-mvp`. Frontend, plus the
one backend route p2 explicitly deferred to this phase.

### Shipped vs planned

Every Phase-5 acceptance criterion is met. Four things go past the written scope, each
because the phase could not honestly be called done without it:

1. **`GET /community/me/allowance`.** p2 built `remaining_allowance` as a service function
   and said in writing that p5 wires the route. Without it the criterion "show the sign-in
   prompt **before** a write is attempted — never a 429 after the fact" is unimplementable
   for a signed-in member who has spent their allowance.
2. **The sitemap's journey entries were already dead, and this phase fixed them.** The
   standing constraint says they must survive; they had not been surviving. `sitemap.ts`
   asked for `limit=200`, the API caps `limit` at 100 and returns **422**, and the `!res.ok`
   guard turned that into an empty list — so the "organic growth engine" has been emitting
   **zero** journey URLs since before this epic. It now pages with `offset` at the
   documented cap. Verified live: 0 → 31 journey URLs.
3. **Community session token is its own localStorage slot**, not the console's `ip_token` —
   see the first key decision below.
4. **The full milestone builder was kept and rewired** rather than orphaned. `ShareJourney`
   (617 lines: every milestone type, stream, occupation, state) would have become dead code
   behind the new quick composer. It is now the composer's "Add medicals, s56 and the rest".

Deliberately NOT built (still out of scope): moderation UI, the marketplace, any backend
contract change beyond the allowance route, email verification UI, password-recovery UI
(the backend route exists from p1; no surface links to it yet — see gotcha 6).

### Key decisions

- **The room's session lives in `ip_community_token`, never `ip_token`.** A consultant and a
  community member are different people who can be signed in on the same machine, with
  different JWT audiences. The axios interceptor picks per request: `/community/*` gets the
  community token, everything else the console's (`client.ts:29-33`). Sending the console's
  JWT at `/community/me/*` would 401 against a different audience, and merging the two slots
  would mean signing out of one silently signs you out of the other.
- **`withCredentials: true` on the API client.** p1's durable device cookie is HttpOnly and
  cross-origin, so it never travelled without this. Safe because the backend already names
  explicit CORS origins with `allow_credentials=True` — checked before enabling, since a
  wildcard origin plus credentials is a request browsers refuse outright.
- **A new `(room)` route group, and `(public)/page.tsx` deleted.** Two route groups cannot
  both own `/`. The room's layout has no navbar and no site footer on purpose: the footer
  links live in the right rail, and website chrome is exactly what a platform is not. The
  surviving editorial pages keep the old navbar.
- **Components hoisted to `src/components/room/` + `src/lib/room/`.** They were under
  `app/(public)/community/_components/`, which is now a route that only serves
  `journey/[id]`. Leaving the shell's building blocks inside a retired route's private
  folder would have been the confusing option.
- **Gating is a `writeBlock`/`canWrite` pair in `RoomContext`, resolved from the account and
  the read-only allowance.** Every write surface asks it *before* firing — composer, feed
  upvote, drawer reply, nested reply. A 429 the member discovers after typing is the failure
  this criterion exists to prevent.
- **A vote is a write, so it needs a handle.** Voting is not rate-counted server-side, but
  "writing requires an account" reads on votes too, and an anonymous upvote button that
  silently does nothing would be worse than one that asks.
- **Inbox and You are visible to signed-out visitors and open the signup prompt.** Hiding
  them hides the reason to sign up; 404ing them punishes curiosity. `SignedOutPanel` explains
  what the account is *for* instead.
- **Feed rows: upvote · reply · share, with Report hover-only.** Report is a moderation
  affordance rather than an engagement action, so it sits outside the action row and does not
  count against "exactly two". The old `Heart` became `ArrowBigUp` — a heart reads as "like",
  which is the third action this criterion removes.
- **Retired marketing routes redirect to `/` directly, not via `/community`.** Chaining
  `/pricing → /community → /` would have been two hops for no reason. `/community` matches
  **exactly** in `next.config.ts`, so `/community/journey/:id` is untouched.
- **`/inbox` and `/you` are `noindex` in page metadata *and* disallowed in robots.txt.**
  Pseudonymity is worth little if a handle accumulates a crawlable dossier.
- **One provenance sentence for the right-rail table, not one per row.** The note is
  generated server-side per subclass; in a 340px rail, six of them would be unreadable, so
  the panel renders the widest. Every Room cell still carries its own `n=`, and a figure
  below the n-floor renders `—` rather than a median that would swing on the next grant.

### Interfaces produced

- `src/components/room/room-context.tsx`:
  - `:61` `RoomProvider` · `:139` `useRoom()`
  - `:44` `canWrite(action) -> boolean` — **the pre-write gate; opens the prompt itself**
  - `:46` `writeBlock(action) -> "no-account" | "spent" | null`
  - context also carries `account`, `identity`, `allowance`, `queue`/`setQueue`,
    `search`/`setSearch`, `openAccount`/`closeAccount`
- `src/components/room/room-shell.tsx`: `:92` `RoomShell` (grid + provider + dialog),
  `:105` `RoomHeader` (sticky centre-column header), `:17` `MobileBar`
- `src/components/room/left-rail.tsx`: `:29` `ROOM_NAV`, `:39` `ROOM_QUEUES`,
  `:49` `UnreadBadge`, `:58` `useUnreadCount()`, `:66` `LeftRail`
- `src/components/room/right-rail.tsx`: `:12` `RoomSearch` (the `/` shortcut),
  `:57` `DualSourceTimes`, `:117` `WaitCheckTeaser`, `:143` `RightRail`
- `src/components/room/account-dialog.tsx`: `:26` `PasswordField` (one field + reveal),
  `:66` `SignupPanel`, `:214` `LoginPanel`, `:279` `AccountDialog`
- `src/components/room/composer.tsx`: `:34` `Composer` — two modes, pre-write gate,
  escape hatch into `ShareJourney`
- `src/components/room/room-feed.tsx`: `:47` `RoomFeed({ type? })`
- `src/components/room/inbox-view.tsx`: `:19` `InboxView`
- `src/components/room/you-view.tsx`: `:27` `DraftPublishRow`, `:63` `YouView`
- `src/components/room/wait-check-view.tsx`: `:15` `WaitCheckView`
- `src/components/room/signed-out-panel.tsx`: `:15` `SignedOutPanel`
- `src/lib/room/session.ts`: `getCommunityToken` / `setCommunityToken` /
  `clearCommunityToken`
- `src/lib/api/hooks/community.ts` (new hooks): `useCommunityAccount`, `useCommunitySignup`,
  `useCommunityLogin`, `useCommunityLogout`, `useInbox`, `useMarkInboxRead`, `useMyPosts`,
  `useMyComments`, `useAllowance`; types `CommunityAccount`, `CommunitySessionOut`,
  `NotificationOut`, `InboxOut`, `MyCommentOut`, `AllowanceOut`
- Routes: `(room)/layout.tsx`, `page.tsx` (`/`), `questions/`, `timelines/`, `wait-check/`,
  `inbox/`, `you/`
- Backend: `GET /community/me/allowance` (`community/router.py:747`) → `AllowanceOut`;
  schemas `AllowanceActionOut` / `AllowanceOut` (`community/schemas.py:706-732`)
- Moved: `_components/*` → `src/components/room/*`, `_lib/format.ts` →
  `src/lib/room/format.ts`
- Deleted (superseded by the shell): `community-feed.tsx`, `feed-filter-rail.tsx`,
  `identity-badge.tsx`, `login-gate.tsx`, `share-timeline.tsx`, `(public)/page.tsx`,
  `(public)/community/page.tsx`
- `globals.css`: `--paper-deep` + `--color-paper-deep` (the mockup's one missing token)

### Gotchas for the next phase

1. **No backend migration in this phase. Alembic head is unchanged: `d7f9b3c5e1a8`.**
2. **`canWrite` opens the dialog as a side effect.** It is a gate, not a predicate — calling
   it to *ask* a question will pop a modal at the member. Use `writeBlock` for rendering
   decisions and `canWrite` only on the actual write path.
3. **The allowance query only runs for signed-in accounts** (`useAllowance(!!account)`), and
   `writeBlock` returns `null` when the allowance has not loaded. A slow request therefore
   lets the write through and the server still enforces the cap — deliberate, because
   guessing "blocked" from missing data locks out a paying-attention member. p6 tightening
   caps must not assume the client blocks first.
4. **`/community` redirects but `/community/journey/:id` does not.** The `next.config.ts`
   source is the exact string `/community`. Any future `source: "/community/:path*"` would
   destroy the indexed journey pages and the sitemap entries with them.
5. **The sitemap fetch is capped at 500 URLs across 5 pages of 100** and stops at the first
   short page. If the room outgrows that, page further — but never raise `limit` above 100
   again (that is exactly the 422 that silently emptied it).
6. **Password recovery has a backend route and no UI.** `POST /public/auth/recover` and
   `/reset` work (p1), and `send_recovery_email` links to `/community/recover?token=…` — **a
   route that does not exist**. Anyone who sets an email and forgets their password currently
   gets a dead link. Not in p5's criteria, worth owning early.
7. **Reply nesting is capped at one level structurally, not just visually** — `ReplyRow` has
   no reply affordance at all, so there is nowhere to nest a third level from. Keep it that
   way; the backend's `parent_comment_id` would happily accept deeper.
8. **`ShareJourney` still takes `identity` and `onCapReached`** (the pre-account device-cap
   flow). It predates community accounts; its internal `can_post_timeline` logic is now
   mostly redundant for signed-in members but harmless. If p6 changes cap semantics, that
   component needs a second look.
9. **The FE lint baseline is 5 errors / 27 warnings, not 7 errors.** The inherited note said
   7; measured on `feat/community-mvp` in a clean worktree it is 5. This branch is 5 errors /
   26 warnings — errors identical, one warning fewer.
10. **`by_category` is `{}` on a room with no categorised posts**, so every queue count
    renders `0` (not `—`, which is reserved for "summary not loaded"). Do not read a rail of
    zeros as a broken filter.

### Verify → result (p5)

- `cd immi-pulse-fe && bunx tsc --noEmit` → **clean** (needed `rm -rf .next` once: stale
  generated route validators still referenced the two deleted pages)
- `bun run lint` → **5 errors, 26 warnings**; baseline measured on `feat/community-mvp` in a
  throwaway worktree = **5 errors, 27 warnings**. Zero new errors; all 5 are in files this
  phase never created (`next.config.ts` require, a dashboard `<a>`, three pre-existing
  set-state-in-effect)
- `bun run build` → **Compiled successfully**; `/`, `/questions`, `/timelines`,
  `/wait-check`, `/inbox`, `/you` all emitted
- `PYTHONPATH=src .venv/bin/python -m pytest tests/ -q` → **117 passed** (unchanged)
- `PYTHONPATH=src .venv/bin/alembic heads` → **`d7f9b3c5e1a8`, exactly one head**
- All five community e2e scripts pass: `accounts`, `ratelimit`, `moderation`, `inbox`,
  `waitcheck_save`
- `ruff check` clean on both touched backend files
- Redirects, live: `/community` `/pricing` `/features` `/get-started` `/find-consultants`
  → **307 → `/`**; `/community/journey/<id>` → **200**
- `robots.txt` disallows `/inbox` `/you` + the four retired routes; sitemap has **42 URLs,
  31 of them journeys** (was 0 — see "Shipped vs planned" item 2)

**Driven in a real browser** (uvicorn :8001 + `bun run dev`, Playwright, screenshots taken):
- Signed-out `/` renders the three-column shell; the composer shows **"Get a handle to post"**
  instead of a submit button — the prompt arrives before the write, not as a 429 after
- Signup dialog assigns **MellowSummit6807** with a reroll control, one password field with a
  reveal toggle, email marked optional with **both** reasons stated, and the no-recovery
  acknowledgement as a **required checkbox** — "Join the room" stays disabled until it is
  ticked
- Posted a question as that account → landed top of feed, count 30 → 31, composer footer
  switched to "POSTING AS MELLOWSUMMIT6807 · ANONYMOUS · EXPERIENCES, NOT ADVICE"
- **Second real account** (`SteadyMeadow1600`, fresh cookie jar = a second device) signed up
  and replied → account A's left-rail **Inbox badge showed 1**, the post showed "1 reply",
  and **B's own inbox stayed at 0** (replying to someone else notifies them, not you)
- `/inbox` showed the reply with actor handle, context title and preview
- `/you` showed **Posts (1) / Comments (0)**, plus the "cannot be recovered" banner; after
  replying to another thread from the drawer it read **Posts (1) / Comments (1)**
- `/wait-check` on its own route, driven **with no account and no device token**: 820 lodged
  2025-02-10 → "YOU · 17.2 months · On track" with "Department of Home Affairs · 50% by 17.7
  months · 90% by 31 months · **as at Mar 2026**" and "Nobody has shared a timeline for this
  visa yet. Once 20 have been decided…" — official and room rendered together, no bare
  community number anywhere
- Mobile (390×844): rails collapse to a scrolling icon nav, single column, no horizontal
  page overflow

---

## Handoff — p6 Trust promotion & anti-spam · done · 2026-07-18

Branch `feat/community-mvp-p6-trust` → PR into `feat/community-mvp`. Backend, plus the two
frontend surfaces this phase owed (password recovery, and the author's view of held content).

### Shipped vs planned

Every Phase-6 acceptance criterion is met. Four things go past the written scope, each
because the phase could not honestly be called done without it:

1. **`/community/recover` — the dead link p5 flagged.** `send_recovery_email` has linked to
   a route that did not exist since p1, so anyone who set an email and forgot their password
   got a 404. The page now handles both halves (request a link; set a new password), and an
   expired or already-used token falls back to the request form **with the error inline**
   rather than dead-ending. A "Forgotten it?" link was added to the login panel — the person
   who needs it usually knows before they try, so making them fail first was pointless.
2. **A settings-backed velocity threshold** (`community_velocity_max_writes` /
   `community_velocity_window_seconds`). A burst threshold that cannot be relaxed makes every
   legitimate scripted flow — seeders, the e2e suite — hold its own content, and these are
   exactly the numbers the plan says real traffic should move. Same in-process-mutation
   pattern p3 established for `resend_api_key`.
3. **An official-source link allowlist** (`antispam.ALLOWED_LINK_DOMAINS`). Deliberate
   deviation from a flat "no links below T2" — see key decisions.
4. **`is_held` on `JourneyOut` + a banner on `/you`.** The soft hold is only soft if its
   author can see what happened; a post that silently vanishes teaches a member the site ate
   it. Only ever returned to the author, because every other reader's query filters held
   content out server-side.

Deliberately NOT built (still out of scope, as planned): T4 professional verification
(OMARA/MARN checking), DMs, the marketplace, any moderator UI beyond the fields the existing
queue now renders.

### Key decisions

- **A hold is a third content state, not a moderation verdict.** `status = "held"` sits
  between `active` and `hidden`. Because every public query already filters on `active`,
  adding the value excludes held content everywhere by default — the safe direction for a
  status whose call sites nobody has audited one by one. Crucially it is *reversible by
  dismissal*: a moderator dismissing the auto-report puts the content straight back in the
  feed, re-creates its stats mirror row, and (for a reply) banks the notification it was
  denied. The whole case for holding rather than deleting rests on that path existing.
- **Touting is checked at every tier; contact details only below T2.** These are different
  kinds of problem. Publishing a phone number is a spam question a member can fix themselves,
  so it is *refused* with a message saying how. Touting is an s276 question — giving
  immigration assistance while unregistered is an offence — so it is *held for a human*, and
  tenure buys no exemption. A long-standing account touting is if anything more dangerous
  than a new one. Asserted at T1, T2 and T3 in the e2e.
- **Official gov.au links are always allowed** (`homeaffairs.gov.au`, `legislation.gov.au`,
  `mara.gov.au`, …, suffix-matched so `homeaffairs.gov.au.evil.com` is not covered). The
  single most useful thing one applicant can do for another is point at the department's own
  page, and it is a link no tout will ever post — nobody sells a visa service by linking to
  Home Affairs. Removes the most common false positive the gate would otherwise produce,
  which is what stops a safety control being experienced as an obstacle.
- **Naming a messaging app is not a contact detail.** "My agent only ever messages me on
  WhatsApp" is ordinary content here — first-hand accounts of dealing with agents are what
  the room is *for*. Only unambiguous artefacts reject: links, phone numbers, @handles, email
  addresses, `wa.me`/`t.me`. The solicitation form ("whatsapp me", "dm me") is caught by the
  touting patterns instead, which is the stronger place for it since those apply at all tiers.
- **The auto-hold threshold is 5, and T2 is worth 3.** So no *single* report from an
  established member can hold content on its own; two can, or five new accounts can, or one
  T3 (worth 10 — that is "T3 reports auto-hide", expressed as a weight rather than a special
  case, so there is one rule instead of two). A control where one annoyed person silences
  another will be used to settle arguments within the week, and this room is full of people
  who disagree about agents and outcomes.
- **Weight is snapshotted at report time**, not derived at read time, so a later promotion or
  demotion cannot retroactively re-price someone's old reports.
- **The T2/T3 upheld-report criteria were inconsistent as written and were reconciled.** The
  plan states T2 as "no upheld reports" and T3 as "zero upheld reports in 90 days" — read
  literally, a member with one old upheld report qualifies for T3 while being permanently
  barred from T2, which is not a ladder. Both now use the same 90-day recency window, so T3's
  requirements strictly imply T2's. The lifetime count is not discarded: it drives
  shadow-limiting, which is the right place for "this account has a history" to have teeth.
  One upheld call, which is sometimes wrong, should cost three months of link privileges —
  not the room for ever. `test_the_ladder_is_monotone` stops the inconsistency returning.
- **Demotion does not wait for the nightly job.** An upheld report recomputes the tier on the
  spot, because that is the one direction where a day's delay has a real cost — the account
  keeps posting in the meantime. Promotion is nightly, silent, and effective on the next
  request; nobody is told they were promoted, because being told turns a ladder into a game.
- **Short bodies are never fingerprinted** (`MIN_FINGERPRINT_CHARS = 40`). "Any update?"
  posted in thirty threads over a year is somebody waiting, not somebody spamming. Copy-paste
  touting is never that short — it has to contain the pitch.
- **Velocity raised from a first-draft 5 to 8 writes/60s.** A member firing off short answers
  across several threads can plausibly manage five or six in a minute, and holding *their*
  content costs a real person a real delay. The sharp controls are touting and duplication;
  this is the backstop behind them, so it is set where it only catches the unambiguous.
- **A held reply does not raise the visible reply count and sends no notification.** A thread
  reading "1 reply" with nothing under it advertises the hold, which tells a spammer exactly
  which message tripped the screen. Both effects are applied on release instead.
- **T4 is never demoted by `compute_tier`.** The badge is a disclosure the reader is owed,
  not a reward misbehaviour forfeits. A professional who abuses the room is shadow-limited and
  moderated like anyone else; what must not happen is the disclosure quietly falling off while
  they keep posting.

### Interfaces produced

- `community/antispam.py` (new; pure, no DB, no service imports):
  - `:122` `find_links(text)` · `:190` `find_phone_numbers(text)` · `:244` `find_handles(text)`
  - `:261` `contact_signals(text) -> list[str]` — the below-T2 reject gate
  - `:394` `touting_signals(text) -> list[str]` — held at every tier
  - `:421` `normalise(text)` · `:432` `fingerprint(text) -> str | None`
  - `:111` `is_allowed_link(candidate)` · `:86` `ALLOWED_LINK_DOMAINS`
  - `:416` `MIN_FINGERPRINT_CHARS = 40` · `:450-451` `VELOCITY_*` defaults ·
    `:457` `SIMILARITY_MIN_THREADS = 3`
- `community/tiers.py` (extended; still pure):
  - `:204` `ip_ceiling_applies(tier)` — **the open-decision-2 resolution**
  - `:277` `TrustSignals` · `:303` `compute_tier(signals) -> int`
  - `:349` `may_post_contact_details(tier)` · `:382` `report_weight(tier)`
  - `:379` `AUTO_HOLD_REPORT_WEIGHT = 5` · `:268` `UPHELD_REPORT_WINDOW_DAYS = 90`
  - `:273` `SHADOW_LIMIT_UPHELD_THRESHOLD = 3` · `:244-255` T2/T3 thresholds
- `community/trust.py` (new; the DB side):
  - `:58` `gather_signals(db, account) -> TrustSignals`
  - `:133` `recompute_tier(db, account) -> int`
  - `:170` `recompute_all_tiers(db, *, batch_size=500) -> dict` — the nightly entry point
  - `:211` `record_upheld_report(db, *, identity_id)` — increments, stamps, demotes
  - `:313` `screen_write(db, *, identity, text, fingerprint=None) -> ScreenResult`
  - `:238` `ScreenResult` (`.reject_reasons` / `.hold_reasons` / `.rejected` / `.held`)
  - `:264` `CONTACT_GATE_MESSAGE`
  - `:371` `auto_hold(db, *, target_type, target_id, reasons) -> CommunityReport`
  - `:408` `accumulated_report_weight(db, *, target_type, target_id) -> int`
  - `:425` `shadow_limit_filter(model, viewer)` · `:449` `visible_status_filter(model, viewer)`
- `community/service.py`:
  - `:102` `ContentGateError` — new; router maps it to **400** with the message verbatim
  - `consume_rate` now resolves the tier and skips IP *enforcement* above T1 (still counts)
  - `remaining_allowance` no longer reports an IP-bound remainder for T2+
  - `create_journey` / `create_journey_comment` screen before writing; set `status="held"`
    and file an auto-report when held
  - `list_journeys(..., viewer=)` — **new kwarg**; applies both soft-control filters
  - `get_journey` honours held + shadow-limited; `:1655` `_is_shadow_limited(db, identity_id)`
  - `report_target(..., reporter=)` — **new kwarg**; weights and may auto-hold
  - `_hold_reported_target`, `_release_held_comment`; `resolve_report` records the upheld
    report on hide/remove and **releases** a held target on dismiss
- `community/models.py`: `CONTENT_ACTIVE` / `CONTENT_HELD`, `REPORT_SOURCES`;
  `AnonIdentity.last_upheld_report_at`; `Journey.content_fingerprint`;
  `JourneyComment.content_fingerprint`; `CommunityReport.reporter_identity_id` / `.source` /
  `.weight`
- `community/notifications.py`: `list_my_posts` and `list_my_comments` now include the
  member's own held content
- `scheduler/jobs.py`: `_run_community_tier_recompute`, registered as
  `community_tier_recompute` at **03:20** (midnight already holds webhook renewal)
- `core/config.py:129-130`: `community_velocity_max_writes` (8),
  `community_velocity_window_seconds` (60)
- Schemas: `ReportOut.source` / `.weight`; `JourneyOut.is_held`;
  `ThreadStatusLiteral` gained `"held"`
- Migration `e9b1d3f5a7c2` (down_revision `d7f9b3c5e1a8`)
- Frontend: `useCommunityRecover`, `useCommunityResetPassword`
  (`src/lib/api/hooks/community.ts`); `RecoverView` (`components/room/recover-view.tsx`);
  `PasswordField` + `fieldCls` extracted to `components/room/password-field.tsx`;
  `(public)/community/recover/page.tsx` (noindex + robots-disallowed); held banner in
  `you-view.tsx`; "Forgotten it?" link in `account-dialog.tsx`
- Tests: `tests/agents/immigration/test_community_antispam.py` (43 new),
  `test_community_tiers.py` extended 26 → 45 (+19), `tests/e2e_community_antispam.py`
  (63 checks)

### Gotchas for whoever picks this up

1. **`status = "held"` is a new value on a plain String column** — no enum, no migration for
   it. The `assert set(THREAD_STATUSES) == set(ThreadStatusLiteral.__args__)` guard in
   `schemas.py:32` is what caught it being added in only one place; keep that guard.
2. **Any NEW public query that reads journeys or comments must apply BOTH filters** —
   `trust.visible_status_filter` and `trust.shadow_limit_filter` — exactly as p4 warned about
   `is_published`. There is still no global default scope. A query that forgets them leaks
   held content and shadow-limited authors into the feed, and nothing will fail.
3. **`shadow_limit_filter` explicitly keeps NULL-`identity_id` rows.** A bare `NOT IN`
   evaluates to NULL for them and would silently empty the feed of every seeded sample post —
   which looks like a broken query rather than a policy. Do not "simplify" it.
4. **`recompute_all_tiers` re-derives every tier from real signals**, so any hand-set
   `trust_tier` is reset the next time it runs. This bit the e2e (a tier set in §8 was gone by
   §12) and it will bite anyone who sets a tier by hand in prod. T4 is the exception — it is
   carried through, because `compute_tier` returns T4 for `is_professional`, which is itself
   read from the stored column. That is a deliberate self-perpetuating loop and the only way
   a hand-assigned tier survives the job.
5. **The velocity check counts landed writes across posts *and* comments**, in one 60-second
   window, per identity. Any new write path that creates `Journey` or `JourneyComment` rows
   without going through `screen_write` is invisible to it.
6. **`e2e_community_inbox.py` §8 had its "objectionable reply" body changed.** It used a
   touting phrase, which p6 now auto-holds before anyone can report it — so the section
   silently stopped testing anything (no notification, nothing for a moderator to remove). It
   now uses an unpleasant remark with no pattern to match, which is what "only a human can
   judge" looks like. The auto-hold path is covered directly in `e2e_community_antispam.py`.
7. **`tests/e2e_community_antispam.py` resets the IP scope at startup**, like its five
   siblings (p2 gotcha 1 applies verbatim).
8. **The pre-existing `ruff F841 journey_report_id`** at `e2e_community_moderation.py:192`
   is still there, still deliberately untouched — same reasoning p2 gave (gotcha 7): fixing
   unrelated lint would make this phase's diff dishonest.
9. **`(public)` editorial pages — including the new `/community/recover` — still render the
   old marketing navbar and footer**, whose links point at `/pricing`, `/features` and
   `/get-started`. Those routes now 307 to `/`. Pre-existing since p5 (it affects `/about`,
   `/terms`, `/privacy` equally) and not p6's to fix, but it is a real dead-end-ish click and
   somebody should own it.
10. **Seeding is a live dependency of the dual-source table.** See the epic-complete section
    below — this is the single most likely thing to make the product look broken on a fresh
    environment.

### Verify → result (p6)

- `PYTHONPATH=src .venv/bin/python -m pytest tests/ -q` → **179 passed** (117 before; +19 in
  `test_community_tiers.py`, +43 in the new `test_community_antispam.py`)
- `PYTHONPATH=src .venv/bin/python tests/e2e_community_antispam.py` → **63 checks, all
  passed**; re-run twice in the same UTC day, still green
- `PYTHONPATH=src .venv/bin/alembic upgrade head && … heads` → **`e9b1d3f5a7c2`, exactly one
  head**
- Regression, all still pass: `e2e_community_accounts.py`, `e2e_community_ratelimit.py`,
  `e2e_community_moderation.py`, `e2e_community_inbox.py`,
  `e2e_community_waitcheck_save.py`, `e2e_portal_flow.py`
- `ruff check` clean on every file this phase touched (the one remaining finding is the
  pre-existing F841 above)
- `cd immi-pulse-fe && bun run lint && bunx tsc --noEmit && bun run build` → tsc **clean**,
  build **compiled successfully** with `/community/recover` emitted, lint **5 errors / 26
  warnings — identical to the baseline measured on `feat/community-mvp` in a throwaway
  worktree**. Zero new findings.
- **The nightly job registers without disturbing the existing three** — `email_poll`,
  `webhook_renewal` and `precase_triage_retry` are untouched; `community_tier_recompute` is
  added at 03:20 and the startup log line names all four.

**Driven in a real browser** (uvicorn :8001 with the Resend sender captured to a file so the
genuine recovery link could be followed, `bun run dev`, Playwright):

- **Recovery, end to end, as a member would experience it.** `/community/recover` → entered
  the address → "**If we have that address, a link is on its way**" (the copy matches the
  backend's non-oracle exactly — it says *if*, and explains that the message looks the same
  either way) → the captured email carried
  `http://localhost:3000/community/recover?token=…` with the neutral subject "Reset your
  immi360 password" → following that link rendered "Choose a new password" → set it → landed
  in the room **already signed in as SunnyFalcon4817** → logged out → logged back in with the
  **new** password → composer footer read "Posting as SunnyFalcon4817". The old password was
  genuinely replaced, not shadowed.
- **The spent token is a single use.** Revisiting the same link and submitting returned
  "That recovery link is invalid or has already been used." **with the request form rendered
  directly beneath it** — no dead end.
- **The "Forgotten it? Recover your account — if you gave us an email" link** is present in
  the login panel and points at the route.
- **The link gate, live.** Posting "Has anyone used best-migration-help.com…" as a fresh
  account returned the gate message in the composer — **with the typed text still in the
  box**, nothing lost — reading "New accounts can't post links, phone numbers or contact
  handles yet. This lifts automatically once you've been part of the room for a week or so.
  Links to homeaffairs.gov.au and other official sources always work." No tier, no score, no
  number anywhere in it.
- **The allowlist earns its place.** The *same* T1 account then posted
  "Is this the right page? https://immi.homeaffairs.gov.au/visas/getting-a-visa" → **201, top
  of feed**. The most useful post in the room is not blocked.
- **Touting auto-hold, live.** Posting "I can lodge your 189 for you, my fee is very
  reasonable" → accepted, and: DB `status = held`; an open report with `source=auto`,
  `weight=5`, description "Held automatically: offer to lodge on someone's behalf; quoting a
  fee"; **an anonymous feed request returned 0 of them out of 100 posts**; the author's own
  feed still showed it; `/you` showed it under "**Waiting on a moderator. Something in this
  post matched a check we run on everything, so it is not in the feed yet. You can still see
  it here.**"

---

## Epic complete — community-mvp · 2026-07-18

Six phases, six squash-merged PRs into `feat/community-mvp`. The final
`feat/community-mvp` → `main` PR is **left for the human**, as the standing constraint
requires. Nothing was deployed.

### What the epic delivered

immi360 stopped being a marketing site with a community section and became a room.

- **A pseudonymous account** (p1) — assigned handle, member-set password, email genuinely
  optional and used for nothing but recovery and reply notifications. Fifteen seconds to join;
  no email means no recovery, said plainly at signup rather than buried. The existing
  `anon_identities` table grew into the account, so not one post had to be migrated.
- **Rate limiting that survives a restart** (p2) — Postgres-backed counters replacing a
  module-level dict that silently multiplied every limit by the dyno count, plus the five-tier
  scaffolding everything downstream reads.
- **An inbox** (p3) — the loop a Q&A community lives or dies on. You ask, someone answers, you
  find out. In-app first, which is exactly what makes the optional email workable. Email
  batched to one send per thread per day, and it says nothing: no subclass, no title, no reply
  text, not even in the preheader, because members share inboxes with partners and employers.
- **Honest numbers** (p4) — Wait Check and timeline-sharing collapsed into one act, every
  median travelling with its sample size, its still-waiting count and its provenance, and a
  hard n=20 floor below which the product says "not enough yet" instead of showing a figure
  that would swing on the next grant.
- **The room as the homepage** (p5) — a three-column shell replacing 787 lines of marketing.
  Also, incidentally, fixed the sitemap's journey entries, which had been emitting **zero**
  URLs since before the epic started because of a 422 nobody had noticed.
- **A self-running trust ladder** (p6) — silent nightly promotion, immediate demotion, link
  and contact gating below T2, touting held for a human at every tier, velocity and duplicate
  detection, weighted reports, and shadow-limiting. No tier is ever displayed except T4.

Across all six: **179 unit tests and six e2e scripts** (≈420 individual checks), a single
Alembic head throughout (`e5f7a9c1b3d5` → `e9b1d3f5a7c2`), and every phase driven in a real
browser or over a real socket before being called done.

### What is still open

1. **Seeding — the most likely thing to make this look broken.** The Room column of the
   dual-source table renders `—` and `n=0` on any database without scraped timelines. That is
   the n=20 floor behaving correctly: it refuses to publish a median from a thin sample. But
   **the p4 decision to include forum-collected timelines only pays off once
   `scripts/seed_community_scraped.py` has actually been run wherever the app is deployed** —
   the loader and the 141-row dataset (`scripts/scraped_journeys.json`) exist and are *not*
   loaded in every environment. Observed directly in the browser during p6: every Room figure
   showed a dash. **Run the seeder as part of deploying this epic**, or the single most
   distinctive thing the product does will look empty on day one.
2. **Kaplan–Meier** (deferred by p4, as the plan permitted). The input shape it needs already
   exists — `service._cohort_sample` is provenance-split and window-filtered. What is missing
   is the survival curve and a product decision: a KM median beside an official band that is
   *not* censoring-corrected is no longer comparing like with like. `test_processing_engine.py`
   pins the current optimistic bias with a fixture where the two medians differ by more than
   2×, so the omission is documented in a test rather than a comment.
3. **Per-IP tuning.** p6 resolved *who* the ceiling applies to (T0/T1 only). The **numbers** —
   25 posts / 60 replies / 30 reports per network per day — are still p2's starting values.
   Every rejection logs at WARNING with `scope=ip action=… cap=… signed_in=…`; the first
   fortnight of real traffic should move them. Same for
   `community_velocity_max_writes` (8/60s), now a setting rather than a constant.
4. **Whether sample timelines should leave the *feed*.** Still an unmade decision, correctly
   left unmade. Samples have always populated the feed and are most of its current content;
   removing them would empty it. This cannot be decided until enough member-reported content
   exists to fill the gap — which is a reason to watch the ratio, not a reason to defer
   indefinitely.
5. **T4 professional verification.** Out of scope by design: build OMARA/MARN checking when
   the first genuine registered agent asks to take part. The tier, its caps and its
   never-demoted disclosure semantics all exist and are tested; only the verification is
   missing.
6. **Two small inherited items**, both recorded above as p6 gotchas: the old marketing
   navbar/footer on surviving editorial pages links to retired routes (gotcha 9), and the
   pre-existing `ruff F841` in `e2e_community_moderation.py` (gotcha 8).
