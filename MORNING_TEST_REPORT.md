# Morning test report — pricing model revamp

**Date:** 2026-05-01 (overnight)
**Branch:** `feature/consultant-initial-onboarding-phase-1`

## TL;DR

Per-seat pricing is now in place across all three plans. Plans gate features only — no seat caps, no role-based pricing differences. Every seat is billed at the plan's per-seat rate. End-to-end verified via curl (full transcript in `E2E_TEST_TRANSCRIPT.txt`). Frontend builds clean.

## What changed

### The pricing model

| | Starter | Professional | Enterprise |
|---|---|---|---|
| **Per-seat price** | $29 / seat / month | **$99 / seat / month** | Custom |
| **Seat caps** | none | none | none |
| **Default for new signups** | – | ✓ (14-day free trial) | – |
| **Active cases** | up to 20 | unlimited | unlimited |
| **AI document validation & OCR** | – | ✓ | ✓ + custom training |
| **Predictive analytics & insights** | – | ✓ | ✓ |
| **Marketplace listing** | – | ✓ | ✓ |
| **SSO, on-prem, SLA** | – | – | ✓ |

**Roles** (Owner / Admin / Consultant / Staff) are now **permissions only** — they do not affect price. Every seat costs the plan's per-seat rate. This is the same model Cursor / Notion / Clio use.

### Backend (`immi-pulse-be/`)

- **[plans.py](immi-pulse-be/src/app/agents/immigration/orgs/plans.py)** — Single source of truth. One field `price_per_seat_aud_monthly` per plan. Removed all the `consultant_price` / `staff_price` / `BILLABLE_SEAT_ROLES` / `FREE_SEAT_ROLES` clutter.
- **[orgs/service.py](immi-pulse-be/src/app/agents/immigration/orgs/service.py)** — `get_billing_summary` returns `total_seats × price_per_seat = monthly_total_aud`. `select_plan` no longer blocks on seat counts. No cap enforcement anywhere.
- **[orgs/schemas.py](immi-pulse-be/src/app/agents/immigration/orgs/schemas.py)** — `BillingSummary` now: `tier`, `status`, `plan_name`, `price_per_seat_aud_monthly`, `total_seats`, `role_counts` (display-only), `monthly_total_aud`, `features`, `is_custom`, dates.
- **[auth/service.py](immi-pulse-be/src/app/agents/immigration/auth/service.py)** — Default signup is Pro trial (14 days). Pilot codes can still override the tier.

### Frontend (`immi-pulse-fe/`)

- **[Plan & Billing](immi-pulse-fe/src/app/(console)/dashboard/settings/billing/page.tsx)** — Three cards: current plan + features, this-month bill (total_seats × price = total), role breakdown for transparency. Plan picker shows feature lists with one button per plan.
- **[Team page](immi-pulse-fe/src/app/(console)/dashboard/settings/team/page.tsx)** — Header shows total seat count and monthly bill. Role picker in invite dialog is presented as **permission level** only, with explicit copy: "Permissions only. Every seat costs $X / month on the [plan] plan." Added "+$X/mo" badge on every seat row.
- **[Public pricing](immi-pulse-fe/src/app/(public)/pricing/page.tsx)** — Starter $29, Pro $99, Enterprise custom. Strapline: "Add as many seats as you need · No seat caps." FAQ updated to explain seat pricing and role differences clearly.
- **[Services types](immi-pulse-fe/src/lib/api/services.ts)** — `Plan` and `BillingSummary` interfaces match the new BE shape.

### Removed / dead code

Confirmed via grep — no leftovers of:
- `consultant_price_aud_monthly`, `staff_price_aud_monthly`
- `billable_seats`, `staff_seats`, `seats_used`, `seat_cap`
- `BILLABLE_SEAT_ROLES`, `FREE_SEAT_ROLES`
- "Free staff seats", "billable" UI badges

---

## What I verified locally

### Build / typecheck

| Check | Status |
|---|---|
| `bunx tsc --noEmit` | ✅ clean |
| `bunx next build` (production) | ✅ clean — all 4 settings sub-routes (`organization`, `billing`, `team`, `integrations`) prerender |
| Backend smoke imports | ✅ `from app.agents.immigration.orgs import router, service, schemas, plans` |
| Alembic migrations | ✅ `upgrade head` ran successfully |

### End-to-end via curl

Full transcript in [`E2E_TEST_TRANSCRIPT.txt`](E2E_TEST_TRANSCRIPT.txt). Run summary:

| # | Test | Expected | Actual | ✓ |
|---|---|---|---|---|
| 1 | `GET /org/plans` without auth | 401 | 401 | ✅ |
| 2 | `POST /auth/signup` (fresh org) | tier=pro, status=trial, trial_ends_at = +14d | tier=pro, status=trial, trial_ends_at=2026-05-15 | ✅ |
| 3 | `GET /auth/me` | matches signup output | match | ✅ |
| 4 | `GET /org/plans` | 3 tiers, new schema (no consultant_price) | starter $29, pro $99, enterprise custom | ✅ |
| 5 | `GET /org/billing` (1 owner) | 1 seat × $99 = $99/mo | `total_seats=1, monthly_total_aud=99` | ✅ |
| 6 | Invite admin + staff | both 201 | 201, 201 | ✅ |
| 7 | `GET /org/billing` (3 seats: owner + admin + staff) | 3 × $99 = $297 | `total_seats=3, monthly_total_aud=297` | ✅ |
| 8 | `GET /org/seats` | 3 entries, 1 active + 2 invited | exactly that | ✅ |
| 9 | `POST /org/billing/select-plan` → starter | tier=starter, 3 × $29 = $87 | `monthly_total_aud=87` | ✅ |
| 10 | switch → enterprise | is_custom=true, monthly=0 | `is_custom=true, monthly_total_aud=0` | ✅ |
| 11 | switch → pro | back to $297 | `monthly_total_aud=297` | ✅ |
| 12 | invite duplicate email | 400 "already a seat or pending invite" | 400 with that exact message | ✅ |
| 13 | invite 5 more (no cap) | all 201 | 5 × 201 | ✅ |
| 14 | `GET /org/billing` (8 seats) | 8 × $99 = $792 | `total_seats=8, monthly_total_aud=792` | ✅ |

