# IMMI-PULSE — Final Implementation Plan
## Enquiry → Open Case revamp + Client Portal (with multi-agent accounts)

> **Purpose of this document.** This is a self-contained handoff for an engineer/agent picking up the work in a fresh session. It explains what exists today, the target experience, the locked product decisions, the data-model changes, and a phased build plan with acceptance criteria and a file-by-file change list. Two clickable, interaction-verified prototypes accompany it and are the visual source of truth.
>
> **Prototypes (open these first):**
> - `context/pilot-partners/consultant-inquiry-to-case-flow.html` — the consultant's guided enquiry→case workspace.
> - `context/pilot-partners/client-portal-mvp.html` — the client portal.
>
> **Stack reminder:** Backend = Python FastAPI, async SQLAlchemy 2.0 + asyncpg (PostgreSQL), Alembic, AWS Bedrock, Resend for email. Frontend = Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui, TanStack Query, **Bun only** (never npm/yarn/pnpm). Backend commands need `PYTHONPATH=src`.

---

## 0. Before you write any code — verify current state

The maps below were accurate at time of writing but treat live code as truth. Read these first and confirm the specifics (model fields, enums, constraints, endpoints) before changing them:

**Backend**
- `immi-pulse-be/src/app/agents/immigration/precases/` — `models.py` (PreCase + status enum), `service.py` (qualify / promote), `triage.py`, `router.py`
- `immi-pulse-be/src/app/agents/immigration/cases/` — `models.py` (Case, 10-stage enum, CaseDocument, CasePortalToken, CaseTimelineEvent), `checklist_templates.py` (static per-visa doc dicts), `portal_router.py`
- `immi-pulse-be/src/app/agents/immigration/clients/` — `models.py` (**Client.primary_email is globally UNIQUE today**, ClientOrgLink)
- `immi-pulse-be/src/app/agents/immigration/engagement/` — `models.py` (EngagementLetterTemplate, EngagementLetter, SignatureEvent — ETA-1999 audit trail)
- `immi-pulse-be/src/app/core/portal_auth.py` — current client access = `CasePortalToken` (signed token + 6-digit **PIN**, short-lived session JWT). **There is no persistent client password/login today.**
- `immi-pulse-be/src/app/core/jwt_auth.py`, `core/password_policy.py`, `agents/immigration/auth/` — consultant auth (User/Seat/Org, signup/login/me)
- `immi-pulse-be/src/app/integrations/resend/` — email client + templates (welcome email to consultant exists; engagement letter email exists)

**Frontend**
- `immi-pulse-fe/src/components/precase-detail.tsx` — **the component to replace.** ~2000 lines: the "three buttons" pattern (one shape-shifting primary button + a kebab menu of manual overrides) + a horizontal stage stepper + 5 modal dialogs (LetterCompose, LetterSent, RecordPayment, SkipPayment, MarkSignedManual, ForceConvert).
- `immi-pulse-fe/src/lib/api/services.ts` — all API calls (`preCasesApi`, `lettersApi`, `paymentsApi`, `clientsApi`, `checkpointsApi`, …)
- `immi-pulse-fe/src/app/(console)/dashboard/` — `inbox/`, `precases/`, `cases/`, `clients/` pages
- `immi-pulse-fe/src/app/(public)/q/[slug]/page.tsx` — public intake form
- `immi-pulse-fe/src/app/q/sign/[token]/page.tsx` — current PIN-gated e-sign page
- `immi-pulse-fe/src/app/(client-portal)/client-portal/[token]/page.tsx` — current PIN-gated document upload (the fragmented portal we are replacing)
- `immi-pulse-fe/src/lib/auth.tsx` — consultant auth context

---

## 1. Where we are today (the as-is)

**The pipeline already exists and works end-to-end** (verified by the demo report): public intake → PreCase → qualify → engagement letter → e-sign (PIN) → record payment → convert to Case. Status vocabulary is locked: **Query → Pre-case → Case** (see memory). Manual override exists at every gate. So this is largely a **presentation + connection** job, not a greenfield build.

**What's good and stays:**
- The PreCase state machine, qualify/promote, payments, checkpoints.
- Engagement letters with a real, compliance-grade signature audit trail (typed/drawn/manual/attest, SHA-256 body hash, IP/UA, consent text) — ETA 1999 (Cth) aligned.
- Per-visa document checklists (currently static Python dicts).
- Multi-tenant isolation (`org_id` on everything; consultant JWT context).

