# PLAN — Community-first MVP, end to end

Epic slug: community-mvp
Created: 2026-07-18
Revised: 2026-07-18 (v2 — adopted the Reddit-proven single pseudonymous account model)
Base branch: main
Integration branch: feat/community-mvp
Verify method (project-wide default):
- **Backend logic:** `cd immi-pulse-be && source .venv/bin/activate && PYTHONPATH=src pytest tests/ -v`
- **Backend flows:** standalone e2e scripts — `PYTHONPATH=src python tests/e2e_<name>.py` (pattern: `tests/e2e_community_moderation.py`, drives the app in-process via `httpx.ASGITransport`, real DB, real JWTs)
- **Frontend:** `cd immi-pulse-fe && bun run lint && bunx tsc --noEmit && bun run build` (there is **no** test runner in the FE — these three are the only gates, so drive the real flow before calling a phase done)

## Overview

Turn immi360 from a SaaS marketing site with a community section into a community platform: the homepage becomes the room, every member has a pseudonymous account that holds their questions and replies, wait-checking and timeline-sharing collapse into one flow, and every wait number is published honestly beside the official one.

The gap is narrower than it looks. A full anonymous-identity layer, moderation queue, Resend email integration, dual-source `VisaReference` data, and a three-column feed grid (`community-feed.tsx:99`) already exist. What is missing is: real accounts, an inbox, durable rate limiting, the unification of wait-check with timeline-sharing, statistical honesty about still-waiting cases, and the homepage itself.

### The identity model (decided — everything else follows from this)

**One pseudonymous account, Reddit-style.** Not a device token that later upgrades into an email account — that is two identity systems stitched together, and the stitching is where the complexity lives.

- **Assigned username + password.** The handle generator already exists (`community/identity.py:34` → `BoldLagoon7745`). The member sets a password; nothing else is required.
- **Email is optional**, offered for exactly two reasons: password recovery, and being told when someone replies. It is never displayed, never public, and never required to participate. For this audience an email address is often a real name and a real risk, so mandating it would deter precisely the people we want.
- **No email means no recovery.** Lose the password, lose the account. This must be said plainly at signup, not buried.
- **The in-app inbox is the primary notification channel**, not email. That is what makes optional email viable — you always have somewhere to see your replies.
- **Writing requires an account.** T0 visitors read, search, and run Wait Check without one.

**Implementation shape:** evolve the existing `anon_identities` table into the account rather than adding a parallel table. It already carries a unique `handle`, `color`, `device_token`, `ip_hash`, and counters, and every `Journey`/`JourneyComment` already FKs to `identity_id`. Adding `password_hash` + optional `email` turns existing anonymous identities into claimable accounts with **no content migration at all**. Keep the table name (a rename touches too much for the benefit); update the docstring and record the naming debt.

### Environment facts every phase needs

- **Backend runs on :8001 locally** — `server.py` defaults to 8000 but `immi-pulse-fe/.env.local` points at `http://localhost:8001/api/v1`. Start with `PORT=8001`.
- Postgres is docker container `be-db-1` on :5432 (healthy).
- Alembic single head: **`e5f7a9c1b3d5`**. Keep it single — never create a second head.
- Backend needs `source .venv/bin/activate` and `PYTHONPATH=src` for every command.
- **Frontend is bun-only.** Never npm/yarn/pnpm (CLAUDE.md rule).
- **Public (no X-API-Key) routes must sit under `/api/v1/community/public/...`** — the middleware exempts that prefix (`middleware/api_key_auth.py:33`).
- Device token is the `X-Device-Token` header from localStorage `ip_device_token`, attached by the axios interceptor at `src/lib/api/client.ts:22-33`. Bearer token is localStorage `ip_token`.
- Password primitives already exist and are good: `hash_password`/`verify_password` (`core/jwt_auth.py:70,75`, bcrypt over an HMAC pepper) and `assert_password_acceptable()` (`core/password_policy.py:84`, complexity + HIBP breach check). Tests disable the breach check with `BREACH_CHECK_ENABLED=false`.
- **Do not deploy.** No Heroku push, no Vercel deploy, no merge to `main`.

---

## Phase 1 — Pseudonymous accounts   [id: p1]

Depends on: none

Goal: Give every member a real account that is still anonymous — an assigned username, a password, and optionally an email for recovery and notifications. Done means: someone can sign up in about fifteen seconds, log in from a second device, and find the questions they posted from the first one.

