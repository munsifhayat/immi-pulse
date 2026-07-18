# PROGRESS — Community-first MVP, end to end

Epic: Turn immi360 into a community platform — pseudonymous Reddit-style accounts with an inbox, app-shell homepage, unified wait-check/timeline flow, dual-source (Official vs Room) wait data, and a self-running trust ladder.
Integration branch: feat/community-mvp
Base: main
Phase status: [pending] p1 · [pending] p2 · [pending] p3 · [pending] p4 · [pending] p5 · [pending] p6

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
