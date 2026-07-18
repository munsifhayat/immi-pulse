# 02 · Community MVP — The Focus Module

_This is the one you finish first. Everything else is parked until this ships. — Product owner_

**Live today at:** `/community` (immi-pulse-fe.vercel.app/community)
**Status:** ~90% built · core works · Sprint 1 (safe to open the doors) DONE + SEO shipped. One red blocker left: real accounts (C2).

> **Progress — 2026-07-18 (built + verified locally, not yet deployed):**
> - **C1 done** — report control on every post + comment; backend Hide/Remove now actually acts on journeys and journey-comments and suppresses a removed timeline from the stats; moderation queue shows the reported content. Verified end-to-end (22-check e2e: report → remove → gone from feed + stats).
> - **C7 done** — `/community/admin/*` now requires an owner/admin JWT, not the public key. e2e confirms the public key alone is rejected.
> - **C6 done** — legacy spaces/threads forum surface removed (routes + endpoints deleted; the dormant tables were left in place, not dropped).
> - **C3 done** — per-page metadata + Open Graph on `/community` and a new server-rendered, indexable per-timeline page (`/community/journey/[id]`) with dynamic titles ("Subclass 482 timeline: 95 days waiting"), JSON-LD, plus `sitemap.xml` (lists every timeline) and `robots.txt`.
> - **C5 done** — added a server-side ip-hash backstop so clearing localStorage can't infinitely reset the one-timeline cap.
> - **Still open:** C2 (real accounts — needs a product decision, see note under the gap), C4 (reply notifications), C8 (deploy to prod).

---

## The wedge, in one sentence

> **"Is my wait normal?"** — the verified, structured, anonymous place where Australian visa applicants share real timelines and instantly see where they sit against everyone else on the same subclass.

There is no "Lawfully for Australia." Reddit is unstructured, Facebook is scam-ridden, MyImmiTracker's AU coverage is thin, and the legacy forums are dying. That gap is the whole opportunity. You already built the engine that fills it. Now finish it.

---

## What "MVP" means here (the finish line)

A **publicly launchable, safe, discoverable** community that a stranger can find on Google, use anonymously to answer "is my wait normal?", contribute their own timeline, and interact — without exposing you to legal or abuse risk.

Three tests it must pass:
1. **Safe** — someone can report a bad post and a moderator can actually remove it.
2. **Sticky** — someone can make an account and get told when they get a reply.
3. **Discoverable** — Google can index a timeline page so the community grows on its own.

If those three are true, you can put it in front of the world. Today, none of the three fully are.

---

## What WINS the scope (your unfair advantages — protect these)

These are the things competitors *can't* easily copy. Spend your energy here, not on generic forum features.

1. **Structured timelines + live percentile bands.** "You're at day 94; the median for 482 is 71; you're in the slower third." Reddit can never do this. This is the product.
2. **Honest data isolation.** Seeded/scraped samples never pollute the live stats. This integrity is a *feature* — lean into it ("stats built only from real, verified submissions").
3. **The s276 trust layer.** A community that *structurally* stays on the right side of Australia's unregistered-advice law ("share your timeline & official info ✓ / advise on someone's application ✗"), with an OMARA-verified agent tier as the only voice allowed to advise. This turns the #1 scam risk in the market into your #1 trust signal.
4. **Cohorts, not leaderboards.** You've already vetoed "fastest grant" rankings — correct. An anxious audience needs "you're normal," not "you're losing." Keep the veto.

**Anti-scope (do NOT build for MVP):** DMs, rich media, gamification/badges beyond the trust tier, mobile app, multi-country. All of it is a novelty trap. Say no.

---

## The gaps — what stands between you and launch

