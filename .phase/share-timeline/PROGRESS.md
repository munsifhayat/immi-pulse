# PROGRESS — Share Your Timeline

Epic: Deliver the *share your visa timeline* flow end to end — from first tap to a row that
counts in the community statistics.
Integration branch: `feat/share-timeline`
Base: `main`
Baseline: `31bad77` (source plan phases 0, 1, 3 — built and verified before this epic)

Phase status: [done] p1 · [done] p2 · [done] p3 · [done] p4 · [pending] p5

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

---

## Handoff — p2: DHA occupation dataset and filtered picker   [done]

Branch `feat/share-timeline-p2-occupations` → squash-merged into `feat/share-timeline`.
Dashed name again, per p1's note.

### What shipped vs planned

Everything in the phase spec. The shape is one rule, stated on `Occupation`
(`models.py:805-866`):

> **Two codes, not one.** Resolve with `code_for_version` against
> `VisaSubclass.anzsco_version`; never read a code column directly.

- New `scripts/fetch_dha_occupations.py` → committed `scripts/dha_occupations.json`
  (714 records). Browser UA + Referer, 3-attempt backoff, `--dry-run`, and a
  `MIN_RECORDS = 600` floor so a blocked page can never be mistaken for "the
  department retired 700 occupations".
- New `scripts/seed_occupations.py`. Matched on `slug`, absent rows go
  `is_active=False`, prints `created / updated / retired`. Also stamps
  `requires_occupation` + `anzsco_version` onto `visa_subclasses`.
- Migration `c4e8a2b6d0f7` (down_revision `b7d9f1a3c5e2`): `occupations` table,
  `visa_subclasses.requires_occupation` + `.anzsco_version`,
  `community_journeys.occupation_code`. Purely additive.
- `GET /community/public/occupations?subclass=&q=&limit=` — subclass filter
  (slug **or** bare number) and typeahead over name and both codes.
- `occupation-picker.tsx`: grouped by ANZSCO major group, searchable, filtered
  to the subclass, shows the resolved code + edition + assessing authority.
- Occupation is **required** where `requires_occupation`, **hidden** where not.
- Form layout: occupation now owns a full-width row; state/territory dropped to
  the second row's first cell.

### Key decisions and why

1. **Free text is gone from the write path entirely** — `CreateJourneyRequest`
   has no `occupation` field any more, only `occupation_slug`
   (`schemas.py:586-598`). Keeping free text as a fallback would have kept
   "Nurse"/"nurse"/"RN" alive on exactly the visas the coded list matters most
   for. `Journey.occupation` survives as the *display snapshot* (server-resolved
   from the picked occupation) and as history on pre-picker rows.
2. **`anzsco_version` is a column on `visa_subclasses`, not a constant.** It is
   Home Affairs' rule, it will move, and the fetcher reads it out of their own
   markup ("ANZSCO 2022 - Subclass 186 and 482 visas") rather than hardcoding it.
   Same for `requires_occupation`: derived from which subclasses any occupation
   is eligible for, so nobody curates a list by hand.
3. **The requirement is enforced at create-time-with-publish, not on publish.**
   `_resolve_occupation` (`service.py:1349-1408`). The draft path
   (`publish=False`, i.e. `save_wait_check`) is exempt because it collects a
   subclass and a date and has no field to put an occupation in. **This leaves a
   real gap — see gotchas.**
4. **Eligibility is re-checked server-side** even though the picker filters.
   The subclass can be changed after the occupation is picked, and a 189 timeline
   carrying a 482-only occupation is a cohort that means nothing.
5. **`ARRAY(String)` + GIN for `eligible_subclasses`**, not JSONB. The hot query
   is a containment test; `.any(code)` reads as what it is and the index serves it.
6. **489 is dropped, 187 is added.** 489 was repealed in 2019 and has no taxonomy
   row. The 23 `RSMS ROL` rows carry an *empty* `visas` field, so they are mapped
   to 187 explicitly — without it, 187 would come out needing no occupation.

### Interfaces produced (what p3+ will call)

