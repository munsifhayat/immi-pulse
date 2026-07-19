# PROGRESS — Share Your Timeline

Epic: Deliver the *share your visa timeline* flow end to end — from first tap to a row that
counts in the community statistics.
Integration branch: `feat/share-timeline`
Base: `main`
Baseline: `31bad77` (source plan phases 0, 1, 3 — built and verified before this epic)

Phase status: [done] p1 · [pending] p2 · [pending] p3 · [pending] p4 · [pending] p5

<!--
Legend: pending → in_progress → done  (or blocked)
Append one handoff block per finished phase below. The handoff carries CONCLUSIONS
the next phase needs — not the conversation.
-->

## Standing constraints (apply to every phase)

See PLAN.md § "Standing constraints". Summary: **do not deploy**, backend needs
`source .venv/bin/activate` + `PYTHONPATH=src` and runs on `PORT=8001`, frontend is bun-only,
Alembic stays on a single head (`a3c5e7b9d1f4` at baseline), new no-API-key routes live under
`/api/v1/community/public/`.

## Decided (do not re-litigate)

- **Land phases 0/1/3 as a baseline commit on the integration branch**, not on `main`.
  Confirmed 2026-07-19. `main` stays untouched until one final human-merged PR.
- **The per-device anonymous identity survives.** It remains the pre-account identity
  backing anonymous browsing and the one-timeline cap. Signup mints a *new* account row
  rather than claiming the device row; an *unclaimed* device row is adopted so pre-join
  posts carry over. Confirmed 2026-07-19. This rules out both alternatives considered:
  abandoning the device row on signup, and dropping anonymous identity entirely.
- **One pseudonymous account, Reddit-style** (carried over from the community-mvp epic).
  Assigned handle via `generate_handle()`, member-set password. The handle is the *public*
  identity and the login identifier; email is never displayed.
- **All 43 subclasses** are offered. Thin cohorts fall back to official DHA figures with an
  honest "no community data yet" — already `wait_check`'s behaviour. Nobody is turned away
  at the door. (Source plan decision 3.)
- **Nationality is optional and never shown publicly** — cohort matching only, excluded from
  every public serializer. (Source plan decision 4.)
- **Email is required at signup and unverified**, with a retype as the typo guard. Session
  is issued immediately. (Source plan decisions 1 and 2 — already built in the baseline.)

- **Email conflicts get a generic message; recovery is fixed instead.** Confirmed
  2026-07-19. Pending addresses stay non-unique, so a stranger's address can never be
  burned. Signup neither confirms nor denies that an address is in use. Recovery stops
  breaking on duplicates — key on handle + email, or mail every matching account (only the
  real inbox owner ever sees that list). This rules out making `email_pending` unique, and
  defers the email-verification flow out of this epic. **Consequence: we cannot show "that
  email already exists", by design.** See the reasoning below.

## Settled — the email uniqueness question (resolved above; kept for the why)

**Email uniqueness on signup.** The baseline deliberately made `email_pending` **non-unique**
(`models.py:136-148`) to close the account pre-hijacking hole documented in the source plan
§G0.3 (Sudhodanan & Paverd, USENIX Security 2022 — 35 of 75 popular services shipped this
bug). Only `email_verified` is unique. But **nothing in the codebase ever writes
`email_verified`** — there is no verification flow — so in practice every address is pending
forever and duplicates are silently permitted.

That has a consequence nobody has decided on: `get_by_email` (`accounts.py:237-271`) resolves
a pending address only when **exactly one** account claims it, and returns `None` on
ambiguity. So two members who sign up with the same address lock *each other* out of password
recovery, permanently and silently. This directly undercuts the source plan's decision 2,
which promises "recovery, which finally works for everyone".

The requested behaviour — showing "that email already exists" — is only enforceable if
pending addresses are unique, which is exactly what reintroduces pre-hijacking. Resolved in
favour of the security property: p1 fixes recovery so duplicates stop causing a silent
mutual lockout, and signup stays deliberately uninformative.

---

## Handoff — p1: account identity keyed on email and handle   [done]

Branch `feat/share-timeline-p1-account-identity` → squash-merged into `feat/share-timeline`.
Note the **dashed** branch name: git cannot create `feat/share-timeline/p1-...` while a
branch named `feat/share-timeline` exists. Later phases hit the same wall — use the dash.

### What shipped vs planned

Everything in the phase spec, plus one gap the split itself opened (reroll, below). The
shape of the fix is one invariant, stated on `AnonIdentity` (`models.py:100-128`):

> **A row is addressed by a device token OR by a session, never both. An account row never
> holds a `device_token`.**

Signup releases the token; login touches neither cookie nor token; logout mints a
replacement. Every acceptance criterion falls out of that one rule rather than being
patched individually.

- `device_token` is nullable (`models.py:137`). The named constraint
  `uq_anon_identity_device_token` was **kept** — Postgres allows unlimited NULLs under a
  UNIQUE index, so nullable + unique coexist and no constraint had to be dropped.
- Signup on a claimed browser mints a new account beside it; on an unclaimed browser it
  adopts the row so pre-join posts carry over (`accounts.py:323-412`). The 409 is gone.
