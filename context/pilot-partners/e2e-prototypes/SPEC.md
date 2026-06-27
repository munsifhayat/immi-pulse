# IMMI-PULSE — End-to-End Demo Prototypes — MASTER SPEC

> This is the shared spec for THREE clickable HTML prototypes that demonstrate the
> complete IMMI-PULSE journey for an Australian immigration agent: **inquiry → consult →
> visa pathway → engagement → case → checklist → document collection → AI verification →
> government-form auto-fill → lodgement bundle.**
>
> All three prototypes use the SAME scenario, cast, and mock data so a migration agent can
> compare three different PRODUCT PHILOSOPHIES on identical content. Each prototype is a
> single self-contained `.html` file, fully clickable end-to-end with mock data, no build step,
> opens via `file://`. This is for a high-stakes demo to real OMARA-registered migration agents.

---

## 0. The product in one line

IMMI-PULSE is an AI-powered operating system for Australian immigration consultants. It turns a
flood of fragmented inquiries into qualified cases, collects each client's information and
documents **once**, and then **auto-fills the long, repetitive Department of Home Affairs forms**
(Form 80, Form 1221, Form 956, nomination forms) so the agent verifies instead of types — ending
with a complete, checked bundle ready to lodge in ImmiAccount.

The founding pain (real, from pilot agent Gideon): a 482 visa holder messaged on WhatsApp from a
+91 number; the agent assumed low-value and let it sit for a WEEK. It turned out to be a high-value
employer-sponsored PR case. The product's first promise: **never lose a good lead, and never type
the same answer twice.**

---

## 1. The cast & scenario (identical across all three prototypes)

**The firm / agent (the user of the product):**
- Firm: **Meridian Migration Co.** (Brisbane)
- Agent: **Gideon Maris**, Registered Migration Agent, **MARN 1789456** (OMARA-registered)
- Tagline used on client-facing surfaces: *"Tell us your story. We'll tell you what's possible."*

**The hero client (the worked example that runs end-to-end):**
- **Priya Sharma**, 34, Electrical Engineer
- Currently in **Brisbane, Australia**, holding a **Subclass 482 (Skills in Demand)** visa
- Sponsored by employer **BrightGrid Energy Pty Ltd** (Standard Business Sponsor)
- Goal: **Permanent Residency via Subclass 186 (Employer Nomination Scheme), Temporary Residence
  Transition stream** — AND bring her spouse **Arjun Sharma** as a subsequent entrant.
- First contact channel: **WhatsApp**, from a **+91** number (echoes the real founding story)
- Email: priya.sharma@email.com · Phone: +91 98xxx (mobile), AU mobile +61 4xx xxx 111

