# PLAN — Share Your Timeline

Epic: Deliver the *share your visa timeline* flow end to end — from first tap to a row that
counts in the community statistics — on top of the already-landed taxonomy and account work.

Source plan: `context/community/share-timeline-plan.md` (written 2026-07-19).
Integration branch: `feat/share-timeline`
Base: `main`
Baseline commit: `31bad77` — the source plan's phases 0, 1 and 3, built and verified before
this epic was cut.

---

## How this plan differs from the source document

The source plan was written *before* its phases 0/1/3 were built. Exploration of the landed
code found six places where the document no longer describes reality. These corrections are
binding on the phases below — where they conflict, this file wins.

1. **There is no `visa_streams` table and no `VisaStream` model.** The source plan §3.2
   proposed splitting into 43 subclass rows + 76 stream rows. What shipped keeps
   `visa_subclasses` as the flattened subclass+stream row (76 rows) with a `cohort_key`
   column encoding the pooling decision. This is a reasonable outcome — do **not** re-split
   it. `VisaSubclass.group_key` (`models.py:744-753`) is a Python property, not a column,
   so it is not queryable in SQL.

2. **`cohort_split_by_stream` is not a column and nothing reads it at runtime.** It is
   computed in `scripts/fetch_dha_taxonomy.py:167-183` and consumed once in
   `scripts/seed_visa_taxonomy.py:44-55`, where it is frozen into `cohort_key`. The source
   plan's phase 5 ("cohort stats honour `cohort_split_by_stream`") is therefore **already
   satisfied in effect** — `cohort_key_of` (`service.py:969-976`) pools correctly. The real
   remaining work is different; see p4.

3. **`requires_occupation` does not exist anywhere** — no column, no schema field, no
   reference in BE or FE. The adaptive form depends on it, so p2 must add it.

4. **`is_live` is already true for seeded rows** — `service.py:1001` returns
   `bool(sc.dha_subclass_code)`. The source plan's "official figures go live" is largely
   done. Note the schema docstring at `schemas.py:255` claims it keys off "a real as-at
   date", which contradicts the implementation; p4 reconciles them.

5. **`OFFICIAL_UPDATED` does not exist.** The live spellings are the `official_updated`
   column (`models.py:735`) and the `official.as_at` response key (`service.py:998`).

6. **The migration and the data snapshot disagree.** `f2a4c6e8b0d3`'s docstring lists the
   split set as `189, 491, 482, 500`; the committed `dha_taxonomy.json` splits nine —
   adding `188, 403, 408, 600, 888`, none of which appear in that migration's `SLUG_REMAP`.
   p4 must reconcile this before trusting stream-level cohorts.

---

## Standing constraints (apply to every phase)

- **Do not deploy.** No Heroku push, no Vercel deploy, no merge to `main`. The final
  `feat/share-timeline` → `main` PR is left for the human.