Files likely touched:
- `immi-pulse-be/src/app/agents/immigration/community/models.py` (`AnonIdentity` gains `password_hash`, `email`, `email_verified_at`, `last_login_at`)
- `immi-pulse-be/src/app/agents/immigration/community/accounts.py` (new — signup, login, session JWT, `require_community_account`, optional-email recovery)
- `immi-pulse-be/src/app/agents/immigration/community/router.py` (routes under `/community/public/auth/*`)
- `immi-pulse-be/src/app/integrations/resend/templates.py` (recovery mail — use `send_generic()` at line 214, no new HTML template)
- `immi-pulse-be/migrations/versions/<new>_community_accounts.py`
- `immi-pulse-be/tests/e2e_community_accounts.py` (new)

**The signup moment (this ordering is the whole point):** never show an empty signup form. The member does the thing first — runs a wait check, writes a timeline — and *then* claims it. The draft is held against the device token, so abandoning at the password step loses nothing and can be re-prompted later.

**Device token durability:** move it from localStorage to a **server-set HttpOnly cookie**. Safari's ITP deletes script-writable storage after seven days without a visit, which is catastrophic for a product whose users check back monthly over a fourteen-month wait. A server `Set-Cookie` is not subject to that rule and is XSS-safe. Cost: the frontend and backend are on different origins, so this needs `SameSite=None; Secure`, `credentials: 'include'` client-side, and an explicit (non-wildcard) CORS origin — `settings.effective_cors_origins` already names origins, so it is contained but real.

Acceptance criteria:
- [ ] `POST /community/public/auth/signup` assigns a handle from the existing generator, accepts a password, and optionally an email. Returns a session token
- [ ] Handle uniqueness uses the existing retry loop against the table. Note the wordlist is small (20 adjectives × 20 nouns × 4 digits ≈ 3.6M); fine now, worth expanding before scale so handles stop looking repetitive
- [ ] The member can **reroll the handle before committing** — the reroll endpoint and `useRerollIdentity` hook already exist
- [ ] **One password field, no confirm-password** — use a show-password toggle instead; confirmation fields add friction and no longer reflect good practice
- [ ] Password runs through `assert_password_acceptable()` — the HIBP breach check already in the codebase — but the breach check **degrades open** on timeout (2.5s is configured) rather than blocking signup
- [ ] Email is presented with its two reasons attached ("so we can tell you when someone replies, and so you can recover your password"), not as a bare optional field
- [ ] Skipping email surfaces the unmissable no-recovery acknowledgement
- [ ] The claim flow has an **"already have an account? log in"** path, so someone on a second device does not silently create a duplicate
- [ ] The device token is a server-set HttpOnly cookie; the `X-Device-Token` header path keeps working during transition
- [ ] `POST /community/public/auth/login` takes handle + password; failed attempts are counted and throttled
- [ ] Session JWT uses its own audience (`immi-pulse.community.session`) and `require_community_account` resolves it **without** requiring a seat or org — community members have neither, so `get_current_context` cannot be reused
- [ ] Email is nullable and unique-when-present; it is never returned by any public serializer
- [ ] Signup with no email surfaces an explicit, unmissable "this account cannot be recovered" acknowledgement
- [ ] `POST /community/public/auth/recover` works only when an email is present; responds identically whether or not the address is known
- [ ] An existing anonymous identity can claim itself by setting a password, keeping its handle and all prior content
- [ ] **A test proves `handle` and `email` never appear in any consultant-facing serializer** — a client must never be discoverable to their agent
- [ ] Alembic head remains single

Verify by:
- `PYTHONPATH=src pytest tests/ -v`
- `PYTHONPATH=src python tests/e2e_community_accounts.py` — signup without email → post → log in from a fresh client with no device token → assert the post is listed as theirs; signup with email → recover; assert consultant-serializer leak test passes. Monkeypatch `app.integrations.resend.templates` to capture instead of send (pattern: `tests/e2e_portal_flow.py:38-39`)
- `PYTHONPATH=src alembic upgrade head && PYTHONPATH=src alembic heads` (exactly one head)

Out of scope: magic links, OAuth, SMS, the frontend auth UI, trust tiers, the inbox.

---

## Phase 2 — Durable rate limiting & tier scaffolding   [id: p2]

Depends on: p1 (caps are resolved per account, so the account must exist first)

Goal: Replace the in-process rate limiter with a Postgres-backed one and add the trust-tier columns everything downstream reads. Today `_rate_state` is a module-level dict (`community/service.py:56`) — counters reset when the dyno restarts and each dyno keeps its own tally, so the effective limit silently multiplies by dyno count. Every anti-spam control in p6 assumes this layer is real.