| Thing | Where |
| --- | --- |
| `GET /api/v1/community/public/occupations` → `list[OccupationOut]` | `router.py:171` |
| `CommunityService.list_occupations(db, *, subclass, q, limit)` → `(rows, version)` | `service.py:842` |
| `CommunityService.occupation_out(occ, version)` | `service.py:902` |
| `CommunityService.get_occupation(db, slug)` | `service.py:919` |
| `CommunityService._resolve_occupation(...)` → `(name, code)` | `service.py:1349` |
| `Occupation.code_for_version(version)` | `models.py:867` |
| `VisaSubclass.requires_occupation` / `.anzsco_version` | `models.py:766` / `models.py:778` |
| `Journey.occupation_code` | `models.py:407` |
| `CreateJourneyRequest.occupation_slug` (no `occupation`) | `schemas.py:592` |
| `VisaSubclassOut.requires_occupation` / `.anzsco_version` | `schemas.py:208` / `schemas.py:212` |
| `OccupationOut` | `schemas.py:220` |
| `useOccupations(subclass)` | `hooks/community.ts:274` |
| `<OccupationPicker subclass value onChange required error />` | `occupation-picker.tsx:41` |

### Gotchas for the next phase

- **Run `alembic upgrade head` then BOTH seeders, in order**: `seed_visa_taxonomy.py`
  *then* `seed_occupations.py`. The second reads `visa_subclasses` to stamp the
  flags; run it first and every subclass stays `requires_occupation = false`,
  which silently disables the whole feature. New head `c4e8a2b6d0f7`, single head
  confirmed, downgrade→upgrade round-tripped against 478 live local journeys with
  no row loss. Note the downgrade **drops** `occupations` — reseed after.
- **The draft hole is p3's to close.** A wait-check draft on a skilled subclass
  saves with no occupation and `publish_journey` does not check, so it can reach
  the feed uncoded. p3 unifies all three entry points on draft→publish and owns
  `wait-check.tsx`; add the picker there and move the check into `publish_journey`.
- **The brief said 6 divergent occupations; there are 7.** Arborist is the extra,
  and it was silently dropped on the first fetch because that one row uses an **en
  dash** after the edition year while every other row uses a hyphen. `_DASH`
  (`fetch_dha_occupations.py:119`) covers seven dash codepoints. If a future
  refresh reports 713 records, this is why.
- **Only 6 of the 8 ANZSCO major groups appear.** No Machinery Operators and no
  Labourers are on any skilled list. `MAJOR_GROUPS` lists all eight; a test
  asserts six and no `"Other"`.
- **`requires_occupation` is false for lodgement stages** even though 482 requires
  one — the seeder zeroes `is_stage` rows, because a stage is never selectable in
  the picker and a required field behind an unreachable visa is a trap.
- **Clearing a dependent field belongs to the parent, on the event.** The picker
  deliberately does *not* clear a stale selection in an effect —
  `bun run lint`'s "setState synchronously within an effect" rule fires on it.
  `share-journey.tsx`'s `pickSubclass` does it instead. Same trap awaits any p3
  field that depends on the subclass.
- **Two e2e files were updated, not just added.** `e2e_community_taxonomy.py` and
  `e2e_community_moderation.py` both post skilled timelines and now resolve an
  occupation through the API first, rather than hardcoding one — moderation picks
  `subclasses[0]`, so a change in sort order must not turn it into an occupation test.
- No TODOs left.

### Verify result — all green

- `pytest tests/ -q` → **202 passed** (183 baseline + 19 new parser/resolver tests).
- `alembic heads` → exactly one (`c4e8a2b6d0f7`); downgrade→upgrade round-trip
  verified, 478 journeys intact.
- New `tests/e2e_community_occupations.py` → **60/60**: filter-by-subclass (slug
  and bare number), typeahead over name *and* code, all **7** divergent
  occupations asserted in both editions on a 186 vs a 189, required-refused /
  coded-accepted / off-list-refused / unknown-slug-refused, and a 600 Tourist
  needing and storing nothing.
- `seed_occupations.py` run twice → second run `created 0 · updated 714 ·
  retired 0`, `visa_subclasses re-flagged: 0`. Idempotent.
- `e2e_community_{taxonomy,waitcheck_save,accounts,inbox,antispam,ratelimit,`
  `moderation,identity_swap}.py` → all pass.
- Real HTTP round-trip on `:8001`: a 189 without an occupation returns 400 with
  "Pick your nominated occupation — subclass 189 timelines are grouped by it";
  with `occupation_slug=management-consultant` it returns 201 stamping **224711**
  (2013) where a 186 stamps **224713** (2022).
- `bunx tsc --noEmit` clean · `bun run build` clean · `bun run lint` back to
  exactly the 5 pre-existing errors, none in `src/components/community/` or `src/lib/`.


