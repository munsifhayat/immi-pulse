# PROGRESS — Share Your Timeline

Epic: Deliver the *share your visa timeline* flow end to end — from first tap to a row that
counts in the community statistics.
Integration branch: `feat/share-timeline`
Base: `main`
Baseline: `31bad77` (source plan phases 0, 1, 3 — built and verified before this epic)

Phase status: [pending] p1 · [pending] p2 · [pending] p3 · [pending] p4 · [pending] p5

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

## Open — must be settled before p1 writes code

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
pending addresses are unique, which is exactly what reintroduces pre-hijacking.

Record the resolution here before p1 starts.