**The five real gaps (what this plan fixes):**
1. **Pre-case UX** — driven by a horizontal stepper + one shape-shifting button + overrides hidden in a `⋯` menu. Replace with a **vertical, guided, self-explaining timeline** where every step shows a summary, its actions, and a visible skip / "I did this manually."
2. **Client portal is fragmented** — access is a fresh **PIN per action** (one token to sign, another to upload), with **no persistent login**. Replace with **one persistent account** per client–agent relationship.
3. **No multi-agent account model** — `Client.primary_email` is globally unique, so a person's email is "consumed" by the first agent. Fix so the **same email can hold separate accounts with different agents**.
4. **Visa captured as free text** — should be a structured choice that drives the checklist (Phase 2).
5. **Checklists are hard-coded** in Python — make them **agent-editable per visa type** (Phase 2). Messaging/chat between agent and client **does not exist** and is **explicitly deferred** (not in this plan).

---

## 2. The target experience (the to-be)

### 2a. Consultant: one guided path (see `consultant-inquiry-to-case-flow.html`)
A full-screen workspace. A **vertical timeline of 5 steps**, each a consistent card with: a plain-language summary, ~3 action items (a clear primary + alternates), and a **visible** skip / manual-done affordance (no kebab). A compact horizontal tracker up top shows position; the status chip walks `New query → Pre-case (Qualified → Letter sent → Signed → Paid) → Case open`. A right rail holds the AI **enquiry summary** and a **Client portal** panel.

The five steps: **1) Review & qualify → 2) Send engagement letter → 3) Client signs → 4) Record deposit → 5) Open case.**