---

## Handoff — p3: adaptive form, context fields and unified consent   [done]

Branch `feat/share-timeline-p3-adaptive-form` → squash-merged into `feat/share-timeline`.

### What shipped vs planned

Everything in the spec, plus p2's deferred gap, plus one hole p2 opened that nobody
had noticed.

- **Field visibility is reference data.** `visa_subclasses` gains
  `requires_state_nomination`, `requires_region`, `requires_sponsor_type`
  (`models.py:778-805`), populated by `seed_visa_taxonomy.py` from three small
  policy sets (`STATE_NOMINATION`, `REGION_RELEVANT`, `SPONSOR_TYPE_RELEVANT`).
  Extend that pattern; do not add `if (subclass === ...)` anywhere.
- **Hidden means not stored.** The client hides the field *and* the server drops
  it (`service.py:1512-1521`). A stale tab or a direct API call cannot write
  "Regional" onto a partner visa any more.
- **`Journey`** gains `lodgement_location`, `nationality`, `lodged_via`,
  `direct_grant`. `state` no longer carries `'Offshore'` — the migration rewrites
  those rows.
- **Nationality is stored and never served.** Absent from `JourneyOut` entirely
  (`schemas.py:719-726`) and from `_journey_out_dict` (`service.py:2005-2010`).
- **`direct_grant` is tri-state.** None = "didn't say", False = "there was
  contact", True = "no CO contact". Collapsing the first two would lose the
  assertion the field exists for.
- **The composer no longer offers a Post button that cannot work.** p2 made
  occupation required for 17 subclasses but the quick composer has no picker, so
  picking a 189 there filled in a form and collected a 400. It now hands over to
  the full builder (`composer.tsx:59-66`, `:244-272`).

### Key decisions and why

1. **`publish` is a required field with no default**, rather than converting the
   builder and composer to a two-step draft→publish. The spec asked all three
   entry points to "unify on draft→publish"; the *bug* was that
   `create_journey(publish=True)` defaulted, so a caller that forgot the argument
   published a stranger's timeline. Requiring the field fixes exactly that
   without making the builder round-trip twice — its submit button already *is*
   the consent, and a second click would add a failure window, not a decision.
   The wait-check keeps its genuine two-step.
   **This is a breaking API change**: the schema now rejects a payload without
   `publish`. 17 e2e payloads and 3 seeder calls were updated.
2. **The occupation is asked at publish time for wait-check drafts**, not at
   save time. `PublishJourneyRequest.occupation_slug` (`schemas.py:453-458`) and
   `publish_journey(occupation_slug=...)` (`service.py:1740-1765`). Saving a wait
   check must stay frictionless — a subclass and a date, nothing else.
3. **Monotonic milestones are checked per submission, not against stored rows.**
   `append_milestones` re-sorts the merged set, so back-filling a forgotten
   medical is legitimate; a single submission that contradicts itself is not.

### Interfaces produced (what p4 will call)

| Thing | Where |
| --- | --- |
| `VisaSubclass.requires_state_nomination/_region/_sponsor_type` | `models.py:778-805` |
| `Journey.lodgement_location/nationality/lodged_via/direct_grant` | `models.py:399-430` |
| `CreateJourneyRequest.publish` (**required**) | `schemas.py:655-666` |
| `_assert_monotonic(milestones)` | `schemas.py:596-616` |
| `publish_journey(..., occupation_slug=)` | `service.py:1728` |
| `PublishJourneyRequest.occupation_slug` | `schemas.py:453` |

### Gotchas for p4

- **Run `alembic upgrade head` then BOTH seeders**, taxonomy first. The new flags
  live on `visa_subclasses` and a downgrade/upgrade cycle resets them to false —
  the form then silently asks nobody for anything.
- `create_journey` no longer has a `publish` default. Any new caller must pass it.
- `_resolve_occupation` now takes `occupation_slug=` rather than `payload=`, so it
  can serve both create and publish.
- The publish route now catches `ValueError` → 400 (`router.py:301-310`). It did
  not before, so a service-layer refusal there used to surface as a 500.
- `nationality` is on the model and in no serializer. p4 may pool cohorts on it;
  it must not emit it. `tests/e2e_community_adaptive_form.py` greps whole response
  bodies, not named keys.

### Verified

- `pytest tests/ -q` → **216 passed** (202 baseline + 14 new in
  `tests/agents/immigration/test_community_adaptive_form.py`)
