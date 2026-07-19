# Share Your Timeline — End-to-End Production Plan

**Status:** Phases 0, 1 and 3 BUILT + verified locally (uncommitted). Phases 2, 4, 5, 6 pending.
**Written:** 2026-07-19
**Scope:** The single feature of *sharing your visa timeline*, from first tap to a row that
counts in the community statistics. Everything else in `/community` is out of scope except
where it blocks this flow.

---

## 0. The one-paragraph version

Sharing a timeline today collects **free text where it needs codes**, offers **8 visa
subclasses where Home Affairs publishes 76 subclass+stream combinations**, and hard-codes a
**stream list that only makes sense for the 186**. Meanwhile a server-side bug means that a
member who creates an account — the exact flow we are about to build — is still blocked from
posting a second timeline, after the UI has told them they can. This plan fixes the account
flow (email-first, instant, no verification), replaces the visa taxonomy and the occupation
field with two data pipelines fed from Home Affairs' own systems, and makes the form adapt to
the visa the member actually picked.

**Two research findings change the shape of the build:**

1. **Home Affairs runs an undocumented public JSON API** behind their processing-times tool.
   It returns the full taxonomy *and* live percentiles. Verified working from this machine
   (HTTP 200, 76 rows). We do not have to hand-maintain the visa list, and our "official
   figures" stop being a hardcoded seed from a migration.
2. **Home Affairs embeds the entire 714-record skilled occupation dataset as JSON in the
   `skill-occupation-list` page** — with ANZSCO code, list membership (MLTSSL/STSOL/ROL/CSOL),
   eligible visa subclasses, and assessing authority per occupation. Verified: 714 records
   parsed. That is the occupation picker, the subclass filter, and a future
   "who assesses your skills" feature, from one fetch.

---

## 1. Current state (verified against the code, not assumed)

### 1.1 What the member fills in today

`immi-pulse-fe/src/components/community/share-journey.tsx` — one dialog, nine fields:

| Field | Control | Backing data | Verdict |
|---|---|---|---|
| Visa subclass | `<select>` | server, **8 rows** | Too few, and stream is baked into the row |
| Stream | `<select>` | **hardcoded 5 strings** (`:43-49`) | Wrong for 40 of 43 subclasses |
| Occupation | free-text `maxLength=80` | none | Cannot power cohort matching |
| State | `<select>` | hardcoded 9 (incl. `Offshore`) | Conflates location with lodgement site |
| Area | metro/regional | — | Only meaningful for 190/491/494 |
| Sponsor type | accredited / non-accredited | — | Only meaningful for 482/186 |
| Outcome | waiting/granted/refused | — | Fine |
| Milestones | type + date repeater | 15 types | Good vocabulary, single-stage only |
| Note | textarea 280 | — | Fine |

Every one of stream / occupation / state / area / sponsor is shown to **every** member
regardless of subclass. A 600 Tourist applicant is asked for their ANZSCO occupation and
whether their employer is an accredited sponsor.

### 1.2 The three entry points, two consent models

| Surface | File | Writes | Consent |
|---|---|---|---|
| Full builder | `share-journey.tsx` | `POST /community/journeys` | **immediately public** |
| Quick composer | `composer.tsx` | `POST /community/journeys` | **immediately public** |
| Wait-check save→publish | `wait-check.tsx` | `/wait-check/save` then `/publish` | draft, then explicit `consent_public` |

The wait-check's two-step is deliberate and well-reasoned (there is a load-bearing comment at
`wait-check.tsx:325-333` explaining why collapsing it would be a worse product). The builder
and composer bypass it entirely. **Same object, two different consent stories** — that is the
inconsistency to resolve, and the wait-check is the one that is right.

### 1.3 Account model today

`AnonIdentity` (`models.py:99-201`) is both device identity and account.

- Handle is **server-assigned** (`QuietHarbor4821` style) — matches the locked Reddit-style
  account decision, keep it.
- Signup = **claim the existing device row**, not create a new one. `POST /auth/signup` takes
  `{password, email?, accepted_no_recovery}`.