Note the ladder is now **five tiers**, keyed on the account: T0 Visitor (no account, read + Wait Check only) · T1 New account (probation) · T2 Established · T3 Trusted · T4 Registered professional. Email verification is **not** a tier — it is an attribute that shortens probation.

Files likely touched:
- `immi-pulse-be/src/app/agents/immigration/community/models.py` (new `RateCounter`; tier columns on the account)
- `immi-pulse-be/src/app/agents/immigration/community/service.py` (`_consume_rate`, `_RATE_LIMITS`, `_ANON_IP_TIMELINE_CAP`)
- `immi-pulse-be/src/app/agents/immigration/community/tiers.py` (new — pure, unit-testable cap resolution)
- `immi-pulse-be/migrations/versions/<new>_rate_counters_and_tiers.py`
- `immi-pulse-be/tests/agents/immigration/test_community_tiers.py` (new)

Acceptance criteria:
- [ ] `rate_counters` table keyed on `(scope_type, scope_key, action, window_start)` with a `count`; `scope_type` is `ip` or `account`
- [ ] `_consume_rate` reads and writes that table; no module-level dict remains
- [ ] Account gains `trust_tier` (int, default 1), `tier_computed_at`, `upheld_reports`, `shadow_limited`
- [ ] `tiers.py` exposes a pure `caps_for(tier)`; **T1 = 5 posts / 20 replies per day**, with a per-IP ceiling of 25 posts / 60 replies
- [ ] Exceeding a cap still raises `CommunityRateLimitError` → HTTP 429, unchanged API contract
- [ ] A counter written, then read back **in a new process**, still enforces the limit
- [ ] Alembic head remains single

Verify by:
- `PYTHONPATH=src pytest tests/ -v`
- `PYTHONPATH=src python tests/e2e_community_ratelimit.py` (new: exhausts a cap, restarts in a second process, asserts the cap still binds)
- `PYTHONPATH=src alembic heads`

Out of scope: tier *promotion* criteria (p6), link gating, velocity detection, frontend.

---

## Phase 3 — Inbox & profile   [id: p3]

Depends on: p1 (notifications belong to an account)

Goal: Close the loop that makes a Q&A community work at all — you ask something, and you find out when someone answers. Without this people post into a void and never return. Two surfaces, exactly as Reddit does it: an **Inbox** of replies with an unread badge, and a **You** profile listing your posts and your comments together.

Nothing like this exists today: there is no notification model anywhere in the backend, and no "my activity" query surface — journeys carry only an `is_mine` flag (`community/service.py:987`).

Files likely touched:
- `immi-pulse-be/src/app/agents/immigration/community/models.py` (new `CommunityNotification`)
- `immi-pulse-be/src/app/agents/immigration/community/service.py` (fan-out on comment insert; activity queries)
- `immi-pulse-be/src/app/agents/immigration/community/router.py` (`/community/me/inbox`, `/community/me/posts`, `/community/me/comments`)
- `immi-pulse-be/src/app/integrations/resend/templates.py` (reply notification, opt-in only)
- `immi-pulse-be/migrations/versions/<new>_community_notifications.py`
- `immi-pulse-be/tests/e2e_community_inbox.py` (new)

Acceptance criteria:
- [ ] `CommunityNotification` records recipient, type (`reply_to_post` | `reply_to_comment`), source ids, and `read_at`
- [ ] A reply to your post, or to your comment, creates exactly one notification; **replying to yourself creates none**
- [ ] `GET /community/me/inbox` returns items plus an unread count; marking read is idempotent
- [ ] `GET /community/me/posts` and `/community/me/comments` back the two profile tabs
- [ ] Email notification is **opt-in and only sent when an email exists**; it is batched — first reply sends, then at most one digest per thread per day, so a popular question never sends twenty emails
- [ ] **Email subjects are neutral** — "You have a new reply on immi360", never anything naming a visa subclass or topic. Members share inboxes and devices with partners, employers, and family, and a revealing subject line can cause real harm. This is a hard rule
- [ ] Notifications are removed or hidden when their source content is moderated away
- [ ] Alembic head remains single

Verify by:
- `PYTHONPATH=src pytest tests/ -v`
- `PYTHONPATH=src python tests/e2e_community_inbox.py` — account A posts, B replies → A has 1 unread, B has 0; A replies to self → still 1; mark read → 0; with an email set, assert exactly one send captured for three rapid replies (batching), and assert the captured subject contains no visa/topic terms