UX spec notes (from review + owner feedback): generous spacing ("Apple" breathing room — don't crowd text), action buttons **centered with a clear top gap** so they're the focus, and room to show **more context** on the active step (it can be tall; vertical scroll is fine).

### 2b. The pivotal moment — account created at QUALIFY
When the consultant clicks **Qualify**, the system:
1. Creates the client's **portal account** (org-scoped — see §3), with a generated **temporary password**.
2. Surfaces a **"Client access" card** to the consultant: the client's **email + temporary password**, with **Copy**, **Resend welcome email**, and a ready-to-paste **share message** (for WhatsApp/SMS).
3. **Emails the client** their access (branded as the agent's firm) with a link to the agent's portal.

From here, the client signs the engagement letter, sees the deposit, uploads documents, and tracks progress **inside their portal** — no PINs passed around. (Decision recorded in memory: account at qualify.)

### 2c. Client portal (see `client-portal-mvp.html`)
Login → dashboard. A client can hold **many applications** (e.g. 482 granted · 186 ENS in progress · 600 visitor lodged), each with its own progress, stage, summary, document checklist, and timeline. Per application: **progress**, **what this is about** summary, **documents** (upload), **respond to the agent's requests** (structured request/reply — **not** a chat thread), **in-portal engagement-letter signing**, and a **timeline**. MVP scope only.

---

## 3. The multi-agent account model (the important data decision)

**Requirement (owner):** A person can engage Agent A for one matter and Agent B for another. Their email must **not** be globally "consumed" — each agent issues that person their own portal account and credentials. Reusing the *same* agent for a second matter should reuse the *same* account (create once per agent), just adding another application.

**Recommended design — portal auth is org-scoped, decoupled from the global CRM record:**

Introduce a new table **`ClientPortalAccount`** that is the login identity for the portal:

| column | notes |
|---|---|
| `id` | UUID PK |
| `org_id` | FK organizations — **the owning agent** |
| `client_id` | FK clients — links to the existing global CRM `Client` |
| `email` | the client's login email |
| `password_hash` | bcrypt/argon2 (reuse the consultant hashing in `jwt_auth.py`) |
| `status` | `invited` / `active` / `disabled` |
| `must_reset` | force a password change on first login |
| `last_login_at`, `created_at` | |
| **UNIQUE (`org_id`, `email`)** | **composite — NOT globally unique.** This is the whole point. |

- **Login is scoped per agent.** Give each org a **portal entry point** — a per-org slug (recommended: `…/portal/{org_slug}` or a subdomain). The welcome email links straight to that agent's portal with the email pre-filled, so login = (org from URL) + email + password. Email collisions across orgs are therefore impossible to confuse.
- **Keep the existing global `Client`** (`primary_email` unique) purely as the consultant-side CRM dedup record. When Agent B engages an email Agent A already has, **reuse the global `Client` row** (no error shown to Agent B) and create Agent B's **own** `ClientPortalAccount` + `ClientOrgLink`. Org isolation (already enforced via `org_id` on PreCase/Case/etc.) keeps Agent A's and Agent B's matters invisible to each other.
- **One account per client–agent pair.** If the same person comes back to the *same* agent, reuse their existing `ClientPortalAccount` and just add a new application/case under it.

> **Alternative (note for the owner, only if you want zero cross-agent linkage):** also make the `Client` CRM record org-scoped (`UNIQUE(org_id, email)`) and drop the global identity entirely. Cleaner mental model, but a larger migration and you lose any future "same person across agents" analytics. **Recommendation: don't — keep the global `Client`, scope only the portal account.** It satisfies the requirement with the smallest, safest change.

**Retire / keep:** the persistent account replaces the per-action `CasePortalToken` PIN flow as the primary path. Keep a tokenized magic-link as a **fallback** (manual-override philosophy) for clients who can't/won't set a password.

---

## 4. Credential issuance & sharing (exact behaviour)

**On Qualify (server):** create `ClientPortalAccount` (status `invited`, `must_reset=true`), generate a temporary password (12+ chars, satisfies `password_policy.py`), store only the hash, return the **plaintext once** to the consultant UI for that request only.

**Consultant UI ("Client access" card, right rail of the pre-case):**
- Shows: client email, **temporary password** (with a one-time reveal + Copy), portal URL.
- Buttons: **Copy credentials**, **Resend welcome email**, **Regenerate password** (manual override), and a pre-filled **share message** ("Hi Priya, here's your secure portal: {url} — email: {email}, temporary password: {pwd}. You'll set your own password on first login.").
- State reflects: Invited → Active (after first login) → shows `last_login_at`.

**Client email (Resend, branded as the firm):** welcome + portal link + email + temporary password + "set your own password on first login." Add a `welcome_client` template alongside the existing Resend templates.

**Security:** temp password hashed at rest; `must_reset` forces a change on first login; rate-limit login + lockout (reuse the PIN attempt-count pattern); short-lived session JWT + refresh; HTTPS-only. In-portal signing while authenticated is **stronger** evidence than the old PIN flow — keep the same SignatureEvent audit record.

---

## 5. Backend work

**New / changed models & migrations (Alembic):**
- `ClientPortalAccount` (above). Migration adds table + composite unique.
- `Organization`: add `portal_slug` (unique) for the per-agent portal URL.
- (Phase 2) PreCase/Case: add structured `visa_category` + `visa_subclass` (FK or enum) captured at intake.
- (Phase 2) Move checklist templates from `cases/checklist_templates.py` (static) to a DB table `checklist_template(org_id, visa_subclass, items[…], accepted_doc_types[…])`, editable per org; keep the static dicts as the seed/default.

**New endpoints (public = portal, scoped by org_slug):**
- `POST /precases/{id}/qualify` — extend to also create `ClientPortalAccount` + send welcome email; return the issued credentials once.
- `POST /clients/{accountId}/portal/resend` and `/regenerate-password` — consultant actions.
- `POST /public/portal/{org_slug}/login`, `/set-password`, `/forgot-password` — client auth (org-scoped).
- `GET /public/portal/me/applications` — list the logged-in client's applications **for that org**.
- `GET /public/portal/applications/{caseId}` — detail (stage, summary, checklist, timeline).
- `POST /public/portal/applications/{caseId}/documents` — upload (reuse S3 SSE-KMS path).
- `POST /public/portal/applications/{caseId}/sign` — sign the engagement letter while authenticated (writes SignatureEvent).
- `POST /public/portal/requests/{requestId}/respond` — answer a structured agent request.

> ⚠️ **Known latent bug to fix in passing:** `public/letters/` is missing from `PUBLIC_PREFIXES` in `middleware/api_key_auth.py` — add all new `public/portal/*` routes to the public allowlist so they don't depend on the FE bundle's API key.

---

## 6. Frontend work

**Consultant (replace `precase-detail.tsx`):**
- Build the vertical guided workspace per `consultant-inquiry-to-case-flow.html`: a `PreCaseWorkspace` with a `StepTimeline` (5 steps), each step a `StepCard` (summary + centered actions + visible skip/manual), a `Tracker`, the `EnquirySummary` rail, and the **`ClientAccessCard`** rail panel.
- Reuse existing modals' logic (LetterCompose, RecordPayment, MarkSignedManual, ForceConvert) — re-skin, don't rebuild the API calls.
- Wire `qualify` to show the ClientAccessCard with issued credentials.
- Keep all existing `services.ts` calls; add the new portal/credential ones.

**Client portal (new route group, e.g. `src/app/(client-portal)/portal/[orgSlug]/`):**
- Login + set-password + forgot-password pages (org-scoped).
- Dashboard per `client-portal-mvp.html`: applications list (multi-application), application detail with **Overview / Documents / Timeline**, in-portal **sign**, **upload**, **respond**. Branded with the firm's identity.
- Separate auth context from the consultant `auth.tsx` (a `PortalAuthProvider`).
- Retire the old `client-portal/[token]` + `q/sign/[token]` once the account flow is live (or keep as fallback).

**Design system:** Navy `#101928`, Purple `#7A5AF8`, Purple-deep `#3E1C96`, Teal `#1B7B6F`/`#2DD4BF`; Outfit headings + Inter body; clean stroke icons only (no emoji/"AI" iconography); generous spacing; AA contrast (avoid faint greys below 4.5:1).

---

## 7. Phased rollout

**Phase 1 — The guided path + the account unlock (ship first).**
- Vertical pre-case workspace replacing `precase-detail.tsx` (re-presentation of existing logic).
- `ClientPortalAccount` model + org `portal_slug` + qualify-creates-account + welcome email + ClientAccessCard.
- Client portal MVP: login/set-password, applications dashboard, in-portal **sign**, **upload**, **timeline**, progress.
- *Done when:* a consultant qualifies → account + credentials issued and emailed → client logs in → signs the letter and uploads in-portal → consultant records deposit → opens case → checklist visible in portal. Same email works for a second, different agent without error.

**Phase 2 — Visa-first & editable checklists + respond-to-requests.**
- Structured visa category at intake → drives checklist.
- DB-backed, agent-editable checklist templates (accepted doc types per visa).
- Structured "agent requests / client responds" items in the portal.

**Phase 3 — Two-way messaging (separate effort, out of scope here).**

---

## 8. Acceptance criteria (Phase 1, testable)
- [ ] Qualify creates exactly one `ClientPortalAccount` scoped to the qualifying org; credentials returned once and never logged in plaintext.
- [ ] The *same* email used by a *different* org creates a separate account with no uniqueness error; neither client nor agent sees the other org's data.
- [ ] The *same* email returning to the *same* org reuses the existing account (no duplicate).
- [ ] Client logs in via the firm's portal URL, is forced to set a password, then signs the engagement letter; a `SignatureEvent` is recorded with body hash + IP/UA + consent.
- [ ] Every pre-case step shows a summary, its actions, and a visible skip/manual control; no action is hidden behind a kebab.
- [ ] Status chip transitions match `New query → Pre-case(…) → Case open`; a *skipped* gate does not falsely advance the milestone label.
- [ ] Client portal lists multiple applications, each with independent progress/checklist/timeline; uploads reflect in progress; the correct to-do clears (no cross-marking).
- [ ] No console/page errors; AA contrast; keyboard-operable cards and upload affordances.

---

## 9. Risks & gotchas
- **Email uniqueness migration** — do **not** loosen `Client.primary_email` uniqueness; instead add the new org-scoped `ClientPortalAccount`. Touching the existing constraint risks the CRM dedup.
- **Public route auth** — add `public/portal/*` to `PUBLIC_PREFIXES` (`api_key_auth.py`); otherwise portal endpoints silently depend on the FE-injected API key (existing latent bug with `public/letters/`).
- **Compliance** — OMARA Code of Conduct: no paid work before a signed costs agreement → keep "open case" gated behind the engagement letter (manual override allowed, logged). Retain client files/records (7-year retention; don't hard-delete — archive). In-portal signed letter + logged actions *are* the record.
- **Don't over-build** — messaging/chat is out of scope. Keep "respond to request" structured, not a thread.
- **Manual override everywhere** is non-negotiable (see memory) — every automated step (account creation, signing, payment, conversion) must have a manual fallback.

---

## 10. File-by-file change list (quick index)

**Backend — create:** `ClientPortalAccount` model + migration; `agents/immigration/portal/` (router+service for client auth & portal data); `integrations/resend/templates` → `welcome_client`. **Modify:** `precases/service.py` (qualify → create account + email), `orgs/models.py` (`portal_slug`), `middleware/api_key_auth.py` (PUBLIC_PREFIXES), `engagement/service.py` (logged-in signing path).

**Frontend — create:** `components/precase/PreCaseWorkspace.tsx` + `StepTimeline`/`StepCard`/`Tracker`/`EnquirySummary`/`ClientAccessCard`; `app/(client-portal)/portal/[orgSlug]/` (login, set-password, dashboard, application detail); `lib/portalAuth.tsx`; portal API calls in `lib/api/`. **Modify/replace:** `precase-detail.tsx` (swap to the new workspace), `lib/api/services.ts` (new endpoints). **Retire after cutover:** `client-portal/[token]`, `q/sign/[token]`.

---

*Visual source of truth: the two prototype HTML files in `context/pilot-partners/`. Product decisions are recorded in the project memory (Query→Pre-case→Case pipeline; manual override everywhere; client portal account created at Qualify).*