- `_session_out` no longer sets the device cookie, and `CommunitySessionOut` no longer has
  a `device_token` field at all — deleting the field is what stops a future client
  reintroducing the rebind by reading it.
- New `POST /community/public/auth/logout`. It **ignores** the incoming token and mints a
  fresh identity rather than clearing the cookie, so a client that fails to clear its
  localStorage still lands somewhere new instead of back where it was.
- Recovery now fans out to every claimant of a duplicated pending address
  (`find_by_email` returns a **list**, capped at `RECOVERY_FANOUT_MAX = 5`).

### Key decisions and why

1. **Release the token rather than delete the row or add a table.** Keeps `anon_identities`
   as the single identity table (the naming debt is already documented and accepted) and
   makes `get_identity_by_token` structurally incapable of returning an account — which is
   the property every signed-out surface leans on, rather than a check each one repeats.
2. **Logout is a server round-trip.** It has to be: the durable token copy is an HttpOnly
   cookie no script can reach. This is the only auth action that cannot be done client-side.
3. **Kept the `identity.password_hash` branch in `signup`.** Post-migration no device token
   can address an account, so it is unreachable for new traffic — it stays as the guard for
   legacy rows and because losing it would turn a stale binding into a 500.
4. **Recovery mails everyone rather than refusing to guess.** Per the Decided section. Only
   the inbox owner ever sees the list, so it leaks nothing; each mail names its own handle
   and carries its own single-use token.
5. **`unique_handle` moved** from `CommunityService._unique_handle` to `accounts.py:228`
   (module-level) because signup needed it and the import only runs one way — `accounts.py`
   does not import `service.py`. Do not reverse this; it would be a cycle.

### Interfaces produced (what p2+ will call)

| Thing | Where |
| --- | --- |
| `POST /api/v1/community/public/auth/logout` → `IdentityOut` | `router.py:468` |
| `_session_out(account)` — one arg now, no `Response` | `router.py:388` |
| `reroll_identity` — takes `optional_community_account` | `router.py:355` |
| `unique_handle(db)` — module-level | `accounts.py:228` |
| `CommunityAccountService.find_by_email(db, email) -> list` | `accounts.py:274` |
| `CommunityAccountService.signup(db, *, identity, password, email)` | `accounts.py:323` |
| `begin_recovery` → `list[tuple[AnonIdentity, str]]` | `accounts.py:450` |
| `AnonIdentity.device_token` nullable | `models.py:137` |
| `CommunitySessionOut` — no `device_token` | `schemas.py:486` |
| `useCommunityLogout()` — now **async** | `hooks/community.ts` |

### Gotchas for the next phase

- **Run `alembic upgrade head` first.** New head is `b7d9f1a3c5e2` (down_revision
  `a3c5e7b9d1f4`). Single head confirmed. Downgrade round-trips cleanly — it synthesises
  `'detached-' || id` tokens so NOT NULL can come back — and was tested both directions
  against 626 live local rows with no row loss. It is *not* lossy, unlike `a3c5e7b9d1f4`.
- **`get_by_email` is gone**, replaced by `find_by_email` returning a list. Anything reaching
  for the old singular helper wants the list now.
- **`CommunityService._unique_handle` is gone** — import `unique_handle` from `accounts`.
- **Reroll was a live gap, now closed.** It resolved identity by device token only, so once
  signup released the account's token a signed-in member's reroll would silently reroll the
  throwaway anonymous row beside their session and report 200 while their real handle stood.
  It now resolves the session first (`router.py:355`). **Any other endpoint that resolves
  identity by device token alone has this same bug** — `_writer_identity` and
  `_viewer_identity` were already correct, but check new ones against that precedence.
- **A signed-in member's browser holds two identities**: their account (via session) and a
  throwaway anonymous row (via device token). That is by design. Any surface that must mean
  "the member" has to go through the session.
- **The e2e convention has two client shapes now.** `NoCookieClient`
  (`e2e_community_accounts.py:39`) drops the cookie jar so device identity is header-only —
  right for cross-device claims. `Browser` (`e2e_community_identity_swap.py:49`) keeps a live
  jar and mirrors the real `client.ts` interceptor — required for anything about logout,
  because the bug lived in the cookie. Pick deliberately.
- No TODOs left. `user_id` (portal FK) was not touched, as scoped.

### Verify result — all green

- `pytest tests/ -q` → **183 passed** (180 baseline + 3 new invariant tests).
- `alembic heads` → exactly one (`b7d9f1a3c5e2`); downgrade→upgrade round-trip verified.
- New `tests/e2e_community_identity_swap.py` → **39/39**, on one simulated browser: adoption
  of an unclaimed row · signup → logout → signup again succeeds with distinct rows · a
  post-logout anonymous write does not carry the prior handle · login disturbs neither token
  nor cookie · both claimants of a duplicated email recover and log back in.
- `e2e_community_accounts.py` → 69/69 (updated: the 409 case inverted, ambiguous-recovery
  case inverted, reroll lock re-asserted through the session).
- `e2e_community_{inbox,antispam,ratelimit,waitcheck_save,taxonomy,moderation}.py` → all pass.
- `bunx tsc --noEmit` clean · `bun run build` clean · `bun run lint` still exactly the 5
  pre-existing errors, none in `src/components/community/` or `src/lib/`.