**Other inquiries in the inbox (for realism — these stay as list items, don't need to be deep):**
- **Marco Rossi** — Partner visa (Subclass 820/801), onshore, partner is an Australian citizen
  (Emma Clarke). Came via website form.
- **Lena Müller** — Student visa (Subclass 500) extension inquiry, via Instagram DM. (Lower priority.)
- **BrightGrid Energy (HR: Tom Whitlam)** — employer wanting to sponsor 2 more engineers, via email.
  (Employers don't fill forms — phone-first.)
- **"+1 415…" unknown** — vague "how much for PR?" via WhatsApp. (Likely low-fit / spam-ish.)

**Mock financials for the engagement (use consistently):**
- Professional fee: **$3,500 AUD**
- Disbursements (govt charges, skills assessment, etc.): **$540 AUD**
- Retainer payable now: **$1,500 AUD**
- Total cost agreement: **$4,040 AUD** (GST inclusive where shown)
- Deposit recorded via: **Bank transfer / PayID** (manual payment — no card processing in product yet)

---

## 2. Australian immigration facts to get RIGHT (credibility matters — agents will notice errors)

- **Subclass 482 "Skills in Demand" (SID)** replaced the old TSS. Three streams:
  **Core Skills** (income threshold ~AUD $76,515), **Specialist Skills** (~AUD $141,210),
  **Labour Agreement**. Requires employer sponsorship + 12 months relevant experience in last 5 years.
  4-year validity. Priya is **Core Skills stream**.
- **The 482 process is THREE linked applications**: (1) **Sponsorship** (employer = Standard Business
  Sponsor), (2) **Nomination** (the specific position), (3) **Visa application** (the worker). Agents
  act for both the sponsor and the applicant. Priya's employer is already a sponsor; her PR step is the
  **186 ENS** nomination + visa.
- **186 ENS, Temporary Residence Transition (TRT) stream**: PR after 2 years of full-time sponsored work
  in the same occupation on the 482. This is Priya's pathway.
- **The long government forms** the product auto-fills (this is the hero):
  - **Form 956** — Appointment of a registered migration agent (agent's MARN, applicant details, declaration).
  - **Form 80** — Personal particulars for character assessment (~18 pages: every residential address for
    the last 10 years, all international travel, full employment history, all family members, military service).
  - **Form 1221** — Additional personal particulars (supplements Form 80: travel, employment, education, family).
  - **Nomination form (186/482)** — position details, salary, employer details.
  - (Subsequent entrant / spouse Arjun → partner-style evidence + his own Form 80/1221.)
- **Document checklist for Priya's 186 ENS** (group these in the checklist screen):
  - *Identity*: passport (Priya + Arjun), birth certificate, national ID, marriage certificate
  - *Skills & qualifications*: skills assessment (Engineers Australia), degree + transcripts, CV
  - *Employment*: employment contract with BrightGrid, payslips, employment reference letters, position description
  - *English*: PTE Academic / IELTS test results
  - *Character*: AFP (Australian Federal Police) check + Indian PCC (police clearance certificate)
  - *Health*: HAP ID (Bupa medicals)
  - *Sponsor/Nomination*: BrightGrid nomination, organisation financials, position description
- **Lodgement** happens in **ImmiAccount** (DHA's online portal). The agent manages it on the client's
  behalf. Documents must be clear colour PDFs/JPGs; non-English documents need certified translations.
- **OMARA Code of Conduct**: agent must give a written costs agreement BEFORE doing paid work, and provide
  the Consumer Guide. No checklist/work product released before the costs agreement is signed + deposit paid.
  (This is why "Open case" is gated behind the signed engagement letter.)
- Use real, accurate terminology: ANZSCO occupation code, EOI/SkillSelect (for points-tested visas — not
  Priya's path but mention for the visa picker), nomination, sponsorship, subsequent entrant, bridging visa,
  Department of Home Affairs ("the Department").

---

## 3. Mock data for the form auto-fill HERO moment (use these exact values so all 3 match)

When showing Form 80 / Form 1221 auto-filling, populate from this "single source of truth" record. The
whole point: **each field shows WHERE it came from** (passport scan, intake form, employment reference,
skills assessment) — data collected once, reused everywhere.

```
Priya Sharma — single source of truth
  Family name:            SHARMA                     [from: passport scan]
  Given names:            PRIYA                       [from: passport scan]
  Sex:                    Female                      [from: passport scan]
  Date of birth:          14 March 1991               [from: passport scan]
  Place of birth:         Pune, Maharashtra, India    [from: passport scan]
  Country of birth:       India                       [from: passport scan]
  Passport number:        Z4123877                    [from: passport scan]
  Passport issue:         02 Jun 2021, New Delhi      [from: passport scan]
  Passport expiry:        01 Jun 2031                 [from: passport scan]
  Nationality:            Indian                      [from: passport scan]
  Current address:        14/88 Boundary St, West End, QLD 4101  [from: intake form]
  Address (2019–2022):    23 MG Road, Pune, India     [from: Form 1221 questions]
  Phone (AU):             +61 4xx xxx 111             [from: intake form]
  Email:                  priya.sharma@email.com      [from: intake form]
  Occupation:             Electrical Engineer (ANZSCO 233311)  [from: skills assessment]
  Current employer:       BrightGrid Energy Pty Ltd   [from: employment reference]
  Employment start:       18 July 2022                [from: employment contract]
  Current visa:           Subclass 482 (Skills in Demand)  [from: VEVO / intake]
  Skills assessment:      Engineers Australia — Positive, 09 May 2022  [from: skills assessment doc]
  English test:           PTE Academic — Overall 79, 12 Feb 2025  [from: PTE result]
  Spouse:                 Arjun Sharma (subsequent entrant)  [from: intake form]
  Marriage date:          22 November 2018, Pune       [from: marriage certificate]
```

**Form 80 auto-fill demo numbers (use consistently):** "Form 80 — 52 fields · 47 auto-filled from your
documents · 5 need Priya to confirm." Form 1221: "38 fields · 34 auto-filled · 4 to confirm." The 5
"need to confirm" items for Form 80 are good to name: (1) 10-year address history gap 2016–2019,
(2) any military service (No), (3) name spelling variations on documents, (4) details of any previous
visa refusals (None), (5) overseas police check reference number.

**Verification flags to show (AI document checks):**
- ✅ Passport valid — expires 01 Jun 2031 (>6 months, OK)
- ✅ Name matches across passport, skills assessment, PTE result
- ⚠️ AFP police check — issued 14 months ago; **must be < 12 months at lodgement → request a fresh one**
- ⚠️ Indian PCC — not yet uploaded (required for character)
- ✅ PTE Overall 79 — meets Competent+ English
- ✅ Skills assessment — Engineers Australia, Positive, valid 3 years
- ℹ️ Marriage certificate — non-English; **certified translation required**

---

## 4. The 9-stage END-TO-END SPINE (every prototype must let you click through all 9)

Each prototype renders these nine stages through its own paradigm, but the CONTENT/data is the same.
Make every stage reachable by clicking (a stepper, sidebar, "next" buttons, or the paradigm's nav).

1. **Inbox / Intake** — Fragmented inquiries unified into one inbox (WhatsApp, email, Instagram, web form
   shown as channel badges). Priya's WhatsApp +91 inquiry is the highlight, with an AI one-line summary +
   a **match score** ("482 holder, Brisbane, electrical engineer, employer-backed PR — strong fit, urgent").
   The first triage signal: country/visa status captured up front.

2. **Qualify + Consultation** — Open Priya's inquiry. Choose a **consultation mode**: *Virtual meeting* /
   *Phone call* / *In-person* / *Async (no consult — qualify on the form)*. Capture consult notes. Confirm
   the **visa pathway**: 482 (Core Skills) → **186 ENS (TRT)** PR, + spouse subsequent entrant. Click
   **Qualify** → this CREATES the client's portal account (show the "client access" credential card:
   email + temp password + copy + a ready-to-paste WhatsApp share message). "No PINs — one login."

3. **Engagement letter** — A costs agreement (scope, the fee lines from §1, OMARA compliance note). Show
   **native e-sign** (type-or-draw signature). Then **record the deposit** (manual: bank transfer/PayID,
   amount, reference, received date → receipt). Manual overrides visible: "use my own letter", "mark
   signed manually", "waive deposit". The signed letter + deposit are the compliance gate.

4. **Open case** — The case file opens (case ref e.g. **MM-2026-0142**). Case header: client, visa pathway,
   stage, priority. A timeline shows "Qualified → portal account created → letter signed → deposit recorded
   → case opened". Portal account already exists (from qualify).

5. **Checklist** — Auto-generated document checklist for the **186 ENS** pathway (+ subsequent entrant),
   grouped as in §2 (Identity / Skills / Employment / English / Character / Health / Sponsor-Nomination).
   Each item shows status (required, requested, uploaded, verified). Agent can add/remove items
   (checklists are agent-editable). One click "Send checklist to Priya's portal".

6. **Document collection (client portal side)** — The CLIENT's view: a friendly portal where Priya uploads
   documents against the checklist. Show progress (e.g. 11 of 16 uploaded). Show a few uploaded with
   thumbnails/file chips (passport.pdf, EngineersAustralia_SkillsAssessment.pdf, PTE_result.pdf,
   employment_reference_BrightGrid.pdf). This is where "collect once" begins.

7. **Verification** — AI extraction + validation of uploaded documents. Show the §3 verification flags
   (green/amber/info). Agent reviews and approves, or requests fixes (e.g. "request fresh AFP check",
   "request certified translation of marriage certificate"). Show extracted fields appearing in the
   single-source-of-truth record.

8. **Government-form AUTO-FILL — THE HERO** — The product takes the collected data + extracted document
   fields and **pre-fills the long DHA forms**: Form 956, Form 80, Form 1221, the 186 nomination. Show
   Form 80 mostly filled ("47 of 52 fields auto-filled — 5 need Priya to confirm"), with each filled field
   tagged by SOURCE (passport scan, intake, employment ref). The 5 gaps get asked to Priya in **plain
   language in her portal** ("We need your address from 2016–2019" — not "Form 80 Part C Q22"). The agent
   **receives the completed form to verify field-by-field** and approve. Emphasise: the client never sees
   "Form 80"; they answer human questions; the agent verifies a finished form. THIS is the time-saver.

9. **Lodgement bundle** — A complete, verified package: all forms (956, 80×2, 1221×2, nomination) +
   all documents, organised exactly the way ImmiAccount expects, every item green-checked. A final
   pre-lodgement review. Button: **"Lodge with Department of Home Affairs (ImmiAccount)"** → success state
   → post-lodgement tracking (application ID, status "Received — assessment in progress", next steps).
   Include the manual-override reality: the agent can export the bundle and lodge manually too.

---

## 5. Design tokens (shared brand — each prototype skins differently but stays in family)

Brand palette (CSS variables):
```
--navy:        #101928   /* primary dark, text, agent console */
--navy-2:      #1E293B   /* secondary dark */
--purple:      #7A5AF8   /* primary accent */
--purple-deep: #3E1C96   /* dark accent, gradients */
--purple-lite: #BDB4FE   /* light accent */
--purple-mute: #D9D6FE   /* wash */
--teal:        #1B7B6F   /* success / secondary */
--teal-lite:   #2DD4BF   /* success light */
--gray-text:   #475367   /* body text */
--gray-lite:   #F0F2F5   /* secondary bg */
--bg:          #FFFFFF
--amber:       #D97706   /* warning flags */
--rose:        #E11D48   /* error / disqualify */
```
Typography: **Outfit** for headings (Google Fonts), **Inter** for body (Google Fonts). Use `font-feature-settings:'tnum'` for numbers/tables.
Icons: **Lucide** via CDN (`https://unpkg.com/lucide@latest`) — clean stroke icons only. NO emoji as UI chrome.
Numbers/currency: AUD, e.g. `$3,500`. Dates: `14 Mar 2026` style.

Quality bar: generous whitespace (Apple-like breathing room), AA contrast (no grey under 4.5:1),
rounded-2xl cards with subtle shadows, smooth transitions, real hover/active states, tasteful motion
(fade/slide on screen change). It must look like a premium 2026 SaaS, not a wireframe.

---

## 6. Technical requirements (all three prototypes)

- **Single self-contained `.html` file.** Inline `<style>` and `<script>`. External CDN allowed ONLY for
  Google Fonts (Outfit, Inter) and Lucide icons. No frameworks, no build step.
- **Fully clickable end-to-end** with mock data. Use vanilla JS to switch between the 9 stage "screens"
  (e.g. `data-screen` panels toggled by a stepper / sidebar / next buttons). Every primary button advances
  or opens something — no dead ends. The user must be able to walk the ENTIRE journey by clicking.
- Include a persistent **stage indicator** so the audience always knows where they are in the 9-stage journey,
  and a way to jump between stages (for a live demo you don't want to be stuck going forward-only).
- Top of file: a small **"Approach X — <name>"** ribbon/label and a one-line description of the philosophy,
  so when the user opens it in a meeting it's self-identifying. Also a tiny "Demo · mock data" tag.
- Mobile-aware is a plus (the client portal screens especially) but desktop-first is fine; target ~1440px.
- No real network calls. No console errors. Opens by double-clicking the file.

---

## 7. What makes the THREE approaches DIFFERENT (the whole point of the exercise)

The spine is identical; the PARADIGM differs. Each agent builds ONE of these:

### Approach A — "Atelier Pipeline" — structured, agent-driven command center (CONTROL)
The consultant is the pilot. Explicit, gate-based pipeline. Left sidebar of pipeline stages; a case
workspace that is a calm, editorial **vertical guided timeline** extended all the way through forms and
lodgement. AI is a quiet helper in the margins (summaries, suggested checklist, flagged docs) — it never
takes the wheel. Everything is auditable and deterministic. This is the "safe, familiar, in-control"
option and the evolution of what's already built. Editorial "atelier/folio" aesthetic (eyebrows, thin
rules, serif accents), navy/purple/teal, lots of whitespace. The agent opens each government form, sees it
auto-filled, edits inline, marks verified. Lodgement is a checklist-style bundle the agent assembles.

### Approach B — "Pulse Copilot" — AI autopilot + human approval (AUTOMATION)
An AI migration clerk does the work; the consultant supervises an **approval queue**. Center of gravity is
a conversational **copilot** + a stream of "ready for your review" cards. The AI triages inquiries, drafts
the summary & match score, recommends the visa, drafts the engagement letter, builds the checklist, watches
documents arrive, extracts data, auto-fills Form 80/1221/nomination, flags inconsistencies, and hands the
consultant a finished artifact to **Approve / Edit / Decline**. Confidence meters, suggested next actions,
diff-style approvals. It feels like managing a tireless junior who "drafts but never sends/lodges without
you". Distinctly "AI product" skin: darker/inkier surface, electric violet glow, a "pulse" motif, chat dock.
Same data, but the agent REACTS and APPROVES rather than drives.

### Approach C — "Shared Case Room" — collaborative dual-portal, agent + client co-produce (COLLABORATION)
The case is a shared living workspace. Hero idea: **"collect once"** — the client answers friendly,
plain-language questions and uploads a passport ONCE, and the government forms (Form 80/1221/nomination)
**assemble themselves**; the agent verifies the same forms field-by-field in a mirrored view. Provide a
prominent **toggle between "Client view" and "Agent view" of the SAME case** so a meeting audience can flip
between what the client experiences (warm, friendly, no jargon, never sees "Form 80") and what the agent
receives (a finished, source-tagged, verifiable form). A shared "Information ledger" both sides see, showing
each fact captured once and everywhere it flows. Dual-tone: agent console = navy/purple; client portal =
warmer light + teal, friendlier. This is the most client-experience-led, transparency-first option.

---

## 8. Per-prototype deliverable

A single HTML file in `context/pilot-partners/e2e-prototypes/`:
- Approach A → `approach-1-atelier-pipeline.html`
- Approach B → `approach-2-pulse-copilot.html`
- Approach C → `approach-3-shared-case-room.html`

Each must walk all 9 spine stages with the Priya Sharma case, hit the form auto-fill hero hard, and be
visually distinct from the others while staying in the IMMI-PULSE brand family.
```