Severity: 🔴 blocker (can't launch) · 🟠 important (launch-week) · 🟡 fast-follow (first month).
Effort: S = <1 day · M = 1–3 days · L = ~1 week.

| # | Gap | Sev | Effort | Why it matters |
|---|---|---|---|---|
| C1 | **Report button missing on the live feed** + backend can't action a report against a journey/comment (moderation is a silent no-op) | 🔴 | M | Legal/safety. An immigration community with no working "remove" is not launchable. |
| C2 | **No real accounts** — link anonymous device → account (the `claim_identity` function exists but is never called) | 🔴 | M | Without accounts there's no retention, no notifications, no trust ladder. |
| C3 | **No SEO / page metadata / sitemap** on community & timeline pages | 🔴 | M | This is the growth engine. No index = no organic users = a ghost town. |
| C4 | **No reply notifications** (email or in-app) — the login prompt promises them | 🟠 | M | The core retention loop. "Someone replied to your timeline" is what brings people back. |
| C5 | **Spoofable anonymous identity** (clearing storage resets the 1-timeline cap) | 🟠 | S–M | Protects the integrity of the stats, which is your whole credibility. |
| C6 | **Legacy spaces/threads system** still deployed, writable, unmonitored | 🟠 | S | Delete it (recommended) or re-link + moderate it. Unmonitored write surface = spam/liability. |
| C7 | **Admin/moderation guarded only by the public API key** — no admin role | 🟠 | M | Anyone reading the frontend JS can moderate. Add a real admin gate. |
| C8 | **Deploy the harvester + 141-record dataset to production** (built, verified locally, not live) | 🟠 | S | Ship what you already built. Confirm prod == local. |
| C9 | **Cold-start / keep-alive plan** — how the feed stays alive at low volume | 🟡 | M | Scheduled sample surfacing, seeded questions, a "timeline of the week." |
| C10 | **Free-text search** across timelines/questions | 🟡 | M | Users will want "482 Sydney onshore" — the filter rail isn't enough. |
| C11 | **Mobile audit** of the 3-column feed (context rail vanishes on mobile) | 🟡 | S | Most of this audience is on a phone at 11pm, anxious. Get mobile right. |

---

## The plan — how to actually finish it

Three short sprints. **Do them in order. Don't skip to C10 because it's fun.**

### Sprint 1 — "Safe to open the doors" (the blockers) · ~1 week
The goal: nothing here can hurt you legally or reputationally.
- [x] **C1** Add a report/flag control to the live feed (post + comment), and fix the backend so "Hide/Remove" actually acts on a journey/journey-comment. Verify a real report → real removal end-to-end. _(Done 2026-07-18, verified via `tests/e2e_community_moderation.py`.)_
- [x] **C6** Delete (or re-link + moderate) the legacy spaces/threads system. _(Done — routes + API endpoints removed. Dormant DB tables left in place; drop later with a migration if desired.)_
- [x] **C7** Put a real admin-only gate on the moderation endpoints (not the public key). _(Done — owner/admin JWT required on `/community/admin/*`.)_
- [ ] **C8** Deploy the harvester + 141-record dataset. Confirm production state matches local. _(Still pending — deploy step.)_
- **Definition of done:** you can be legally comfortable with a stranger posting on it. → **Met** (bar C8 deploy).

### Sprint 2 — "Reasons to come back" (accounts + growth) · ~1–1.5 weeks
The goal: a visitor becomes a returning user, and Google starts sending traffic.
- [ ] **C2** Wire the anonymous→account claim (call `claim_identity`, stitch prior posts to the new account). **⚠ Needs a product decision first — see below.**
- [ ] **C4** Reply notifications — email at minimum ("someone replied to your timeline"), in-app badge if cheap. _(Resend is already configured in the backend — `RESEND_API_KEY` set — so the plumbing exists.)_
- [x] **C3** SEO — per-page metadata + Open Graph on `/community`, each timeline, each question; generate a sitemap. _(Done 2026-07-18 — indexable `/community/journey/[id]` pages with dynamic titles + JSON-LD, `sitemap.xml`, `robots.txt`.)_
- [x] **C5** Harden the identity cap (server-side binding beyond localStorage; keep it low-friction). _(Done — ip-hash backstop caps anonymous timelines per network; signing in lifts it.)_
- **Definition of done:** a first-time Google visitor can land on a timeline page, read it, sign up, post, and get emailed when someone replies.

> **C2 blocker — the decision to make:** `claim_identity(token, user_id)` exists and links an `AnonIdentity` to a `users` row, but there is **no self-serve applicant account** to claim into. The `users` table + `/get-started`/`/login` are the OMARA-consultant auth (they create an org + seat), and `ClientPortalAccount` is created by a consultant at Qualify (org-scoped). A community visitor belongs to no org. So C2 isn't a one-function wire-up — it needs a lightweight applicant account (email + password/magic-link, no org) whose `user_id` the anon identity claims into. Once that account type exists, the wiring is small: send `X-Device-Token` through signup and call `claim_identity` on success. **Decide the applicant-account model, then C2 + C4 fall out quickly.**

### Sprint 3 — "Feels alive" (polish + retention) · ~1 week
- [ ] **C9** Cold-start plan: schedule sample-surfacing, seed 10–15 good starter questions, add a weekly digest email.
- [ ] **C10** Free-text search.
- [ ] **C11** Mobile pass on the feed.
- **Definition of done:** open it on a phone at 11pm and it feels populated, searchable, and calm.

---

## Launch checklist (tick before you announce)

- [x] Report → remove works end-to-end (tested with a real bad post) _(e2e, 2026-07-18)_
- [ ] Anonymous → account works; posts carry over _(C2 — blocked on the account-model decision)_
- [ ] Reply notification email fires _(C4)_
- [~] A timeline page is indexed by Google (check `site:` after a few days) _(indexable pages + sitemap shipped; deploy, then check `site:`)_
- [x] Legacy thread surface deleted or moderated _(deleted)_
- [x] Admin gate is real _(owner/admin JWT)_
- [ ] Production == local (harvester + full dataset live) _(C8 — deploy)_
- [ ] Mobile is clean _(C11 — not audited this pass)_
- [x] `/community` has a clear "share your timeline" first-run for a total stranger
- [x] s276 guardrail copy is visible (what you can/can't post) _(reinforced — "misleading/unlicensed advice" is the first report reason)_

---

## How you'll know it worked (the one metric)

**North star: weekly active timeline-trackers** — people who come back each week to check their wait or update their milestones. Not signups, not pageviews. Returning trackers. Everything downstream (the marketplace lead, the SaaS account) is fed by this number.

Secondary, watch for launch: organic search impressions (SEO working), timelines submitted per week, report→resolution time.

---

**When every box above is ticked, and only then, open [`03-marketplace-mvp.md`](03-marketplace-mvp.md).**