Out of scope: push notifications, DMs, digests beyond the reply case, the frontend inbox UI (p5).

---

## Phase 4 — Wait Check ↔ timeline, and honest numbers   [id: p4]

Depends on: p1 (saving a check belongs to an account)

Goal: Collapse "check my wait" and "share my timeline" into one act — both need the same two facts, visa and lodgement date — and make every published number honest about what it is made of. Wait Check stays **completely open**: no account, no gate, because it is the acquisition hook and the SEO magnet. Saving the result is what creates your timeline.

This fixes cold-start: data starts coming from the highest-traffic page instead of the rarest action. The seam half-exists already — `wait-check.tsx:348-357` embeds `<ShareTimeline>` in the no-data branch; this makes it the primary path for every branch.

On honesty: community percentiles today come from **decided cases only** (`processing.py:84`), which understates waits because fast grants leave the queue first while slow cases are still in it — textbook right-censoring. The engine already carries a `pending` count and calls it "honest denominators"; this finishes that thought.

Files likely touched:
- `immi-pulse-be/src/app/agents/immigration/community/router.py`, `service.py`, `processing.py`
- `immi-pulse-be/src/app/agents/immigration/community/models.py` (`Journey` draft/published state)
- `immi-pulse-fe/src/app/(public)/community/_components/wait-check.tsx`, `official-times.tsx`
- `immi-pulse-be/migrations/versions/<new>_journey_draft_state.py`
- `immi-pulse-be/tests/agents/immigration/test_processing_engine.py` (extend), `tests/e2e_community_waitcheck_save.py` (new)

Acceptance criteria:
- [ ] `GET /community/public/wait-check` still works with **no** auth and no account — unchanged contract
- [ ] Saving a check stores it as an **unpublished** timeline against the account
- [ ] **Publishing to the feed is a separate, explicit consent.** Saving privately and publishing publicly are different acts and different calls
- [ ] Unpublished timelines never appear in the feed or in any public stat
- [ ] A saved timeline accepts later milestones (medical, s56, grant) from its owner
- [ ] The stats endpoint returns an explicit `official` block and a `room` block; the frontend never renders one without the other
- [ ] Every community median travels with `sample_size`, `pending`, and a `sufficient` flag; below **n = 20** decided cases the UI says so instead of showing a number
- [ ] Only lodgements from the **last 12 months** feed the estimate
- [ ] Official figures always show their as-at date (`VisaReference.official_updated`). They are hand-seeded, **not** ingested — nothing may claim "checked daily"
- [ ] Kaplan–Meier (still-waiting as censored observations) is **explicitly deferred** unless it lands comfortably; ship honest denominators and record the deferral

Verify by:
- `PYTHONPATH=src pytest tests/ -v` (extend `test_processing_engine.py` with a censoring fixture where decided-only and pending-aware medians differ materially)
- `PYTHONPATH=src python tests/e2e_community_waitcheck_save.py` — anonymous check needs no credentials; saved check is absent from journeys and stats until explicitly published
- `cd immi-pulse-fe && bun run lint && bunx tsc --noEmit && bun run build`

Out of scope: the app-shell layout (p5), automating official-figure ingestion.

---

## Phase 5 — The app shell homepage   [id: p5]

Depends on: p1, p3, p4 (auth state, inbox, and dual-source data must be real before the shell renders them)

Goal: The homepage stops selling and becomes the room. Land directly in a three-column X-familiar shell: static left rail (nav + queue filter), a centre column that is the only thing that scrolls, and a static right rail (search, wait-check teaser, dual-source times, footer links). Reference: `context/community/home-app-shell-mockup.html` — a working prototype whose composer modes, filtering, `/` shortcut, and Wait Check page-swap all function.

**This is mostly hoisting, not building.** `community-feed.tsx:99` already implements the exact grid with sticky asides; `feed-filter-rail.tsx`, `feed-post.tsx`, `official-times.tsx`, `identity-badge.tsx`, `milestone-strip.tsx` are near drop-ins. The current homepage (`(public)/page.tsx`, 787 lines of marketing) uses none of the `c-*` token system and is replaced wholesale.

Files likely touched:
- `immi-pulse-fe/src/app/(public)/page.tsx` (replaced), `community/` (grid hoisted to a shell layout)
- `immi-pulse-fe/src/app/(public)/layout.tsx`, `src/components/public/navbar.tsx`
- New routes: `/wait-check`, `/inbox`, `/you`
- `immi-pulse-fe/src/lib/api/hooks/community.ts` (auth, inbox, activity hooks)
- `immi-pulse-fe/next.config.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`