- **Email is optional**, and there is **no email login path** — login is `handle + password`
  only. A member who forgets their assigned handle and never gave an email is unrecoverable.
- No verification flow exists; `email_verified_at` is written by nothing.

---

## 2. Gap analysis

### G0 — Blockers (must fix; two are live bugs)

**G0.1 · The cap gate contradicts itself — P0, sits exactly on this feature.**

`service.py:1194-1203` computes the flag the UI trusts:
```python
is_claimed = identity.user_id is not None or has_account   # has_account = bool(password_hash)
"can_post_timeline": is_claimed or (identity.journeys_posted or 0) < 1
```
…with an explicit comment: *"A community account lifts the one-timeline cap exactly like a
portal account does."*

But `service.py:1247` enforces:
```python
if is_timeline and identity.user_id is None:      # portal accounts ONLY
    if (identity.journeys_posted or 0) >= 1:
        raise JourneyCapError(...)
```

`user_id` is the **portal** FK and stays `NULL` for community accounts. So a member who signs
up with email + password gets `can_post_timeline: true`, the builder opens, they fill the
whole form — and the POST 409s. **The flow this session is building walks straight into it.**
Fix: gate on the same `is_claimed` definition the serializer uses.

**G0.2 · The quick composer does not handle the cap.** `composer.tsx:78-108` has no
`try/catch`, so `JourneyCapError` never converts into the signup dialog — the member sees raw
error text. `share-journey.tsx:211-215` does it correctly.

**G0.3 · Account pre-hijacking via the shared `email` column.** `models.py:136` is a single
`email` column, `unique=True`, holding both unverified and verified addresses. Anyone can
submit a stranger's email and permanently block the real owner from ever attaching it
(Sudhodanan & Paverd, USENIX Security 2022 — 35 of 75 popular services shipped this bug).
Since we are about to make email **required and unverified for everyone**, this stops being
theoretical the day we ship. Fix before, not after: split into `email_pending` (no unique
constraint) and `email_verified` (unique), and invalidate other sessions on verification.

### G1 — Account & onboarding

| Gap | Detail |
|---|---|
| Email optional | Must become required at the moment of sharing |
| No email login | Login is `handle + password`; members will return via email |
| Password demanded up front | Adds friction to the one moment we want frictionless |
| No typo protection | An unverified required email with no typo check is a silent data-loss machine |
| Signup gate is placed before the write | Research is unambiguous: ask **after** the timeline is live |

### G2 — Visa taxonomy (the core of this session's ask)

| Gap | Detail |
|---|---|
| 8 of 43 subclasses | Missing 189 NZ, 190, 491 both streams, 494, 187, 191, 887, 858, 407, 408, 403, 400, 600, 601, 651, 417, 462, 590, 500's other 6 sectors, all family, all business |
| Stream is a hardcoded 5-item list | Correct only for 186. Meaningless for the other 40 |
| Stream is free text, unvalidated | `Journey.stream` never cross-checked against `VisaSubclass.stream` |
| Stream always defaults to `STREAMS[0]` | **Every timeline silently carries "Direct Entry (DE)"** whether or not the member chose it — actively poisoning any future stream-level statistic |
| Official figures are a frozen migration seed | `a1c2e3f4d5b6`, `OFFICIAL_UPDATED = "Mar 2026"`, `is_live` hardcoded `False` |
| Nomination/sponsorship not modelled | 482 and 870 have their own clocks; DHA publishes them as separate streams |

**The stream question, answered with data.** I pulled live percentiles for all 76 combinations
and computed the spread. Stream is not uniformly important — it is *critical* for some
subclasses and *noise* for others:

| Subclass | Streams | 75th-pct spread | Treatment |
|---|---|---|---|
| 500 | 7 | **35.5×** (Non-Award 6d → VET 7mo) | Split cohorts by stream |
| 408 | 8 | **12.2×** | Split |
| 482 | 5 | **11.6×** | Split |
| 189 | 2 | **9.5×** (Points-Tested 6mo → NZ 57mo) | Split |
| 188 | 2 | 9.3× | Split |
| 403 | 5 | 6.3× | Split |
| 600 | 3 | 3.7× | Split |
| 491 | 2 | 3.4× | Split |
| 870 | 2 | 3.1× | Split |
| 888 | 3 | 2.0× | Split |
| 494 | 2 | 1.1× | **Collect, do not split** |
| 186 | 3 | 1.1× | **Collect, do not split** |
| 485 | 2 | 1.0× | **Collect, do not split** |

This earns a `cohort_split_by_stream` flag per subclass. Splitting a 485 cohort by stream
halves our sample for zero signal — and sample size is the scarce resource in this product.

**Naming traps found:** 186 is "Pathway" in the API but "stream" on the visa pages (needs a
label map). Codes `482-1`, `858-3`, `858-4` are **not integers** — a naive parse breaks, and
858 silently merges Global Talent (pre-Dec-2024) with National Innovation. `485` has **two**
streams, not four — "Post-Study Work"/"Graduate Work" are legacy redirects and "Replacement"
was repealed 1 Jul 2024. `482` has **no** "Essential Skills" stream; it remains unimplemented
policy. `476` is repealed.

### G3 — Occupation

| Gap | Detail |
|---|---|
| Free text | "Nurse", "nurse", "RN", "Registered Nurse (Medical)" are four cohorts |
| No ANZSCO code | Cannot join to any official dataset |
| Not filtered by subclass | A 189 applicant can type an ROL-only occupation that makes them ineligible |
| Shown for every subclass | Irrelevant for family/visitor/student |
| No skills-assessment link | We hold the authority mapping and show nothing |

**The two-version trap.** Home Affairs uses **ANZSCO 2022** for 186/482 (incl. all of CSOL)
and **ANZSCO 2013** for every other skilled subclass — stated verbatim on their own page.
409 occupations share a code across both; **6 differ** (Flower Grower, Landscape Gardener,
Management Consultant, Plumber (General), Statistician, Zoologist). Store both codes and
resolve on subclass, or those six mis-bucket silently. **OSCA is a red herring** — ABS has
retired ANZSCO, but Home Affairs has not adopted OSCA, and only 6 of 456 CSOL codes exist in
OSCA. Build on ANZSCO; keep the correspondence table for the 2027 migration.

### G4 — Context fields

Missing, ranked by evidence that members want them (myimmitracker's schema is the best
available proxy — thousands of applicants have filled these in voluntarily for years):

| Field | Evidence | MVP? |
|---|---|---|
| **Onshore / offshore** | Users cram it into free text on the competitor app | **Yes** |
| **Nationality** | myimmitracker users self-organise into Indian/Chinese/Pakistani sub-trackers | **Yes** |
| **Agent vs self-lodged** | Distinct myimmitracker column | **Yes** |
| Dependants / family size | Free-texted by competitor users | Phase 2 |
| Points score | Core to 189/190/491 cohorts | Phase 2 (skilled only) |
| CO contact (date, team, count) | myimmitracker tracks it **six ways**; no app tracks it at all | Phase 2 — biggest differentiator |
| English test type/score | EOI trackers | Later |

`state` currently mixes `Offshore` into the state enum — that is the onshore/offshore signal
smuggled into the wrong field. Separate them.

### G5 — Milestones

The 15-type vocabulary is good and matches how applicants actually talk (EOI, ITA, s56).
Gaps: no per-milestone note (competitor has it, users use it); multi-stage subclasses
(sponsorship → nomination → visa for 482/870) collapse into one clock; and **801/100 do not
start at lodgement** — Home Affairs measures from *date of eligibility*, two years after
application. Computing those from lodgement is wrong by ~24 months.

---

## 3. Target design

### 3.1 The account flow (email-first, instant, unverified)

**Settled: the email ask comes first — "join, then share" (decision 1).**

