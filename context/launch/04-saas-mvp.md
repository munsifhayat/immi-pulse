# 04 · SaaS MVP — Consultant Console + Client Portal

_Parked as "pilot-only." Keep the one pilot warm; don't rebuild. The full push comes after the community funnel is feeding it. — Product owner_

**Status:** ~70% built. The hardest part (AI enquiry→case→documents) is real. Blocked on revenue and a few honesty gaps.

**Two surfaces:**
- **Consultant console** — for OMARA-registered agents (the paying customer).
- **Client portal** — for the applicant (the agent's client).

---

## What "MVP" means here (the finish line)

**One migration agent can run one real client end-to-end, get paid for it, and never need you to hand-hold.** That's it. Not "feature parity with Docketwise." Not "auto-file with DHA." One agent, one client, money collected, zero founder intervention. If a pilot agent can do that, you have a sellable product.

Three tests:
1. **Complete** — enquiry → pre-case → letter → sign → **payment** → case → docs → a clear "lodgement-ready" handoff, with no fake steps in the middle.
2. **Paid** — real money actually changes hands (subscription and/or client fee).
3. **Self-serve** — the agent connects their own email and onboards without you.

Today #1 breaks at payment and lodgement, #2 doesn't exist, #3 needs the email-connect screen wired.

---

## What WINS the scope (why an agent would switch)

The Australian B2B immigration software market is basically **one legacy incumbent (Migration Manager) with zero AI.** Every AI-native competitor is US-only. Your edge is specific:

1. **AI does the boring triage.** Email lands → it's classified to a visa subclass, a pre-case is drafted, an outcome is suggested. The agent reviews instead of types. This is real in your code today.
2. **AI document validation.** Flags the expiring passport, the low IELTS, the name mismatch — before the agent does. Real today.
3. **Human-in-the-loop, always.** AI suggests and flags; the consultant confirms every critical decision, and every automated step has a manual override. This is the right posture for a field where an error is life-changing — and it's a *selling point*, not a limitation.
4. **A client portal that isn't terrible.** The research found every incumbent's client portal has bad reviews — "the bar is extremely low." Yours is account-based and clean. Easy win.

**Anti-scope (do NOT build for pilot MVP):** DHA/ImmiAccount form auto-fill, multi-country, team/seat management depth, advanced analytics. The form auto-fill especially — see the honesty note below.

---

## The honesty decision you have to make: lodgement automation

Your pitch narrative includes "collect once → auto-fill DHA forms (80/1221/956)." **That feature does not exist in the product** — it's a static HTML demo only. The case's "lodgement" step is just a manual date field.

You have two honest choices. Pick one and stop straddling:

- **(A) Scope it OUT of MVP (recommended).** Position v1 as "everything up to a lodgement-ready, fully-assembled case." The agent still lodges in ImmiAccount themselves. This is truthful, still hugely valuable, and shippable now. Auto-fill becomes a post-launch headline feature.
- **(B) Build a thin slice.** Pick *one* form (e.g. Form 80), auto-fill it from collected data, output a PDF the agent checks and submits. This is a real project (weeks), not a checkbox.

**Recommendation: (A).** Don't let the shiniest, hardest feature block the launch of the 70% that works. Ship truth. Add auto-fill as the marquee v2 feature once you have paying pilots asking for it.

---

## The gaps — what's missing to make it a credible paid product

| # | Gap | Sev | Effort | Note |
|---|---|---|---|---|
| S1 | **No real money moves** — wire a payment gateway (Stripe or PayID/BECS) into client payments **and** the platform's own subscription | 🔴 | L | The #1 blocker for a *paid* product. |
| S2 | **`/dashboard/activity` + `/dashboard/documents` are mock — but the real backend already exists** | 🟠 | S | **Cheapest wins in the whole audit.** Swap the mock import for the real service that's sitting right next to it, unused. |
| S3 | **Fake "email portal link to client"** — logs "pretending to email…" and claims success | 🟠 | S | Either wire the real send or remove the false "sent" claim. Trust bug. |
| S4 | **Two parallel client portals** not integrated (per-case token vs account-based) | 🟠 | M | Unify on the account-based one so the client experience is consistent. |
| S5 | **No self-serve email connection** — real MS 365 OAuth exists in backend, no frontend for it (settings screen is a mock toggle) | 🟠 | M | Blocks self-serve onboarding. Wire the real flow. |
| S6 | **E-sign produces no downloadable signed PDF** — audit trail only | 🟡 | M | Agents need a "signed engagement letter.pdf" to hand client/DHA. |
| S7 | **Orphaned mock "journey/new" wizard** duplicates the real case workspace | 🟡 | S | Delete it. Dead, confusing surface. |
| S8 | **Doc drift** — CLAUDE.md says AWS Bedrock; it's actually OpenAI via Strands | 🟡 | S | Fix the docs so nobody reasons from a false premise about cost/compliance. |
| S9 | **Decide the fate of the mock "checkpoints" Stripe module** (unreachable component) | 🟡 | S | Keep-and-wire or delete. Don't leave a fake payment path lying around. |

---

## The plan — pilot-warm now, full push later

### Phase A — Keep the pilot warm & kill the lies (small, do it soon, in the background)
The goal: the pilot agent never hits a fake step.
- [ ] **S2** Wire the two mock screens to their existing real backends. (Half a day; instant credibility.)
- [ ] **S3** Kill the fake portal-link email (send it for real, or stop claiming it sent).
- [ ] **S7 / S8 / S9** Delete the orphaned wizard, fix the Bedrock→OpenAI docs, resolve the fake checkpoints module.
- **Definition of done:** a demo has no embarrassing fake steps.

### Phase B — Make it paid & complete (the real push — AFTER community launch)
The goal: money moves, the chain is unbroken.
- [ ] **S1** Payment gateway — client fees first (that's where real money is), then platform subscription.
- [ ] **S4** Unify the client portal.
- [ ] **S5** Self-serve email connect.
- [ ] **S6** Signed-PDF artifact.
- [ ] Decide lodgement automation per the honesty note (recommend: scope out, label clearly).
- **Definition of done:** one agent runs one client end-to-end and gets paid, unassisted.

### Phase C — Sell it
- [ ] Pilot → 3–5 paying agents → pricing ($99–199/agent/mo, undercutting Docketwise's $69–109 by *adding* AI) → onboarding flow → grow.

---

## Definition of Done (SaaS pilot-MVP)

- ☐ No fake/mock steps remain in the console or portal
- ☐ A real client payment can be collected (gateway live)
- ☐ Platform subscription can actually be purchased
- ☐ One client portal experience, consistent regardless of entry point
- ☐ An agent can connect their own mailbox without founder help
- ☐ A signed engagement letter can be downloaded as a PDF
- ☐ Lodgement position is honest (either real auto-fill, or clearly "you lodge in ImmiAccount")
- ☐ A pilot agent runs a full real case with zero hand-holding

**This is horizon 3. Phase A (the small honesty fixes) can happen anytime. Phase B waits until Community has shipped and is sending you agent-curious traffic.**
