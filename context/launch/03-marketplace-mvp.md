# 03 · Marketplace MVP — And the Legal Way to List Agents

_Parked until Community ships. But the legal homework belongs here now, because it has a lead time you can't compress: you need OMARA's written OK before you bulk-seed anything._

**Status:** ~65% built, **hidden behind a redirect** (`next.config.ts` sends `/find-consultants` → `/community`). Backend + DB are live; only the public pages are switched off. Bringing it back is a one-line change — but *don't*, until it's legal and useful.

> ⚠️ **This document is not legal advice.** It's a founder-readable summary of the research. Before you seed a single agent or charge a single dollar, an Australian lawyer with privacy + defamation + consumer-law experience must sign off, and you must contact OMARA in writing. The lead time on those two things is exactly why this doc exists now, while the module is parked.

---

## The vision, and the trap inside it

**Vision:** a directory where an applicant browses many verified migration agents, filters by city/visa/language, and connects with the right one. It's the natural bridge between your free community (people asking "should I use an agent?") and your paid SaaS (agents who want the leads).

**The trap:** you said "list a lot of agents from Google." The instinct is right; the *method* is where founders get sued. Scraping agents' websites and Google Business profiles to republish their bios/photos is the fast way into copyright, privacy (Australian Privacy Act / APPs), and defamation trouble. There's a slower, boring, **safe** way that gets you 90% of the value. Use that one.

---

## ✅ The compliant sourcing playbook (do this)

### Source of truth: the OMARA public register — not Google
- OMARA (Office of the Migration Agents Registration Authority, part of Home Affairs) runs the **official public register** of Registered Migration Agents at **`portal.mara.gov.au/search-the-register-of-migration-agents`**. It's free, no login, built for exactly this — consumers verifying an agent.
- Per agent it exposes **factual, public** fields: full name, **MARN** (registration number), status (active/suspended/cancelled), state/country of business, commercial vs non-commercial.
- **Facts aren't copyrightable in Australia.** A bare directory entry — name, MARN, business name, suburb, public phone — sourced from the official register is the lowest-risk possible listing.