```
        [ Share your timeline ]
                  │
                  ▼
   ┌──────────────────────────────┐
   │  Join the community          │
   │  [ email             ]       │   REQUIRED, inline typo suggestion
   │  [ confirm email     ]       │   ← "confirm" = retype, NOT verification
   │  [ password          ]       │
   └──────────────┬───────────────┘
                  ▼
   account created + session issued, immediately
   "You're in, QuietHarbor4821"
                  ▼
   ┌──────────────────────────────┐
   │  Your timeline               │
   │  visa → stream → context     │
   │  → milestones                │
   └──────────────┬───────────────┘
                  ▼
              published
```

Decisions:

- **Email required, no verification, instant session.** As asked. The account is created and
  the member logged in before the builder opens.
- **"Confirm your email" = retype**, not a verification click. This is the typo guard, and it
  is what makes an unverified required email survivable. Pair it with client-side typo
  suggestion (`@smashsend/email-spell-checker`, 1.9 KB — note the original `mailcheck` is
  ~7 years unmaintained) and a server-side MX check.
- **Keep the assigned handle.** Already locked. Email is the *login identifier*; the handle
  is the *public identity*. They never meet.
- **Password at signup (decision 2).** Return visits stay `handle + password`. Email is now
  mandatory, so the `accepted_no_recovery` branch is dead code — remove it, and recovery
  finally works for every member.
- **`email_pending` vs `email_verified` from day one** (see G0.3). Unverified email carries a
  session but not account-recovery rights — recovery requires a verified address, which is
  the natural incentive to verify later.
- **Ask on the success screen for anything optional** (nationality, points, dependants) —
  post-submit, attached to something they are now invested in.

This also satisfies **APP 2** (anonymity and pseudonymity) by construction: nothing published
is identifying, and the email is never displayed.

> ⚠️ **Deliverability is the real operational risk.** SES pauses sending above a 10% bounce
> rate and reviews above 5%. Cold, unverified addresses bounce. Send these from a **separate
> subdomain and SES configuration set** so a bad week cannot take down transactional mail, and
> send **no reminder emails** to unverified addresses.

### 3.2 Data model

**New: `visa_streams`** — 76 rows, refreshed from the DHA API.

| Column | Notes |
|---|---|
| `id` | PK |
| `subclass_code` | `"189"`, `"482-1"`, `"858-4"` — **string**, not int |
| `dha_stream_code` | `"63"`, `""` for no-split subclasses |
| `stream_name` | exact DHA text |
| `display_name` | our label (maps 186 "Pathway" → "stream") |
| `official_p25/50/75/90_days` | live percentiles |
| `official_end_date`, `official_updated` | provenance |
| `is_stage` | `true` for 482/870 Nomination + Sponsorship pseudo-streams |
| `is_active` | dropped from the API → inactive, never deleted |

**Reshaped: `visa_subclasses`** — 43 rows, one per subclass (currently 8 rows conflating
subclass and stream). Adds `cohort_split_by_stream` (bool), `requires_occupation`,
`requires_state_nomination`, `is_onshore` / `offshore_pair_code`, `clock_anchor`
(`lodgement` | `eligibility_date`), `category_slug`.

**New: `occupations`** — 714 rows from the DHA SOL dataset (extend to ANZSCO 2022's 1,076 if
we need non-skilled coverage).

| Column | Notes |
|---|---|
| `anzsco_2013_code` / `anzsco_2022_code` | both; resolve on subclass |
| `name`, `major_group_code`, `major_group_name` | 8 major groups for picker grouping |
| `lists` | `MLTSSL;CSOL` etc. |
| `eligible_subclasses` | array — drives the picker filter |
| `assessing_authority`, `authority_url` | free downstream feature |

**`Journey` changes:** add `stream_id` FK, `occupation_code`, `lodgement_location`
(onshore/offshore), `nationality`, `lodged_via` (self/agent). Keep `stream` and `occupation`
as denormalised display snapshots. **Stop defaulting `stream`** — it must be explicitly
chosen or null.

### 3.3 The adaptive form