Acceptance criteria:
- [ ] `/` renders the three-column shell; `/community` redirects to `/`
- [ ] Left nav: Home · Questions · Timelines · Wait Check · **Inbox (with unread badge)** · **You**. My cohort and Find a consultant are **removed**
- [ ] **You** profile has Posts and Comments tabs, matching the Reddit pattern the founder specified
- [ ] Composer has exactly two modes — Ask the room (default) and Share your story
- [ ] Composer shows the sign-in prompt **before** a write is attempted when there is no account or the allowance is spent — never a 429 after the fact
- [ ] Feed rows carry exactly **two** actions — upvote and reply — with share as a quiet tertiary icon. No separate like, no repost
- [ ] Reply nesting capped at **one level**; deep threads are unreadable on phones
- [ ] Signup UI assigns the handle (does not ask the member to invent one), takes a password, and offers email as clearly optional with the no-recovery warning
- [ ] Wait Check is its own route with a shareable URL
- [ ] `/pricing`, `/features`, `/get-started` redirect and are `noindex` — **not deleted** (reuse the `/find-consultants` pattern at `next.config.ts:14-27`)
- [ ] The dynamic journey sitemap entries survive — `sitemap.ts:17` is described in-code as "the organic growth engine"

Verify by:
- `cd immi-pulse-fe && bun run lint && bunx tsc --noEmit && bun run build`
- Drive it: backend on `PORT=8001`, `bun run dev`, then sign up, post a question, reply from a second account, confirm the first account's inbox badge, and load `/wait-check`. Use the `/run` or `/verify` skill — a green build is not evidence the room works

Out of scope: backend contract changes (p1–p4), moderation UI, the marketplace.

---

## Phase 6 — Trust promotion & anti-spam   [id: p6]

Depends on: p2 (counters), p1 (accounts to promote), p5 (surfaces to gate)

Goal: Make the ladder self-running and close the spam vectors that matter before the room is public. Tiers are computed, never displayed as a score — the only visible tier is the registered-professional badge, and that is a disclosure requirement, not a reward. The highest-leverage control is link gating, because nearly all real immigration-forum spam is link spam from unregistered agents touting, which is simultaneously the top spam vector and the top s276 legal vector.

Because accounts are free to create, **new-account probation is the control that actually binds** — not per-account caps alone.

Files likely touched:
- `immi-pulse-be/src/app/agents/immigration/community/tiers.py`, `service.py`
- `immi-pulse-be/src/app/scheduler/jobs.py` (nightly recompute — APScheduler already runs here)
- `immi-pulse-be/tests/agents/immigration/test_community_tiers.py` (extend), `tests/e2e_community_antispam.py` (new)

Acceptance criteria:
- [ ] Nightly job recomputes `trust_tier`; promotion is silent and effective on next request; demotion on upheld reports is automatic
- [ ] **T2 (Established):** 7+ days · 5+ surviving contributions · net-positive votes · no upheld reports → unlocks outbound links. A verified email shortens the age requirement
- [ ] **T3 (Trusted):** 90+ days · 25+ contributions · **at least one completed timeline** · zero upheld reports in 90 days → flags auto-hide pending review. Tenure alone is farmable; finishing a visa queue is the thing only this community can verify
- [ ] **Outbound links, phone numbers, and messaging handles blocked below T2**, pattern-matched rather than URL-parsed only
- [ ] Touting patterns (fee offers, WhatsApp/DM solicitation, "I can lodge for you") auto-hold into the **existing** moderation queue
- [ ] Velocity (N writes in 60s) and similarity (same body across 3+ threads) auto-hold
- [ ] T2 reports weighted ~3×; T3 reports auto-hide
- [ ] Shadow-limited accounts still see their own content; the feed does not
- [ ] IP throttling **never hard-bans** — this audience shares IPs (campuses, share houses, carrier CGNAT) far more than most; rejections degrade to a sign-in prompt
- [ ] No tier is rendered as a visible score or leaderboard except T4

Verify by:
- `PYTHONPATH=src pytest tests/ -v`
- `PYTHONPATH=src python tests/e2e_community_antispam.py` — a fresh account's link is rejected, a seeded T2 account's passes; duplicate bodies across three threads auto-hold; a shadow-limited author sees their own post while the feed omits it
- Confirm the nightly job registers without breaking existing scheduler jobs

Out of scope: T4 professional verification (OMARA/MARN checking) — build it when the first genuine agent asks to take part; DMs; the marketplace.
