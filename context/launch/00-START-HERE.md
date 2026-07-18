# IMMI-PULSE — Launch Plan

**Your product owner's note. Read this first. It is short on purpose.**

_Prepared 2026-07-18. Owner: Munsif. Role of this folder: turn three half-finished ideas into one launchable product._

---

## 1. The real problem isn't the product. It's the pattern.

You told me the truth up front: you start something, it excites you, it fades, you jump to the next thing. That's not a character flaw and it's not a disorder — it's the **novelty-over-completion loop**, and it's the single most common way good software dies. The dopamine is in *starting*. The value is only ever in *finishing*.

You don't beat it with motivation. You beat it with **constraints**. This whole folder is one constraint: a fixed, written scope you are not allowed to add to until the current thing ships.

Here is the rule I want you to actually follow:

> **The Rule of One.** One module is "in build" at a time. The other two are "parked" — not dead, not abandoned, just explicitly on a shelf with a written note about when to pick them back up. You are not allowed to open a parked module until the in-build one hits its Definition of Done.

That's it. If you internalise nothing else, internalise that.

---

## 2. What you actually have (this surprised me, and it should reassure you)

You have not been failing. You've been **building faster than you've been finishing**. The audit found:

- A **Community** module that genuinely works — the "is my wait normal?" engine, shareable visa timelines, votes, comments — live at `/community` today.
- A **Consultant SaaS** with a real, AI-powered enquiry→pre-case→case→documents pipeline. This is the hardest thing to build and it mostly *exists*.
- A **Marketplace** of migration agents that is **100% built and sitting behind a redirect**, hidden from the world.

Your problem is not "nothing is done." Your problem is "three things are each 70% done and none of them crossed the finish line." That's a *sequencing* problem, and sequencing is fixable in an afternoon of honesty. That's what this folder is.

---

## 3. The one decision that unlocks everything: sequence

You said the community matters most. I agree — and not just because you said so. The community is your **front door and your growth engine**: it's free, it's public, it answers a question every applicant is anxiously Googling ("is my wait normal?"), and every other part of the business (the agent marketplace, the SaaS) is downstream of the traffic it creates. Nail the front door and everything behind it gets easier to sell.

So the sequence is:

| Order | Module | Status now | This horizon's job |
|---|---|---|---|
| **1. NOW** | **Community** | In build | Finish it, make it safe & discoverable, **launch it publicly** |
| **2. NEXT** | **Marketplace** | Parked | Un-hide it, seed it the *legal* way, turn on when community has traffic |
| **3. LATER** | **SaaS** | Parked (pilot-only) | Keep the pilot warm; add revenue + polish once the funnel above feeds it |

This is deliberately **not** the order in your old planning docs (which put SaaS first). Reality overtook the plan — the community got built and deployed first, so we lead with our strongest, most-finished asset. Ship from strength.

---

## 4. Definition of Done — the finish line, written down

You cannot finish what you haven't defined. Here is the finish line for **Launch v1**. When these three are true, you have a launched product:

- ☐ **Community is publicly launchable & safe** — reporting/moderation actually works, there's a real login, and pages are indexable by Google. (Detail: [`02-community-mvp.md`](02-community-mvp.md))
- ☐ **Marketplace is either cleanly hidden or minimally shipped** — seeded from the OMARA register as unclaimed factual listings, with a claim-to-verify flow and the legal guardrails in place. (Detail: [`03-marketplace-mvp.md`](03-marketplace-mvp.md))
- ☐ **SaaS is pilot-ready** — one migration agent can run one real client end-to-end without you hand-holding, and can actually get paid. (Detail: [`04-saas-mvp.md`](04-saas-mvp.md))

Each module doc below has its **own** Definition of Done. Print them. Tick the boxes. Do not add new boxes.

---

## 5. How to use this folder

| File | What it's for |
|---|---|
| [`00-START-HERE.md`](00-START-HERE.md) | This note — the discipline and the sequence |
| [`01-where-we-are.md`](01-where-we-are.md) | Honest scorecard: what's built, what's fake, per module |
| [`02-community-mvp.md`](02-community-mvp.md) | **Focus module.** MVP, what wins, gaps, plan, launch checklist |
| [`03-marketplace-mvp.md`](03-marketplace-mvp.md) | MVP + the **legal way** to list agents (OMARA register), gaps, plan |
| [`04-saas-mvp.md`](04-saas-mvp.md) | MVP for consultant console + client portal, gaps, plan |
| [`05-roadmap.md`](05-roadmap.md) | The unified sequenced roadmap + parking lot + risks |
| [`launch-command-center.html`](launch-command-center.html) | **Open this in a browser.** Visual version of all of the above + mockups of how each product looks |

---

## 6. The operating rhythm (do this weekly, it's the whole trick)

1. **Open only the in-build module's doc.** This horizon, that's `02-community-mvp.md`. Ignore the others — they're parked.
2. **Pick the top unchecked item from its plan.** Not a new idea. The next item on the list.
3. **Ship it.** Deploy it. Tick the box.
4. **Repeat until that module's Definition of Done is 100% ticked.**
5. **Only then** move to the next module in the sequence.

When a shiny new idea shows up mid-week — and it will — you don't act on it. You write one line at the bottom of [`05-roadmap.md`](05-roadmap.md) in the **Parking Lot**, and you go back to the list. The idea is safe. It's captured. It is not allowed to derail the finish.

**Finishing is a skill. This folder is your reps. Let's go.**