The form asks only what the chosen subclass actually needs — driven by the data model, not
`if (subclass === "186")`:

| Field | Shown when |
|---|---|
| Stream | subclass has >1 non-stage stream (13 of 43) |
| Occupation | `requires_occupation` — filtered to that subclass's eligible list |
| State/territory | `requires_state_nomination` (190, 491-state) or employer-sponsored |
| Metro/regional | 190 / 491 / 494 only |
| Sponsor accredited | 482 / 186 only |
| Onshore/offshore | always (replaces `Offshore` inside the state enum) |
| Nationality | always |
| Nomination + sponsorship dates | 482 / 870 only |

**Occupation picker:** typeahead over name and ANZSCO code, grouped by the 8 major groups,
filtered to the selected subclass — the competitor's flat alphabetical list (screenshots 5-6:
"Aboriginal and Torres Strait Islander Education Worker" first, unfiltered) is exactly the
pattern to beat.

---

## 4. Data pipelines

Both are `scripts/` fetchers writing to a versioned JSON snapshot in-repo, plus an idempotent
loader — same shape as the existing `seed_community_scraped.py`, so the pattern is familiar.

**Pipeline A — taxonomy + official times** (monthly; the taxonomy is *not* static — MATES and
PALM streams are recent additions and the 858 split is mid-transition):
```
POST /_layouts/15/api/GPT.aspx/GetProcessGuideVisas      → 76 rows
POST /_layouts/15/api/GPT.aspx/GetVisaGlobalProcessingTime → percentiles
```
Requires a browser `User-Agent` + `Referer`. **WebFetch gets 403; curl works.** Akamai
rate-limits — throttle, and snapshot to the repo so a blocked run never empties the table.
This finally makes `is_live` true.

**Pipeline B — occupations** (quarterly): `GET /visas/working-in-australia/skill-occupation-list`,
extract the embedded JSON array at the `[{&quot;occupation&quot;` marker, HTML-unescape,
`json.loads`. 714 records. Fields are HTML-wrapped — the ANZSCO code and assessing authority
need regex extraction out of anchor tags.

> Use the **web dataset, not `core-sol.pdf`** — they disagree on 7 codes and the PDF is stale.
> The legislative instrument (F2024L01620) is the legal authority if we ever need to defend a
> list; its JSON metadata endpoint is a cheap poll for new compilations.

---

## 5. Phasing

| Phase | Deliverable | Why this order |
|---|---|---|
| **0** ✅ | G0.1 cap gate · G0.2 composer 409 · G0.3 email column split | Bugs on the path; 0.3 must precede required email |
| **1** ✅ | Pipeline A + reshaped `visa_subclasses` (76 rows) + `cohort_key` + two-step picker | The taxonomy is the session's core ask |
| **2** | Pipeline B + `occupations` + filtered typeahead | Depends on subclass eligibility from Phase 1 |
| **3** ✅ | Email-required instant account, asked before the form | Independent of 1–2, can run in parallel |
| **4** | Adaptive form + onshore/offshore + nationality + agent/self; unify on draft→publish consent | Needs 1–3 landed |
| **5** | Cohort stats honour `cohort_split_by_stream`; official figures go live | Payoff — the wait-check gets sharper |
| **6** | Monthly/quarterly refresh jobs + drift alerting | Keeps it true |

Phase 0 is small and ships on its own. Phases 1 and 3 are the substance.

---

## 6. Decisions — settled 2026-07-19

| # | Decision | Consequence |
|---|---|---|
| 1 | **Email is asked *before* the form.** "Join, then share." | §3.1 flow inverts: email gate → account + session → builder opens. Keeps a single clean "you are a member now" moment. |
| 2 | **Keep `handle + password`; add required email.** | No magic-link build. Existing auth, recovery and session code all stand. Signup becomes `email + confirm email + password`; email powers recovery, which finally works for everyone. |
| 3 | **All 43 subclasses.** | Thin cohorts fall back to official DHA figures with an honest "no community data yet" — already the wait-check's behaviour. Nobody is turned away at the door. |
| 4 | **Nationality: optional, never shown publicly.** | Cohort matching only. Stored on `Journey`, excluded from every public serializer. |

