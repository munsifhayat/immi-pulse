# IMMI-PULSE Product Vision & Strategy

**Date:** April 2026

---

## What Is IMMI-PULSE?

**The Superapp for Immigration** — a unified platform that combines AI-powered consultant tools, visa tracking, community, and immigration news into one experience. Starting with Australia, expanding to Canada and the US.

Think: Lawfully's tracking + Reddit's community + CIC News' updates + Docketwise's consultant tools — all in one.

---

## The Four Pillars

| Pillar | Who | What | Revenue Model |
|--------|-----|------|--------------|
| **Consultant Tools** (B2B) | Immigration lawyers, OMARA agents | AI workflow automation — intake, classify, checklist, doc review | SaaS subscription |
| **Community** (B2C) | Visa applicants | Share timelines, experiences, ask questions, connect with peers | Free (engagement driver) |
| **News & Updates** (B2C) | Everyone | Policy changes, processing times, regulation updates — aggregated | Free / Premium alerts |
| **Self-Service** (B2C) | DIY applicants | Guided visa lodgement, or connect with consultant if stuck | Per-application fee |

### Why Each Pillar Feeds the Others
- Consultants get **clients from the community**
- Applicants get **trusted professionals** through the platform
- News keeps **everyone engaged** and coming back
- Self-service captures people who **can't afford a consultant** but still need help

---

## Recommended Phasing

### Phase 1 — Consultant Tools (B2B Revenue Engine)

**Why start here:**
- Revenue from day one (B2B SaaS)
- Zero AI competition in Australia (Migration Manager is legacy)
- ~7,000 OMARA-registered agents as target market
- Existing codebase (email processing, AI agents, document handling) provides a head start

**Core features:**
1. **Email intake processing** — Client emails arrive, AI extracts case details
2. **Visa type classification** — AI suggests appropriate visa subclass(es) with consultant override
3. **Prerequisite checklist engine** — Database of requirements per visa subclass, auto-generated for each case
4. **Document upload + AI validation** — OCR + AI reviews documents for:
   - Passport validity (needs 12+ months)
   - Correct issuing authority (e.g., AFP vs. state police)
   - Name consistency across documents
   - Document completeness and quality
   - Skills assessment body matching for nominated occupation
5. **Case dashboard** — Consultant view of all active cases with status, next steps, alerts
6. **Client portal** — Modern, mobile-first experience for applicants to upload docs, check status, receive updates

**Target pricing:** $99-199/agent/month (undercuts Docketwise at $69-109 while providing AI capabilities)

### Phase 2 — Visa Tracker + News Hub (B2C Traffic Magnet)

**Why second:**
- Relatively lightweight to build
- Massive SEO potential (immigration processing times = high search volume)
- Starts attracting B2C traffic at scale
- Creates engagement loop that feeds community (Phase 3)

**Core features:**
1. **Crowdsourced visa timelines** — Better UX than ImmiTracker, mobile-first
2. **Processing time dashboard** — Official DHA data + crowdsourced + AI predictions, all normalized
3. **Push notifications** — Visa round results, processing time changes, policy updates
4. **Immigration news aggregator** — Curated from DHA, SBS, VisaEnvoy, Migration Alliance, etc.
5. **Personalized feed** — Based on your visa type, nationality, and stage in the process

### Phase 3 — Community (B2C Engagement + Retention)

**Why third:**
- Needs critical mass of users (from Phase 2 traffic) to work
- Consultants (from Phase 1) bring their clients, seeding the community
- Solves the Facebook/Reddit problem with better structure

**Core features:**
1. **Verified badges** — Licensed agent, successful applicant, general user
2. **Visa-type-specific spaces** — Not one giant forum; subclass-specific threads
3. **Integrated timelines** — Share your visa journey without leaving the platform
4. **Anti-spam by design** — Agent marketing separated from genuine community discussion
5. **Q&A format** — Best answers rise to top (Stack Overflow model, not chronological forum)
6. **Consultant directory** — Connect with verified agents directly (lead gen for Phase 1 users)

