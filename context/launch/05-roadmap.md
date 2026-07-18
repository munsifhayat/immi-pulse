# 05 · The Unified Roadmap — One Path to Launch

_The whole plan on one page. Three horizons, in order. You work the top horizon only until it's done. — Product owner_

---

## The shape of it

```
        HORIZON 1                 HORIZON 2                HORIZON 3
        Community                 Marketplace              SaaS
        (~3–3.5 weeks)            (~3–4 weeks)             (ongoing)
   ┌───────────────────┐    ┌───────────────────┐   ┌───────────────────┐
   │ FINISH & LAUNCH   │ →  │ SEED LEGALLY &    │ → │ MONETISE THE      │
   │ the front door    │    │ TURN ON           │   │ funnel            │
   └───────────────────┘    └───────────────────┘   └───────────────────┘
        ▲ YOU ARE HERE
   ▶ Runs in the background from day 1: Marketplace paperwork (lawyer + OMARA email),
     and the small SaaS "kill the fake steps" fixes. Neither needs a build sprint.
```

**Why this order:** Community is your most-finished asset *and* your traffic engine. It's the front door — the marketplace and the SaaS are both rooms you can only sell once people are walking through that door. Ship from strength; feed the rest.

---

## Horizon 1 — Community (NOW) · ~3–3.5 weeks

**Mission:** make it safe, sticky, and discoverable, then launch it publicly.

| Sprint | What ships | DoD |
|---|---|---|
| 1 · Safe | Working report→remove, legacy surface removed, real admin gate, harvester deployed | Legally comfortable with strangers posting |
| 2 · Sticky + Found | Anonymous→account, reply notifications, SEO/sitemap, hardened identity | A Google visitor can land, sign up, post, get notified |
| 3 · Alive | Cold-start plan, search, mobile pass | Feels populated and calm on a phone at 11pm |

**Milestone: 🚀 PUBLIC LAUNCH of the community.** Announce it. This is your first real finish line — cross it.
_Full detail + checklist: [`02-community-mvp.md`](02-community-mvp.md)._

**⟶ Background track (start now, no sprint):** brief a lawyer + email OMARA re: the register (Horizon 2 has an external lead time you can't compress).

---

## Horizon 2 — Marketplace (NEXT) · ~3–4 weeks

**Gate to start:** Community's Definition of Done is 100% ticked **and** the lawyer/OMARA paperwork is back.

**Mission:** fill the (already-built) directory the legal way, and turn it on for community traffic.

| Stage | What ships |
|---|---|
| 1 · Legitimate | Register-only seeder (unclaimed, labelled), claim-to-verify, ownership auth, disclaimers + collection notice |
| 2 · Useful & on | Lead capture, apply/approve emails, OMARA-number integrity, remove the redirect, soft-launch |

**Milestone: 🚀 Directory live** — seeded, claimable, legally clean, reachable from the community.
_Full detail + the legal playbook: [`03-marketplace-mvp.md`](03-marketplace-mvp.md)._

---

## Horizon 3 — SaaS (LATER) · ongoing

**Gate to start the big push:** community is live and generating agent-curious traffic.

**Mission:** turn the working pipeline into a paid product, one pilot at a time.

| Phase | What ships |
|---|---|
| A · Honesty (do soon, small) | Wire the 2 mock screens to their real backends, kill the fake email, delete dead surfaces, fix docs |
| B · Paid & complete | Payment gateway, unified portal, self-serve email connect, signed-PDF, honest lodgement position |
| C · Sell | Pilot → 3–5 paying agents → pricing & onboarding |

**Milestone: 🚀 First paying agent** running a full real case unassisted.
_Full detail: [`04-saas-mvp.md`](04-saas-mvp.md)._

---

## The funnel this builds (why the sequence pays off)

```
Anxious applicant Googles "is 482 processing normal?"
        │  (SEO — Horizon 1)
        ▼
Lands on a community timeline page → checks their wait → posts their own
        │  (retention — Horizon 1)
        ▼
Reads "should I use an agent?" → browses the verified directory
        │  (Horizon 2)
        ▼
Contacts a verified agent → agent runs the case in the SaaS → gets paid
        │  (Horizon 3)
        ▼
Agent pays you for the software + the lead. Loop closes.
```

Every horizon feeds the next. That's why you don't build them in parallel — you build them in sequence, so each one's traffic de-risks the next.

---

## The Parking Lot (where shiny ideas go to wait, not to die)

When a new idea shows up mid-build, it goes **here**, and you go back to your list. Nothing here gets built until its horizon.

- Self-service lodgement / DHA form auto-fill ("Boundless for Australia") — **SaaS v2 headline feature**, after paying pilots ask for it
- Multi-country expansion (CA / US) — the data model already has country columns; **not before AU is winning**
- Consumer "Pulse+" subscription ($5–9/mo: predictions, document vault, premium stats) — after community has scale
- Reviews on agent profiles — needs the 7-day defamation safe-harbour first
- Push notifications / mobile app — after web retention is proven
- News/policy-change alerts hub — a real Horizon-2/3 SEO play, but not now
- _(add new ideas below, one line each, and get back to work)_

---

## Risk register (the five to watch)

| Risk | Mitigation |
|---|---|
| **Novelty loop pulls you off-task** | The Rule of One + this Parking Lot. Re-read [`00-START-HERE.md`](00-START-HERE.md) weekly. |
| **s276 unregistered-advice exposure** in the community | Working moderation (Horizon 1, blocker) + the "share info ✓ / advise ✗" guardrail + OMARA-verified-only advice tier. |
| **Marketplace legal misstep** (scraping/privacy/defamation) | The playbook in [`03-marketplace-mvp.md`](03-marketplace-mvp.md): register-only, unclaimed+claim, lawyer + OMARA sign-off before bulk seeding. |
| **DHA's 2026 ImmiAccount tracking** commoditises single-app tracking | Your edge is *peer comparison + community + skilled-visa cohorts*, which the govt tool doesn't do. Lean into cohorts. |
| **Marketplace demand unproven** (Ask-An-Agent retired 2025) | It's parked behind the community precisely so it launches *into* existing traffic, not cold. |

---

## The only instruction that matters

**Finish Horizon 1. Then read Horizon 2. Not before.**

Open [`launch-command-center.html`](launch-command-center.html) in a browser to see all of this — plus mockups of how each product looks — in one visual place.