- Backend: `source .venv/bin/activate` + `PYTHONPATH=src` for every command. Local server on
  `PORT=8001` (the frontend's `.env.local` expects it).
- Frontend: **bun only** — never npm/yarn/pnpm.
- Alembic must stay on a **single head**. Head at baseline: `a3c5e7b9d1f4`.
- New no-API-key routes live under `/api/v1/community/public/...`.
- Backend testing convention: pure-logic tests in `tests/agents/...`; flow coverage in
  standalone `tests/e2e_*.py` scripts driven by `httpx.ASGITransport`. There is no
  router-level pytest.
- Frontend has **no test runner**. `bunx tsc --noEmit` and `bun run build` are the gates.
  `bun run lint` has **5 pre-existing errors on `main`** (`auth.tsx`, `navbar.tsx`,
  `next.config.ts`, two dashboard pages) — none in `src/components/community/`. Do not
  "fix" them; do not let the community files add new ones.
- The milestone vocabulary is duplicated in **three** hand-maintained lists with no
  generation step: `models.py:54-70`, `hooks/community.ts:407-424`,
  `components/community/milestone-meta.ts`. Any change touches all three.

---

## Phase 1 — Account identity keyed on email and handle, not the device   [id: p1]

Depends on: none

**Goal.** Sever the account from the browser. Today `AnonIdentity` is simultaneously the
device row and the account row, bound by `device_token NOT NULL UNIQUE` (`models.py:124`),
and every session issue rebinds the browser to `account.device_token`
(`router.py:380`, mirrored client-side at `hooks/community.ts:867`). Logout clears only the
session JWT (`hooks/community.ts:937`) and nothing anywhere clears the `ip_device` cookie.
After this phase an account is identified by email/handle, a browser holds at most a
*current* identity that is genuinely swappable, and signing up on a browser that already
has an account works.

This phase fixes the reported 409 and, more importantly, four unreported consequences of
the same root cause:

- A logged-out visitor **writes as the previous account** — `_writer_identity`
  (`router.py:137-142`) falls back to the device token and `create_journey` stamps
  `handle=identity.handle` (`service.py:1365`). On a shared computer this attaches a visa
  timeline to a stranger's pseudonym.
- Signed-out browsing renders the previous account's posts as `is_mine` and its votes as
  `viewer_voted` (`router.py:118-120`).
- Rate-limit buckets key on `identity.id` (`service.py:206-214`), charging signed-out
  activity to the account.
- Two browsers logging into one account **converge on the same `device_token`**; the second
  never gets its own row.

**Files likely touched:**
`immi-pulse-be/src/app/agents/immigration/community/{accounts,models,router,service,schemas}.py`,
a new migration in `immi-pulse-be/migrations/versions/`,
`immi-pulse-be/tests/agents/immigration/test_community_accounts.py`,
`immi-pulse-be/tests/e2e_community_accounts.py`,
`immi-pulse-fe/src/lib/api/hooks/community.ts`,
`immi-pulse-fe/src/lib/community-identity.ts`,
`immi-pulse-fe/src/components/community/{account-dialog,left-rail}.tsx`

**Acceptance criteria:**
- [ ] `device_token` is nullable and no longer the identity's spine. Account rows created
      by signup do not require one. (Postgres permits many NULLs under a UNIQUE index, so
      the existing constraint can stay if the column is made nullable — prefer that over
      dropping the named constraint `uq_anon_identity_device_token`.)
- [ ] Signup on a browser whose device row is **already claimed** creates a **new**
      identity row and signs the member into it. The 409 is gone.
- [ ] Signup on a browser whose device row is **unclaimed** adopts that row, so posts made
      anonymously before joining carry over — the behaviour the account dialog already
      promises ("Anything you have already posted from this browser stays yours").
- [ ] Login no longer rewrites the browser's device cookie or localStorage device token to
      the account's. `router.py:380` and `hooks/community.ts:867` both stop doing this.
- [ ] Logout clears the session JWT **and** the device token **and** the `ip_device`
      cookie, then bootstraps a fresh anonymous identity. A new backend endpoint is
      required — no route currently deletes that cookie. `clearDeviceToken`
      (`community-identity.ts:29-32`, defined but never called) gets its caller.
- [ ] After logout, a write on that browser is attributed to a fresh anonymous identity,
      never the previous account.
- [ ] Conflict errors name the email or the handle. No user-facing string says "device".
- [ ] Email conflict behaviour follows the decision recorded in PROGRESS.md §Decided
      before any code is written.

**Verify by:**
`source .venv/bin/activate && PYTHONPATH=src pytest tests/ -q` (180 passing at baseline;
this phase adds cases) — plus a new `tests/e2e_community_identity_swap.py` exercising, on a
single simulated browser: signup → logout → signup again (must succeed, distinct rows) →
logout → anonymous write (must not carry the prior handle) → login as the first account
(must not disturb the browser's device token). Frontend: `bunx tsc --noEmit && bun run build`.

**Out of scope:** email verification delivery, the taxonomy, the share form, any change to
`user_id` / portal-account linkage, trust tiers.

---

## Phase 2 — Occupations: DHA dataset, `requires_occupation`, filtered typeahead   [id: p2]

Depends on: p1

**Goal.** Replace the free-text occupation field (`share-journey.tsx:370`, `maxLength=80`)
with a coded ANZSCO picker filtered to the selected subclass. Source plan §4 Pipeline B and
§G3. "Nurse", "nurse", "RN" and "Registered Nurse (Medical)" are four cohorts today.

**Files likely touched:** new `immi-pulse-be/scripts/fetch_dha_occupations.py` +
`seed_occupations.py` + a committed JSON snapshot; new `Occupation` model in
`community/models.py`; a migration adding `occupations` and `visa_subclasses.requires_occupation`;
`community/{router,service,schemas}.py`; new
`immi-pulse-fe/src/components/community/occupation-picker.tsx`;
`immi-pulse-fe/src/lib/api/hooks/community.ts`

**Acceptance criteria:**
- [ ] Fetcher extracts the embedded JSON from
      `immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list` (714
      records) and writes a committed snapshot, following the `fetch_dha_taxonomy.py`
      pattern: browser UA + Referer, throttle, backoff, `--dry-run`, never empty the table
      on a blocked run.
- [ ] `occupations` table stores **both** `anzsco_2013_code` and `anzsco_2022_code`. The
      two-version trap is real: 409 occupations share a code, **6 differ** (Flower Grower,
      Landscape Gardener, Management Consultant, Plumber (General), Statistician,
      Zoologist). 186/482/CSOL resolve on 2022; every other skilled subclass on 2013.
- [ ] Also stored: `name`, `major_group_code`/`major_group_name` (8 groups, for picker
      grouping), `lists` (MLTSSL/STSOL/ROL/CSOL), `eligible_subclasses`,
      `assessing_authority`, `authority_url`.
- [ ] Seeder is idempotent on ANZSCO code, marks absent rows inactive rather than deleting
      — same contract as `seed_visa_taxonomy.py:107-127`.
- [ ] `visa_subclasses.requires_occupation` added and populated.
- [ ] `GET /community/public/occupations` supports a subclass filter and a typeahead query
      over name and code.
- [ ] Picker groups by the 8 major groups and filters to the selected subclass. The
      competitor's flat unfiltered alphabetical list is the pattern to beat.
- [ ] `Journey.occupation_code` added; `Journey.occupation` retained as a display snapshot.
- [ ] **Occupation is required, not optional**, for every subclass with
      `requires_occupation`. It is the field that makes cohort matching possible, and
      `models.py:402` currently reads "free text, optional". It stays *hidden* (not
      optional) for subclasses that do not require it — a 600 Tourist or a partner-visa
      applicant has no ANZSCO occupation and forcing one would poison the data.
- [ ] **Form layout:** occupation gets its own full-width row with the picker; state /
      territory moves down to the second row. Today they share a two-column grid
      (`share-journey.tsx:362-386`), which cramps a searchable picker into half a row.

**Verify by:** `PYTHONPATH=src pytest tests/ -q`; a new `tests/e2e_community_occupations.py`
covering filter-by-subclass and typeahead; `python scripts/seed_occupations.py` run twice
proving idempotency (second run reports 0 created); `bunx tsc --noEmit && bun run build`.

**Out of scope:** OSCA migration (ABS retired ANZSCO but Home Affairs has not adopted OSCA,
and only 6 of 456 CSOL codes exist in it — keep the correspondence table for 2027 and build
on ANZSCO). Skills-assessment-authority UI — store the data, ship no feature.

---

## Phase 3 — The adaptive form, context fields, and one consent model   [id: p3]

Depends on: p2

**Goal.** Ask only what the chosen subclass actually needs, capture the three context fields
the evidence supports, and make all three entry points agree on consent. Today every member
sees every field — a 600 Tourist applicant is asked for their ANZSCO occupation and whether
their employer is an accredited sponsor.

**Files likely touched:** `community/{models,schemas,service,router}.py`, a migration;
`immi-pulse-fe/src/components/community/{share-journey,composer,wait-check}.tsx`;
`immi-pulse-fe/src/lib/api/hooks/community.ts`

**Acceptance criteria:**
- [ ] Field visibility is driven by columns on `visa_subclasses`, never by
      `if (subclass === "186")`. Stream shown when the program has >1 non-stage stream;
      occupation on `requires_occupation`; state on `requires_state_nomination`;
      metro/regional for 190/491/494; sponsor-accredited for 482/186.
- [ ] `Journey` gains `lodgement_location` (onshore/offshore), `nationality`, `lodged_via`
      (self/agent). `state` stops carrying `Offshore` — that is the onshore/offshore signal
      smuggled into the wrong enum.
- [ ] **Nationality is never exposed publicly** — cohort matching only, excluded from every
      public serializer (source plan decision 4). Add a test that asserts its absence from
      the journey response.
- [ ] A `direct_grant` / "no CO contact" toggle exists. Source plan §7.2: roughly one
      timeline post in five explicitly asserts an absence, and an empty milestone list is
      currently indistinguishable from a confirmed-clean run. This is the single
      most information-dense claim in a skilled timeline.
- [ ] Milestone dates validate monotonically. Real posts contain `EOI submitted: 06 Nov
      2026` against a July 2026 grant (§7.4).
- [ ] All three entry points use **draft → explicit publish**. The wait-check's two-step is
      the correct model and has a load-bearing comment explaining why
      (`wait-check.tsx:325-333`); `share-journey.tsx` and `composer.tsx` currently post
      immediately public via `create_journey`'s `publish=True` default (`service.py:1268`).
      Note the timeline allowance is consumed at **creation**, not publication
      (`service.py:1272-1277`) — preserve that, a draft still costs a write.
- [ ] Elapsed time is computed and surfaced, never asked for (§7.5). `processing_days`
      already exists.

**Verify by:** `PYTHONPATH=src pytest tests/ -q`; extend
`tests/e2e_community_waitcheck_save.py` for the unified consent path; a new e2e asserting
nationality never appears in a public response; `bunx tsc --noEmit && bun run build`; drive
the real form on `localhost:3000` against the backend on `:8001` for at least a
single-stream subclass, a multi-stream subclass, and a visitor subclass.

**Out of scope:** per-category milestone vocabularies (§7.3 — partner visas speak DOL/DOG/RFI
and need their own list; that is its own epic given three hand-maintained copies).
Month-precision dates (§7.4). Points score, dependants, CO-contact tracking (source plan
"Phase 2" column).

---

## Phase 4 — Stream-level cohorts and honest official figures   [id: p4]

Depends on: p3

**Goal.** Make the pooling decision live rather than frozen, reconcile the migration/snapshot
disagreement, and fix two correctness bugs in the stats path. Note this phase is *not* what
the source plan's phase 5 describes — see correction 2 above.

**Files likely touched:** `community/{models,service,schemas}.py`, a migration,
`community/processing.py`, `scripts/seed_visa_taxonomy.py`

**Acceptance criteria:**
- [ ] `cohort_split_by_stream` is persisted as a column so the decision is inspectable and
      changeable without a re-fetch. Today changing the threshold requires re-fetch +
      re-seed, and existing `community_timelines.subclass_slug` values would **not** be
      rewritten by that path — only the one-shot migration does that. Provide a re-pooling
      path that does.
- [ ] The migration/snapshot disagreement is reconciled: `f2a4c6e8b0d3` documents a split
      set of `189, 491, 482, 500`; the snapshot splits nine, adding `188, 403, 408, 600,
      888`, none covered by that migration's `SLUG_REMAP`. Verify no
      `community_journeys` / `community_timelines` rows were stranded.
- [ ] `_trend_for` (`service.py:936-967`) applies the same window and published/active
      filters as `_cohort_sample` (`service.py:838-913`). It currently does not, so the
      trend arrow is computed over a different population than the percentiles beside it.
- [ ] `is_live` and its documentation agree. `service.py:1001` keys off
      `bool(sc.dha_subclass_code)`; `schemas.py:255` claims it keys off a real as-at date.
- [ ] Thin cohorts still fall back to official DHA figures with an honest "no community
      data yet" (source plan decision 3) — this is already `wait_check`'s behaviour
      (`service.py:1121-1131`); prove it survives.

**Verify by:** `PYTHONPATH=src pytest tests/ -q` with new cases for `_trend_for` filtering
and the re-pooling path; `tests/e2e_community_taxonomy.py` extended; a query proving zero
orphaned `subclass_slug` values across both tables.

**Out of scope:** changing the 1.5x split threshold or `FORCE_NO_SPLIT`
(`fetch_dha_taxonomy.py:115`) — those are data decisions, not code.

---

## Phase 5 — Refresh jobs and drift alerting   [id: p5]

Depends on: p4

**Goal.** Keep the taxonomy and occupation datasets true over time, and make a failed
refresh visible. The taxonomy is not static — MATES and PALM streams are recent additions
and the 858 split is mid-transition.

**Files likely touched:** `immi-pulse-be/src/app/scheduler/jobs.py`,
`immi-pulse-be/src/app/core/config.py`, `community/notifications.py`

**Acceptance criteria:**
- [ ] Monthly taxonomy refresh and quarterly occupation refresh registered, following the
      four existing job conventions in `jobs.py`: imports inside the function, `async with
      get_async_session()`, session closed before network work, `replace_existing=True`,
      body wrapped in broad `try/except` + `logger.error(exc_info=True)` — a raising job
      gets removed from the scheduler (`jobs.py:174-177`).
- [ ] **Jobs stop running on every replica.** Registration is currently unconditional
      (`main.py:203-205`) with no env or feature gate, no jobstore, no `coalesce`, no
      `max_instances`, no `misfire_grace_time`. A monthly Akamai-rate-limited fetch firing
      once per dyno is a real problem. Add a gate.
- [ ] Failure alerting exists. There is **none** today — no Sentry, no
      `add_listener`, no `EVENT_JOB_ERROR` handler; the entire failure surface is
      `logger.error` to stdout. The one usable primitive is Resend
      (`config.py:133-139`, `settings.resend_configured`), currently wired only for member
      reply notifications (`notifications.py:395-407`).
- [ ] Drift detection: a refresh that would retire more than a threshold share of rows, or
      that returns zero rows, alerts and declines to apply rather than emptying the table.
- [ ] Snapshot provenance (`fetched_at`, DHA "as at" date) is surfaced so a stale dataset is
      visible rather than silently old.

**Verify by:** `PYTHONPATH=src pytest tests/ -q`; a new
`tests/e2e_community_refresh.py` driving both jobs against the committed snapshots with the
network stubbed, asserting idempotency, the drift guard rejects an empty payload, and the
alert path fires exactly once.

**Out of scope:** actually enabling the schedule in production (no deploy this epic).
Migrating to a persistent APScheduler jobstore.

---

## Deferred — explicitly not in this epic

- Per-category milestone vocabularies (§7.3). Partner visas use DOL/DOG/RFI and essentially
  never "s56"; Immitracker's partner tracker has 10 columns to SC189's ~30. Our single
  15-type list is skilled-visa-shaped. Real work, three hand-maintained copies, own epic.
- New milestone vocabulary from §7.5: ROI, HAP ID, Medical Cleared, Form 80/1221 requested,
  s57 (write "s57", **not** "NJL" — zero community hits), prior visa grants.
- Month-precision dates (§7.4).
- CO-contact tracking — the source plan calls it the biggest differentiator, and no app
  tracks it; Immitracker tracks it six ways.
- Email verification delivery and the SES subdomain/configuration-set split (source plan
  §3.1 warning: SES pauses sending above a 10% bounce rate, and cold unverified addresses
  bounce).
- 801/100 `clock_anchor` — Home Affairs measures those from *date of eligibility*, two years
  after application, so computing from lodgement is wrong by ~24 months.