### Phase 4 — Self-Service Lodgement (B2C Scale Play)

**Why last:**
- Hardest to get right (compliance, liability, accuracy)
- Needs the visa knowledge base, document validation, and user trust from earlier phases
- This is the "Boundless for Australia" play

**Core features:**
1. **Guided visa application** — Step-by-step wizard for straightforward visa types
2. **AI-powered eligibility check** — Input your profile, get ranked visa options
3. **Document preparation** — AI helps prepare and validate before submission
4. **Escalation to consultant** — If case is complex, seamlessly connect with a platform consultant
5. **Per-application pricing** — $199-499 per application (vs. $3,000-5,000 for a consultant)

---

## Target Market — Australia First

### Why Australia?
- Visa subclasses are well-defined and numbered (482, 189, 190, 491, 500, 820/801, etc.)
- Requirements per subclass are publicly documented on Department of Home Affairs site
- Consultant market is regulated (OMARA-registered agents) — professionals who pay for tooling
- Document requirements are specific and standardized (AFP checks, skills assessments, English tests, health exams)
- Zero AI competition in this market
- Existing codebase was built with Australian context

### Market Size
- ~7,000 OMARA-registered migration agents
- ~500,000+ visa applications per year
- Immigration consulting market growing at 5.73% CAGR

### Key Visa Subclasses to Support First
| Subclass | Name | Volume | Complexity |
|----------|------|--------|-----------|
| 482 | Temporary Skill Shortage | Very High | Medium |
| 186 | Employer Nomination Scheme | High | High |
| 189 | Skilled Independent | High | Medium |
| 190 | Skilled Nominated | High | Medium |
| 491 | Skilled Work Regional | Medium | Medium |
| 500 | Student | Very High | Low |
| 820/801 | Partner | High | High |
| 600 | Visitor | Very High | Low |

---

## Competitive Positioning

### vs. Migration Manager (AU incumbent)
- **They:** Legacy desktop, no AI, 20+ year old architecture
- **We:** AI-native, cloud-first, modern UX, document intelligence

### vs. US AI Startups (Parley, Visalaw.ai, etc.)
- **They:** US immigration only, narrow focus (petition drafting, H-1B)
- **We:** Australian immigration (uncontested), full workflow, multi-jurisdiction roadmap

### vs. ImmiTracker (community/tracker)
- **They:** Crowdsourced data, limited social, web-only, dated UI
- **We:** Community + tracker + consultant tools + AI — all integrated, mobile-first

### vs. Reddit/Facebook Groups
- **They:** Unstructured, unverified, spam-filled, no tools
- **We:** Verified badges, visa-specific spaces, integrated tracking, anti-spam, searchable

---

## Revenue Projections (Illustrative)

### Phase 1 — B2B SaaS
- 500 agents × $149/mo avg = **$893K ARR** (Year 1 target)
- 1,500 agents × $149/mo = **$2.7M ARR** (Year 2)

### Phase 2-3 — B2C Premium
- Freemium tracker + premium alerts: $4.99/mo
- 10,000 premium users = **$600K ARR**

### Phase 4 — Self-Service
- 2,000 applications/year × $299 avg = **$598K ARR**

### Combined Year 3 Target: **$4-5M ARR**

---

## Key Risks

1. **Regulatory complexity** — Immigration law changes frequently; keeping the AI and checklist database current is ongoing work
2. **Trust** — Immigration is high-stakes; any AI error could have life-changing consequences for applicants. Human-in-the-loop is essential
3. **Migration Manager lock-in** — Switching costs for established agents may be high (data migration, workflow retraining)
4. **Government portal changes** — DHA's March 2026 ImmiAccount overhaul adds official tracking, potentially reducing demand for third-party trackers
5. **Liability** — Self-service lodgement (Phase 4) has legal implications; need clear disclaimers and potentially legal counsel partnership