**Key proof points:**
- Switching plans recomputes `monthly_total_aud = total_seats × price_per_seat_aud_monthly` correctly across all tiers.
- Inviting a `staff` role costs the same as `consultant` — confirmed in test 7 ($297 = 3 × $99, not $198).
- No cap was hit when inviting the 4th, 5th, … 8th seat — all returned 201.
- Enterprise tier returns `is_custom=true` and `monthly_total_aud=0` so the FE renders "Custom — contact us" instead of a number.

---

## How to verify in the browser this morning

The backend was stopped overnight. To bring it back up:

```bash
# 1. Backend (port 8000)
cd immi-pulse-be
source .venv/bin/activate
PYTHONPATH=src python -m app.core.server

# 2. Frontend (port 3000) — separate terminal
cd immi-pulse-fe
bun run dev
```

**Manual checklist:**

1. Open `http://localhost:3000/get-started` → sign up a new org. Copy says "14-day Professional trial".
2. Land on `/onboarding`. Step 3 explicitly says you're on a 14-day Pro trial.
3. Go to `/dashboard/settings/billing`:
   - Current plan = Professional, "On trial" badge, trial countdown card.
   - **This month** card → 1 seat × $99 = **$99**.
   - Plan picker → Starter ($29/seat), Pro (current, $99/seat), Enterprise (custom).
   - Click "Switch to Starter" → confirms → bill flips to **$29**.
   - Click "Switch to Enterprise" → confirms → card now reads **Custom**.
   - Click "Switch to Professional" → back to $99.
4. Go to `/dashboard/settings/team`:
   - Header: "Professional plan · $99 / seat / month · 1 total seat · $99/mo".
   - Click "Invite member" → role picker shows three options (Consultant / Admin / Staff). Copy under "Role" says: *"Permissions only. Every seat costs $99 / month on the Professional plan."*
   - Pick **Staff**, enter an email, create invite → invite link returned, can be copied.
   - Header now says **2 total seats · $198/mo** (proves staff is billed at the same rate).
   - Add a few more — all succeed, no cap warning.
5. Go to `/pricing` (public): Starter $29, Pro $99, Enterprise custom; "No seat caps" line under each price; updated FAQ.

---

## Known gaps / not yet wired

These are deliberate punts — flag for follow-ups:

1. **Stripe checkout** — `select-plan` currently flips `subscription.status` to `active` immediately. No card is charged. The fields `stripe_customer_id`, `stripe_subscription_id` exist in the DB ready for wiring.
2. **Email delivery for invites** — invite endpoint returns a link; FE shows it for copy/paste. Resend SDK not wired yet.
3. **Subscription.seat_count drift** — the legacy `seat_count` column on `subscriptions` is still being incremented/decremented by invite/revoke. The new billing summary doesn't read it (it counts seats live). Safe to leave for now; remove or backfill in a follow-up cleanup commit.
4. **Pilot programs** — still work (promo code on signup overrides tier). Not affected by this revamp.
5. **Sidebar nav** was independently restructured (Inbox / Pre-cases / Forms split, new badge counters). This is unrelated to pricing and works alongside the settings work.

---

## Files touched in this session

```
immi-pulse-be/src/app/agents/immigration/orgs/plans.py         # rewrote
immi-pulse-be/src/app/agents/immigration/orgs/service.py       # rewrote billing + invite
immi-pulse-be/src/app/agents/immigration/orgs/schemas.py       # rewrote BillingSummary, PlanOut
immi-pulse-be/src/app/agents/immigration/orgs/router.py        # already had endpoints
immi-pulse-be/src/app/agents/immigration/auth/service.py       # default Pro trial

immi-pulse-fe/src/lib/api/services.ts                          # Plan + BillingSummary types
immi-pulse-fe/src/app/(console)/dashboard/settings/billing/page.tsx   # rewritten
immi-pulse-fe/src/app/(console)/dashboard/settings/team/page.tsx      # rewritten
immi-pulse-fe/src/app/(public)/pricing/page.tsx                # plans + FAQ updated
```

## Suggested next steps when you're back

1. Eyeball the screens in the browser per the manual checklist above. If anything feels off (copy, spacing, the role picker UX), call it out and I'll iterate.
2. Decide on Resend integration vs Stripe integration as the next chunk — either is unblocked from this work.
3. If pricing of Starter/Pro feels wrong ($29 / $99 are placeholders), adjust the numbers in [`plans.py`](immi-pulse-be/src/app/agents/immigration/orgs/plans.py) — single file change, both BE and FE pick it up.