- New `tests/e2e_community_adaptive_form.py` → **29/29**
- All ten community e2e suites pass
- `alembic heads` → one (`d6f0b4c8e2a9`); downgrade→upgrade round-tripped against
  584 local journeys with no row loss and no `state='Offshore'` left behind
- `bunx tsc --noEmit` clean · `bun run build` clean · lint back to exactly the 5
  pre-existing errors
- Driven in a real browser (BE :8001, FE :3000): 189 → stream + required
  occupation, no state/sponsor; 190 → occupation + state + area; 482 Labour
  Agreement → occupation + state + sponsor; 820 partner → neither; 600 Tourist →
  no occupation; composer hands a 189 to the full builder and leaves a 600 alone.


---

## Handoff — p4: stream-level cohorts and honest official figures   [done]

Branch `feat/share-timeline-p4-cohort-stats` → PR into `feat/share-timeline`.

### What shipped vs planned

The spec's framing was right but its emphasis was wrong: the plan expected
"make the stats honour `cohort_split_by_stream`", and that was already true via
`cohort_key`. The real find was a **correctness bug in the trend arrow**.

- **`_trend_for` was computing over a different population than the percentiles
  printed beside it.** It selected every active granted row ever — no window, no
  publication check, no provenance filter — while `_cohort_sample` applied all
  three. So the arrow and the median described different groups of people, and a
  member saving a *private, unpublished* draft could move a public arrow.
  Both now draw from one extracted predicate,
  `CommunityService._publishable_conditions` (`service.py:922-957`).
- **`cohort_split_by_stream` is a column** (`models.py:807-822`), backfilled from
  the shape of `cohort_key` rather than from the snapshot file, so it agrees with
  the data already in the table. Served on `VisaSubclassOut` so a cohort can be
  *explained* rather than only presented.
- **`is_live` and its documentation now agree.** The implementation
  (`service.py:1115`, keyed off the ingestion-only `dha_subclass_code`) was
  right and well-argued; the schema docstring claiming it keys off an as-at date
  was the stale one. Fixed the doc, not the behaviour — a hand-seeded row can
  carry a date, so a date is not evidence of provenance.
- **New `scripts/check_cohort_integrity.py`** — the audit nobody had.
  `community_timelines.subclass_slug` holds a *cohort key* despite its name, and
  a one-shot migration cannot maintain a set that moves. Read-only by default,
  `--fix` repoints repairable rows.

### The stranded-row question, answered

The plan flagged that migration `f2a4c6e8b0d3`'s `SLUG_REMAP` documents the split
set as `189, 491, 482, 500` while the committed snapshot splits **nine**, adding
`188, 403, 408, 600, 888`.

**Checked against production: no rows were stranded.** 111 mirror rows across 8
cohorts, 134 journeys across 8 slugs, all live. The eight pre-existing slugs all
survived the reshape (the seeder reported `retired 0`), so the gap never bit. The
integrity script now makes that checkable rather than assumed.

### Interfaces produced (what p5 will call)

| Thing | Where |
| --- | --- |
| `CommunityService._publishable_conditions(subclass_slug)` | `service.py:922` |
| `VisaSubclass.cohort_split_by_stream` | `models.py:807` |
| `VisaSubclassOut.cohort_split_by_stream` | `schemas.py` |
| `scripts/check_cohort_integrity.py [--fix]` | new |

### Gotchas for p5

- **Any new query that feeds a public figure must use `_publishable_conditions`.**
  That is the whole point of extracting it — two copies had already drifted.
- A downgrade/upgrade cycle resets `cohort_split_by_stream` to false; re-run
  `seed_visa_taxonomy.py` after. Same trap as p3's flags.
- `check_cohort_integrity.py` is the natural thing for p5's refresh job to run
  after a re-seed — a taxonomy refresh that changes pooling is exactly what
  strands mirror rows.

### Verified

- `pytest tests/ -q` → **216 passed**
- New `tests/e2e_community_cohort_stats.py` → **15/15**, including that a private
  draft moves neither the sample, the median, nor the arrow
- All eleven community e2e suites pass
- `alembic heads` → one (`e8b2d4f6a0c1`); downgrade→upgrade round-tripped against
  619 journeys, no row loss
- Production audit: 0 stranded mirror rows, 0 orphan journeys
- `tsc --noEmit` clean · `build` clean · lint unchanged at the 5 pre-existing errors