Because of (1), the account dialog becomes the front door of this feature rather than a
recovery from the cap. It must be fast: two email fields, one password field, no
`accepted_no_recovery` checkbox (email is now mandatory, so that branch dies).

---

## 7. Late research: how applicants actually write timelines

A sweep of 112 timeline-shaped r/AusVisa posts plus the pinoyau.info archive and Immitracker's
schemas changed four design details. This is how our target users already do this by hand.

**7.1 · Only two fields are universal.** Lodgement date (94%) and grant date (95%). Everything
else is a per-subclass extension — which is the strongest possible endorsement of the adaptive
form in §3.3. Occupation appears in 37% of posts overall; ANZSCO code in just 8%.

**7.2 · Negative facts are first-class data — this is the biggest miss in our current model.**
Roughly one post in five *explicitly asserts an absence*:

> `No CO contact, Direct from received to finalised.`
> `No s56, no form 80`
> `No further requests — direct grant!`

"No CO contact" is not a missing value — it is the single most information-dense claim in a
skilled timeline, and our schema cannot represent it. An empty milestone list and a
confirmed-clean run are indistinguishable today. **Add an explicit `direct_grant` /
"no CO contact" toggle**, not just an absent date.

**7.3 · Partner visas speak a different language.** They use **DOL / DOG / RFI**, essentially
never "s56" or "CO contact". They pair applicant nationality with *sponsor status*
("Applicant: Indian / Sponsor: Australian PR"). They have "double grant" (820+801 or 309+100
together) as an outcome — and 801 can arrive automatically with no application at all.
Immitracker confirms the split: its partner tracker has 10 columns to SC189's ~30. Our single
15-type milestone vocabulary is skilled-visa-shaped. **Milestone vocabulary must be
per-category**, not global — same mechanism as the adaptive form.

**7.4 · Dates are dirty and the fix is free.** Real posts contain `EOI submitted: 06 Nov 2026`
against a July 2026 grant, and `RFI submitted 08/07/2027`. Monotonic validation across
milestones catches an observable, recurring error. Also: **month-only dates are very common**
("EOI August 2025 / Invite December 2025") — a strict day-precision picker will lose data from
people summarising a long wait. Consider month precision as a first-class option.

**7.5 · Never ask for elapsed time — compute it.** Posts routinely state "(23 months wait)",
"Total: 7 months & 25 days". We already derive `processing_days`; surface it prominently.

Vocabulary to add to the milestone list (all verified in live use): **ROI** (Victoria's
pre-EOI step), **HAP ID**, **Medical Cleared** (distinct from "completed"), **Form 80 / 1221
requested**, **s57 / natural justice letter** (write it as "s57", *not* "NJL" — zero community
hits for NJL), **prior visa grants** (people put "485 granted: Dec 2025" *inside* the
timeline; citizenship posts are almost entirely a ladder of prior visas).

---

## 7. Sources

- Taxonomy + times: `immi.homeaffairs.gov.au/_layouts/15/api/GPT.aspx/GetProcessGuideVisas`,
  `.../GetVisaGlobalProcessingTime` (verified 2026-07-19; 76 rows; data to 31 May 2026)
- Occupations: `immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list`
  (verified; 714 records embedded as JSON)
- CSOL legal instrument: `legislation.gov.au/F2024L01620` (Compilation 3, 7 Nov 2025, 456 codes)
- LIN 19/051 (189/190/491 lists + assessing authorities): `legislation.gov.au/F2019L00278`
- ANZSCO 2022 structure (xlsx, 1,076 occupations): `abs.gov.au/statistics/classifications/anzsco-.../2022`
- Account pre-hijacking: Sudhodanan & Paverd, USENIX Security 2022
- Competitor schema: myimmitracker.com trackers; 186 Visa Tracker (iOS 4.76/220, Play 1K+)