### The model: seed unclaimed → agent claims → agent verifies
This is the pattern every defensible directory uses (it's how MIGI, the AU migration directory, and health-practitioner directories work).

1. **Seed every agent as an "Unclaimed" bare-factual listing**, each clearly labelled: _"Sourced from the OMARA public register. Verify at mara.gov.au"_ with a link to the official record.
2. **Let the agent claim their listing** (business-email match / verification), at which point they can *opt in* to add a bio, photo, specialisations, response time — content **they** provide and consent to.
3. **Only claimed + OMARA-checked listings get the "Verified" badge.** That badge is the product. It's also your monetisation hook.

### Do / Don't — the guardrails that keep you safe

**DO**
- ✅ Seed only the factual fields the register itself publishes.
- ✅ Label every unclaimed listing with its source + a link to the official register.
- ✅ Put a **non-affiliation disclaimer on every page**: _"Independent directory. Not affiliated with or endorsed by OMARA or the Department of Home Affairs. Verify registration at mara.gov.au."_
- ✅ Surface the agent's **MARN prominently** — the Code of Conduct (cl. 2.11) *requires* agents to show it in advertising, so this aligns with the rules rather than fighting them.
- ✅ Treat this as a **full Privacy Act project** — publish a real collection notice, give every listed agent an easy correction / opt-out, even the unclaimed ones.
- ✅ Give agents a one-click "remove my listing" path.

**DON'T**
- ❌ **Don't scrape agents' own websites or Google Business profiles** for bios, photos, or descriptions. Copyright + untested contract/ToS risk live there — not on the government register.
- ❌ **Don't cross-match** register data with other scraped sources to "enrich" profiles. (The OAIC sanctioned exactly this pattern — DG Institute, 2025 — as unfair collection.)
- ❌ **Don't imply government endorsement** or use OMARA/Home Affairs logos/crests. (The ACCC actively pursues this — the Employsure case.)
- ❌ **Don't launch reviews without a complaints/takedown process** — under Australian defamation law a platform is treated as the *publisher* of user reviews. The safe-harbour defence requires an accessible complaints channel and action within **7 days**.

### The one thing with a lead time: ask OMARA in writing first
No bulk download / API / reuse licence for the register was found in the research — only a manual, one-record-at-a-time web search. So:
- **Before any automated or bulk pull**, email OMARA in writing, describe the well-labelled non-affiliated directory, and ask (a) whether the use is acceptable and (b) whether a structured data-sharing channel exists. Precedent to cite: the health regulator **AHPRA** runs exactly such a channel ("Practitioner Information Exchange"). Keep their reply on file.
- Occasional **manual** lookups to verify a specific agent are clearly fine (that's what the register is *for*). It's *systematic bulk harvesting* that needs the sign-off.

---

## 💰 Monetisation — the one rule that keeps you out of trouble

**Charge for listings/leads. Never take a percentage of the client's case fee.**

A percentage-of-fee commission does two bad things at once: it echoes the Avvo referral-fee scandal (US ethics boards ruled it an improper referral fee), and it drags you into the agent's own regulated fee-disclosure regime under the Migration Act. Avoid entirely.

Safe, benchmarked models (all AU-market real):

| Model | Benchmark | Notes |
|---|---|---|
| **Free unclaimed listing** | $0 | Coverage + trust + SEO. The base layer. |
| **Featured / subscription tier** | ~$35/mo or ~$300/yr | Matches Australian Migration Directory ($35/mo, $299/yr). Cleanest first revenue. |
| **Capped pay-per-lead** | ~$20–60/lead | Matches Thumbtack's category average. Only once you have real lead volume. |

Note the market signal: **Ask-An-Agent, an AU agent marketplace, retired in June 2025.** This niche is not a guaranteed win — which is *exactly* why it's parked behind the community. Don't invest here until the community is sending it traffic.

---

## The gaps — what's missing to make it launchable

| # | Gap | Sev | Effort |
|---|---|---|---|
| M1 | **Legal sign-off + OMARA written OK** (lawyer review + email OMARA) | 🔴 | External lead time — start early |
| M2 | **OMARA-register seeder** (register-only, factual fields, "unclaimed" flag, source label) — does not exist yet | 🔴 | L |
| M3 | **Claim-your-profile flow** (business-email verify → agent edits their own opted-in content) | 🔴 | L |
| M4 | **Ownership auth** — right now any API-key holder can edit any profile; scope edits to the owner | 🔴 | M |
| M5 | **Non-affiliation disclaimer + source labels + collection notice** across all listing pages | 🟠 | S |
| M6 | **Lead capture** — replace raw `mailto:`/`tel:` with a tracked contact/enquiry object | 🟠 | M |
| M7 | **Email on apply/approve/reject** (the apply form promises a reply that never sends) | 🟠 | S |
| M8 | **OMARA number uniqueness** constraint + basic automated status check against the register | 🟠 | M |
| M9 | **Reviews + 7-day complaints/takedown process** (only if/when you add reviews) | 🟡 | L |
| M10 | **Un-hide** `/find-consultants` (remove the redirect) — last, only when the above are true | 🟠 | S |

---

## The plan — three stages, gated on the community shipping first

### Stage 0 — Paperwork (can run in the background NOW, in parallel)
- [ ] **M1** Brief a lawyer; email OMARA in writing. This has a lead time; start it while you finish the community.

### Stage 1 — Make it fillable & legitimate (once community MVP ships)
- [ ] **M2** Build the register-only seeder (factual fields, unclaimed, labelled).
- [ ] **M3** Build claim-to-verify.
- [ ] **M4** Fix ownership auth.
- [ ] **M5** Disclaimers + collection notice + source labels everywhere.

### Stage 2 — Make it useful & turn it on
- [ ] **M6** Lead capture (tracked enquiries — this is what you'll eventually charge for).
- [ ] **M7 / M8** Notifications + OMARA-number integrity.
- [ ] **M10** Remove the redirect. Soft-launch to community traffic.
- [ ] Monetisation later (featured tier first), only once lead volume is real.

---

## Definition of Done (Marketplace v1)

- ☐ Lawyer sign-off obtained; OMARA contacted in writing (reply on file)
- ☐ Directory seeded from the register as clearly-labelled unclaimed listings
- ☐ Agents can claim + verify their own listing; only they can edit it
- ☐ Non-affiliation disclaimer + collection notice + correction/opt-out on every page
- ☐ A tracked lead is captured when an applicant contacts an agent
- ☐ `/find-consultants` is live and reachable

**Until Community's Definition of Done is 100% ticked, this stays parked — except Stage 0, which is just email and lawyering and should start now.**
