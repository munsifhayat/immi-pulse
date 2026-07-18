# 01 · Where We Are — Honest Current-State Scorecard

_A no-flattery audit of what is actually built, what only looks built, and what's missing. Grounded in the code as of 2026-07-18, not in the marketing._

The headline: **you are much further along than the "nothing ever finishes" feeling suggests.** The gap to launch is not "build the product" — it's "finish the last mile on three fronts and cross one at a time."

---

## The one-screen scorecard

| Module | Built | Verdict |
|---|---|---|
| **Community** | ~75% | Core works & is live. Blocked by broken moderation, no real accounts, no SEO. **Closest to launch.** |
| **SaaS (consultant + client portal)** | ~70% | Hardest part (AI enquiry→case→docs) is real. Blocked by: no real money moves, 2 fake screens, no lodgement automation. |
| **Marketplace** | ~65% | Fully built, **hidden behind a redirect**. Blocked by: how to fill it legally, no claim/verify, no lead capture. |

"% built" is deliberately rough — it's "distance travelled toward a launchable MVP," not lines of code.

---

## Community — ~75% · your strongest, most-finished asset

**What genuinely works (verified in code, live at `/community`):**
- **"Is my wait normal?" wait-check engine** — real percentile maths over community timelines, with an honest fallback to official DHA processing bands when sample size is thin. This is the wedge, and it works.
- **Shareable visa timelines** — the milestone builder → post → the stats update live from real (non-sample) submissions.
- **Anonymous identity** — device-token handle/colour, one free timeline before a login prompt.
- **Votes + flat comments** on journeys.
- **Official-vs-community processing times** board.
- **Seed data** — 12 hand-curated + 141 harvested-and-anonymised real timelines (kept *isolated* from the live stats — a genuinely good, honest design choice).

**What's broken or missing (the launch-blockers):**
- 🔴 **Moderation is a silent no-op on the feed people actually use.** There's no "report" button on the live feed, and the backend can't even action a report against a journey — an admin clicking "Remove" does nothing to the content. For a community carrying immigration discussion under Australian s276 rules, this is a **legal/safety blocker, not a nice-to-have.**
- 🔴 **No real accounts, no notifications, no email digest.** The login prompt promises "get notified when someone replies" — that code does not exist. The function that would link an anonymous poster to a real account is written but **never called**.
- 🟠 **Anonymous identity is spoofable** — clearing browser storage resets the "one timeline per person" cap, which the honesty of the stats depends on.
- 🟠 **No SEO / no page metadata.** The long-tail "is subclass 482 processing time normal" searches are the *entire* organic growth engine — and nothing on these pages is indexable today.
- 🟡 **A whole legacy "spaces/threads" system is still deployed, publicly writable, and unlinked** — an unmonitored spam/abuse surface. Delete it or re-integrate it.
- 🟡 **Admin/moderation is protected only by the public API key** (the same key shipped in the frontend). No real admin role.
- 🟡 **Deploy lag** — the harvester + the 141-record dataset are built and verified locally but, per project notes, **not yet on production.**

---

## SaaS — ~70% · your hardest engineering, blocked on money

Two surfaces: the **consultant console** (for OMARA agents) and the **client portal** (for applicants).

**What genuinely works:**
- **The AI pipeline is real.** Email intake → AI visa classification → pre-case triage (AI summary + suggested outcome) → case → AI document validation (flags expiring passports, low IELTS, name mismatches). Each AI step has a non-AI fallback so it never hard-fails. *(Note: it runs on OpenAI via the Strands SDK, not AWS Bedrock as CLAUDE.md claims — a doc drift worth fixing.)*
- **Native e-sign** — engagement letters with PIN, consent text, hashed body, IP/UA audit trail, and a manual "signed offline" override.
- **The enquiry → pre-case → qualify → letter → case → document-collection → review chain is real and mostly automated.** This is genuinely impressive and is the strongest part of the whole product.
- **Account-based client portal** — login, multi-application dashboard, native sign, document upload. Real, end-to-end.
- **Manual payments ledger** — record bank transfer/PayID/cash/waived, with a skip-payment override.

**What's fake or missing (the blockers):**
- 🔴 **No real money moves anywhere.** Platform subscription billing is a DB flag flip ("Stripe deferred"), the client-payment "checkpoints" module is mock Stripe links, and its UI component is imported nowhere. For a *paid* product this is the #1 blocker.
- 🔴 **The "lodgement" step is where the story breaks.** `lodgement_date` is just a manual field — there is **no DHA form auto-fill, no ImmiAccount integration.** The "collect once → auto-fill government forms" hero feature exists only as a static HTML demo, not in the app. This is the biggest gap between the pitch and the product.
- 🟠 **Two "done" screens are actually mock — despite the real backend already existing.** `/dashboard/activity` and `/dashboard/documents` render mock data while a fully-wired real service sits next to them, unused. **These are the cheapest wins in the entire audit.**
- 🟠 **Two parallel client portals** (a per-case token one and the account-based one) are not integrated — the client's experience differs depending on which door the consultant opened.
- 🟠 **The case-screen "email portal link to client" is faked** — it logs "pretending to email…" and claims success. A consultant thinks a message went out; none did.
- 🟡 **E-sign produces no downloadable signed PDF** — there's an audit trail but no artifact to hand the client or DHA.
- 🟡 **No self-serve email connection** — the real Microsoft 365 OAuth flow exists in the backend but has no frontend; the settings screen is a mock toggle.

---

## Marketplace — ~65% · fully built, hidden from the world

**What genuinely works (but nobody can see it):**
- Real `agent_profiles` database table + full API: public directory, agent apply, admin approve/reject/set-tier.
- Public directory UI: search, city/visa-type/language filters, sort, grid/list, full profile detail pages, a complete apply form.
- Admin approval queue in the console.

**The catch: it's turned off.** A redirect in `next.config.ts` sends all `/find-consultants` traffic to `/community`. The backend and database are live; only the public pages are blocked. It's a one-line change to bring back.

**What's missing to make it a real, fillable marketplace:**
- 🔴 **How do you fill it legally?** You want to seed it with real agents "from Google." The compliant path is specific and non-obvious — seed from the **OMARA public register** as *unclaimed, bare-factual* listings + a claim-to-verify flow. Do **not** scrape agent websites. (Full playbook: [`03-marketplace-mvp.md`](03-marketplace-mvp.md).)
- 🟠 **No claim-your-profile flow** — the mechanism that makes seeded listings legitimate.
- 🟠 **No lead capture** — "contact" is a raw `mailto:`/`tel:` link; you can't see, route, or monetise a single lead.
- 🟠 **Any API-key holder can edit any agent's profile** (no ownership check — the code admits it).
- 🟡 **No automated OMARA verification** (admin eyeballs the register manually), **no reviews** (fields exist, nothing writes them), **no email** on apply/approve (the form promises a reply in "2 business days" that never comes), OMARA number isn't enforced unique.
- 🟡 **No agent seeder exists** (unlike the community, which has a harvester) — it would need to be built, carefully, against the register only.

---

## The uncomfortable, useful truth

Across all three modules, the same pattern repeats: **the hard 70% is done, and the unglamorous last 30% — moderation, payments, SEO, wiring the screen you already built to the backend you already built — is what's left.** That last 30% is boring. Boring is exactly what the novelty loop skips. Which is precisely why nothing has crossed the line.

The plan from here is to make the boring 30% the *only* thing on the list, one module at a time. Start with [`02-community-mvp.md`](02-community-mvp.md).
