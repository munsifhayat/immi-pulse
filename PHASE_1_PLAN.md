# Phase 1 — Consultant Pipeline (Locked Plan)

> Status: in-flight, autonomous overnight build
> Owner: Claude (autonomous mode), morning handoff to Munsif

## North star

```
QUERY ─► PRE-CASE ─► engagement letter ─► payment ─► CASE
                     (e-sign or manual)   (manual or skip)
```

Every step has an automated path AND a manual override.
No Stripe yet — manual payment recording is the v1 path.

## Sidebar (final)

```
Overview
Inbox            ← was "Pre-Cases", now means "queries / new submissions"
Pre-cases        ← NEW · qualified, awaiting letter/payment
Clients          ← NEW · global identity, real (was demo)
Cases            ← unchanged
Forms            ← was "Questionnaires"
Settings
```

## Backend deltas

### Schema (additive, no destructive migrations)

| Table | Change |
|---|---|
| `pre_cases.status` enum | add `qualified`, `letter_sent`, `letter_signed`, `paid`, `converted` |
| `pre_cases` | add `qualified_at`, `letter_sent_at`, `letter_signed_at`, `paid_at` |
| **NEW** `engagement_letter_templates` | per-org templates (markdown body, fee defaults) |
| **NEW** `engagement_letters` | per-pre-case letter (rendered_pdf_s3, status) |
| **NEW** `signature_events` | letter_id, method, ip, ua, hash, audit_cert |
| **NEW** `payment_records` | checkpoint_id, method, amount, ref, recorded_by, receipt_no |
| **NEW** `client_consents` | client_id, org_id, kind, given_at, ip, ua |
| `organizations` | add `abn`, `bsb`, `account_no`, `account_name`, `payid`, `bpay_biller` |

### New routers

- `/api/v1/clients` — list, get, create (manual), patch, send-questionnaire, open-case-direct
- `/api/v1/engagement-letters` — templates CRUD, per-pre-case compose/send, mark-signed-manual
- `/api/v1/public/letters/{token}` — public PIN-verified signing portal
- `/api/v1/payments` — list (per-pre-case or per-case), record (manual), skip, generate receipt

### Service-layer additions

- `precases.service.qualify(id)` — set status=`qualified`
- `precases.service.send_letter(id, ...)` — render template, create EngagementLetter, status=`letter_sent`
- `precases.service.mark_letter_signed_manual(id, signed_pdf)` — manual override
- `precases.service.record_payment(id, method, ...)` — sets status=`paid`, auto-promotes
- `precases.service.skip_payment_and_promote(id, reason)` — manual override (e.g. relative case)
- `precases.service.force_convert(id)` — full manual escape hatch

## Frontend deltas

### Pages to add/modify

| Page | Action |
|---|---|
| `dashboard/inbox/` | NEW (was `precases/`) — only `pending` + `reviewing` queries |
| `dashboard/precases/` | REPURPOSE — only `qualified` + `letter_*` + `paid` |
| `dashboard/clients/` | REWIRE — connect to real `/clients` API |
| `dashboard/clients/[id]/` | NEW · profile, history timeline, manual case-open |
| `dashboard/settings/letter-template/` | NEW · template editor |
| `q/sign/[token]/` (public) | NEW · letter signing portal |
| `dashboard/inbox/[id]/` | UPDATE · qualify button (was: promote) |
| `dashboard/precases/[id]/` | NEW · letter compose, payment record, manual overrides |

### Components to add

- `ManualOverrideMenu` — kebab menu with "skip", "mark X manually", "force convert"
- `EngagementLetterPreview` — renders markdown template with variable substitution
- `PaymentRecordForm` — method, amount, reference, date, notes
- `SignaturePad` — canvas + typed-name fallback
- `ClientHistoryTimeline` — chronological events for one client

## Phased build order (overnight)

| Order | Block | Time |
|---|---|---|
| 1 | BE schema migration + models + base CRUD on new tables | 90 min |
| 2 | BE clients router (full) | 30 min |
| 3 | BE engagement letters router + service (template, compose, public sign) | 90 min |
| 4 | BE payments router + receipt generation | 45 min |
| 5 | BE precases service extension (new lifecycle + manual overrides) | 45 min |
| 6 | FE sidebar restructure | 15 min |
| 7 | FE inbox/precases page split | 60 min |
| 8 | FE real clients page (list + detail) | 60 min |
| 9 | FE letter template editor in Settings | 45 min |
| 10 | FE letter compose + send UI on pre-case detail | 60 min |
| 11 | FE public signing portal | 60 min |
| 12 | FE manual payment recording UI + skip override | 45 min |
| 13 | FE manual override menu pattern (everywhere) | 30 min |
| 14 | Build verification (bun run build, ruff, mypy if applicable) | 30 min |
| 15 | TEST_REPORT.md | 30 min |

## What I will NOT do tonight

- Stripe Connect (no API access)
- Email delivery (will use mock + display the link to copy)
- Alembic migrations on running prod DB (write migration files but only apply locally)
- Universal questionnaire seed restructure (keep existing 4-template seed for now)
- Push notification / SSE for real-time triage updates
- ClamAV file scanning
- Public form file uploads (deferred per user — uploads happen post-engagement)

## Constraints I'm aware of

- **No Playwright MCP available** in this session. Will test via:
  - `bun run build` for TS validation
  - `make test` (pytest) for BE
  - Manual API smoke via curl in test report
  - Manually walking through the `bun run dev` page tree (where possible)
- Test report will be honest about what was verified vs deferred
