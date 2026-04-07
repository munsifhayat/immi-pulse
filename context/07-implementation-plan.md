# IMMI-PULSE: High-Level Implementation Plan

**Date:** April 2026
**Status:** Approved — Starting with Phase 0 (Public Product Site)

---

## Why This Plan

IMMI-PULSE is being pivoted from a property management email processing system (Property Pulse) into an AI-powered immigration consulting platform, starting with Australia. Market research revealed:

- **Zero AI competition** in Australian immigration tech (~7,000 OMARA agents using legacy tools like Migration Manager)
- **Every AI immigration startup is US-only** (Parley, Visalaw.ai, Gale, LegalOS)
- **The existing codebase transfers cleanly** — email ingestion, AI gateway, database, scheduling are domain-agnostic

**Goal:** First build the public-facing product site (the "front door"), then build the consultant dashboard behind it.

---

## Platform Architecture — Two-Sided Experience

The platform serves two audiences with completely separate UI/UX, from one Next.js app using route groups:

```
src/app/
├── (public)/              ← Public website (no auth required)
│   ├── page.tsx           ← Home / Landing
│   ├── for-consultants/   ← B2B value proposition
│   ├── for-applicants/    ← B2C value proposition
│   ├── features/          ← Platform features showcase
│   ├── pricing/           ← Plans or "Join Waitlist"
│   ├── about/             ← About / Contact
│   ├── get-started/       ← Role picker: consultant or applicant
│   ├── blog/              ← Placeholder for Phase 2 news
│   └── layout.tsx         ← Public navbar + footer
│
├── (console)/             ← Consultant dashboard (auth required)
│   ├── dashboard/         ← Overview, KPIs
│   ├── cases/             ← Case management
│   ├── documents/         ← Document review queue
│   ├── inbox/             ← Email inbox
│   ├── knowledge/         ← Visa subclass reference
│   ├── activity/          ← Activity log
│   ├── settings/          ← Consultant settings
│   └── layout.tsx         ← Sidebar + header (MeshBackground login)
│
├── (app)/                 ← Applicant experience (future, auth required)
│   └── ...                ← News, community, tracker, self-service
│
└── layout.tsx             ← Root (providers, fonts, theme)
```

**URL structure:**
- `immipulse.com/` → public landing
- `immipulse.com/for-consultants` → B2B page
- `immipulse.com/get-started` → role picker
- `immipulse.com/dashboard` → consultant dashboard (auth)

**Get Started flow:**
```
"Get Started" button
    ├── "I'm a Consultant/Lawyer" → Consultant sign-up → Console dashboard
    └── "I'm an Applicant" → Waitlist / Coming Soon (future: Google OAuth)
```

**Design tone:** Modern/startup (think Stripe, Linear) with warmth — sharp, AI-forward, but empathetic to the immigration journey.

---

## The Product Flow (Consultant Side)

```
Email arrives from client
       ↓
AI identifies potential visa type(s)
       ↓
System generates prerequisite checklist for that visa subclass
       ↓
Consultant reviews and confirms/adjusts
       ↓
Client receives checklist and uploads documents
       ↓
AI (OCR + analysis) reviews documents, flags issues:
  • Passport expiry < 12 months
  • Wrong document type (state police vs AFP)
  • Name mismatches across documents
  • Missing required documents
  • Skills assessment body mismatch
       ↓
Consultant reviews AI-flagged items
       ↓
Case progresses through stages → lodgement ready
```

---

## Core Domain Model

### Entity Overview

```
Organization (consulting firm)
  └── Consultant (OMARA agent)
        └── Case (central entity)
              ├── Client (visa applicant)
              ├── CaseVisa (linked visa subclass(es))
              ├── CaseEmail (linked emails)
              ├── CaseNote (consultant notes, AI observations)
              ├── Checklist
              │     └── ChecklistItem (one per requirement)
              │           └── Document (uploaded file)
              │                 └── DocumentValidation (AI check results)
              └── CaseStage (intake → assessment → checklist_sent → 
                             documents_collecting → documents_reviewing → 
                             lodgement_ready → lodged → granted/refused)
```

### Visa Knowledge Base

```
Country (Australia first, column exists for future expansion)
  └── VisaSubclass (482, 186, 189, 190, 491, 500, 820/801, 600)
        └── VisaRequirement (per subclass, per stream)
              └── DocumentType (passport, AFP check, skills assessment, etc.)
                    └── Validation rules (what AI checks when document uploaded)

SkillsAssessmentBody (maps ANZSCO occupation → assessing authority)
```

All entities use UUID primary keys, timezone-aware datetimes, JSONB for extensible metadata.

---

## Agent Architecture

### Existing → New Agent Mapping

The existing 4-agent + unified pipeline architecture maps remarkably well to immigration:

| Current Agent | New Agent | Role |
|---|---|---|
| `agents/invoice/` | **`agents/intake/`** | Email intake, case matching, new inquiry detection |
| `agents/p1_classifier/` | **`agents/visa_classifier/`** | Visa type classification from client profile/emails |
| `agents/emergent_work/` | **`agents/document_reviewer/`** | OCR + AI document validation, issue flagging |
| `agents/compliance/` | **`agents/checklist_engine/`** | Requirement checklist generation and tracking |
| `agents/unified/` | **`agents/unified/`** | Single AI call classifies email across all immigration dimensions |
| `agents/shared/` | **`agents/shared/`** | Kept + extended (add OCR via AWS Textract) |

Each agent follows the same proven pattern: `models.py`, `schemas.py`, `router.py`, `service.py`, `processor.py`.

### Unified Classifier — New Dimensions

The "Classify Once, Act Many" pattern (single AI call across all dimensions) is the most valuable architectural pattern in the codebase. New dimensions:

1. **Case Matching** — Is this email about an existing case? New inquiry? Which client?
2. **Visa Signal Detection** — Signals about visa type, occupation, skills, eligibility?
3. **Document Detection** — Are attachments immigration documents? What types?
4. **Urgency Assessment** — Deadline approaching? Government correspondence? Missing critical document?

### Document Validators (Modular)

```
agents/document_reviewer/validators/
  ├── passport.py           # Expiry check, name extraction, nationality
  ├── police_check.py       # AFP vs state, date validity, name match
  ├── skills_assessment.py  # Assessing body match, validity period, outcome
  ├── english_test.py       # Score extraction, minimum thresholds per visa
  └── name_matcher.py       # Cross-document name consistency (fuzzy matching)
```

---

## What Stays vs. What Changes

### STAYS (Infrastructure — No Changes Needed)

| Component | Why |
|---|---|
| AI Gateway (AWS Bedrock + Claude) | Model-agnostic; just new prompts |
| Microsoft 365 integration (all 7 files) | Email ingestion is domain-agnostic |
| Database layer (async SQLAlchemy + asyncpg) | Just add new tables |
| Email parser + attachment handler | Domain-agnostic utilities |
| PDF/doc processor | Extended with OCR, core stays |
| Scheduler framework (APScheduler) | New jobs, same framework |
| API key auth middleware | Same auth pattern |
| Activity/usage logging models | Universal audit trail |
| All shadcn/ui components (30+) | UI primitives are domain-agnostic |
| Dashboard layout shell | Sidebar + Header + Main pattern is universal |
| Auth system (TDOP) | Same login flow |
| API client (Axios) | Same request pattern |
| Login page (MeshBackground) | Just change copy |

### CHANGES (Modify Existing)

| Component | What Changes |
|---|---|
| `main.py` | Rebrand, swap router imports |
| `config.py` | Replace property settings with immigration settings |
| `scheduler/jobs.py` | New job definitions |
| `webhooks.py` | Same dispatch pattern, new internal routing |
| Sidebar, header, dashboard | Rebrand + new KPIs |
| Service files (frontend) | Replace property services with immigration services |

### GOES (Remove → Replace)

| Removed | Replaced With |
|---|---|
| 4 property agent directories | 4 immigration agent directories |
| Unified classifier prompt/schemas/handlers | Rewritten for immigration |
| Property frontend pages | Cases, documents, knowledge pages |
| Property database tables | Immigration tables (Alembic migration) |

---

## Frontend Revamp

### Navigation

```
Current                    →  New
─────────────────────────────────────────
Overview                   →  Dashboard
Inbox                      →  Inbox (linked to cases)
AI Pipeline                →  Processing Pipeline
Compliance                 →  (removed)
Activity                   →  Activity
Settings                   →  Settings
                           +  Cases (new — the primary workspace)
                           +  Documents (new — review queue)
                           +  Knowledge Base (new — visa reference)
```

### Dashboard KPIs

```
Current                    →  New
─────────────────────────────────────────
Urgent Issues              →  Active Cases (by stage breakdown)
Maintenance Queue          →  Documents Pending Review
Scope Alerts               →  AI Flagged Issues
Invoices Processed         →  Cases This Month
```

### Key New Pages

- **Cases List** (`/dashboard/cases`) — Filterable list/kanban by stage, visa type, consultant
- **Case Detail** (`/dashboard/cases/[id]`) — Tabs: Overview | Checklist | Documents | Emails | Notes | Timeline
- **Document Review** (`/dashboard/documents`) — AI-flagged documents needing attention; side-by-side PDF preview + AI analysis
- **Knowledge Base** (`/dashboard/knowledge`) — Browse visa subclasses, requirements, document types
- **New Case Wizard** — Client info → Visa selection → Checklist preview → Create

---

## Implementation Phases

### Phase 0: Public Product Site ← START HERE

**Goal:** Build the public-facing website — the "front door" of IMMI-PULSE.

**Pages to build:**
1. **Home** — Hero, value prop, how it works (3-step), social proof, dual CTA
2. **For Consultants** — Pain points, AI features, workflow demo, "Join as Consultant" CTA
3. **For Applicants** — Vision of what's coming, "Join Waitlist" CTA
4. **Features** — Platform capabilities showcase
5. **Pricing** — Consultant plans (or waitlist), free for applicants
6. **About** — Mission, team placeholder, contact
7. **Get Started** — Role picker: Consultant / Applicant → respective flows
8. **Blog** — Placeholder grid for Phase 2 news content

**Technical work:**
1. Restructure frontend with route groups: `(public)`, `(console)`, `(app)`
2. Public layout (navbar + footer), separate from console layout
3. All public pages with responsive, modern design
4. Move existing dashboard under `(console)` route group

**Deliverable:** Polished product website shareable with investors and partners.

---

### Phase 1a: Foundation (Core Models + Console Rebrand)

**Backend:** Rebrand config/main, create core models (Organization, Consultant, Client, Case), Alembic migration (drop property tables, keep infrastructure, create immigration tables), basic CRUD via `agents/intake/`.

**Frontend:** Rebrand console sidebar/header, create cases list + detail pages, new service files, update console dashboard KPIs.

**Deliverable:** Consultant logs in → rebranded dashboard → create/view cases and clients.

---

### Phase 1b: Visa Knowledge Base + Checklist Engine

**Backend:** Create visa/requirement/document-type models, seed data for 8 subclasses (482, 186, 189, 190, 491, 500, 820/801, 600), create `agents/checklist_engine/` for auto-generating checklists.

**Frontend:** Knowledge base browse page, checklist tab on case detail, "New Case" wizard with visa selection.

**Deliverable:** Create case, select visa type, get auto-generated checklist of requirements.

---

### Phase 1c: Email Intake + Unified Classifier

**Backend:** Create intake processor, rewrite unified classifier for immigration (new prompt, schemas, handlers, conflict resolver), update webhook dispatch, update scheduler.

**Frontend:** Updated inbox with AI classification, email-to-case linking, updated agent board visualization.

**Deliverable:** Emails arrive, AI classifies and links to cases, consultant confirms.

---

### Phase 1d: Document Intelligence

**Backend:** Document/validation models, file upload (S3), modular validators (passport, police check, skills assessment, English test, name matcher), AWS Textract for OCR, review queue endpoint.

**Frontend:** Drag-and-drop upload per checklist item, document review queue page, PDF preview + AI analysis side-by-side, auto-status updates.

**Deliverable:** Upload documents, AI validates, flags issues, consultant reviews in clear queue.

---

### Phase 1e: Polish + Client Communication

**Backend:** Email templates for checklists, Graph API for sending emails, case readiness scoring, dashboard analytics.

**Frontend:** Real data in KPIs, readiness indicators, "Send Checklist" action, activity feed, responsive polish.

**Deliverable:** Full intake-to-review workflow, ready for demo/beta.

---

### Phase 1f: Client Portal (Post-MVP, Optional)

Separate set of public routes where clients receive a link, see their checklist, upload documents directly, and track progress. Can be deferred if consultants manually upload initially.

---

## Migration Strategy

1. **Branch and preserve** — `main-property-pulse` branch keeps original codebase
2. **Clean schema swap** — single Alembic migration (drop property tables, keep infrastructure, create immigration)
3. **Agent swap** — delete 4 property dirs, create 4 immigration dirs
4. **Frontend swap** — delete property pages/services, create immigration ones
5. **Config update** — new `.env.example`, updated `CLAUDE.md`

---

## Key Architecture Decisions

| Decision | Rationale |
|---|---|
| Keep "Classify Once, Act Many" | Most valuable pattern — single AI call, multiple actions |
| Visa knowledge base in code, seeded to DB | Same as compliance rules engine; version controlled, testable |
| Modular document validators | One file per doc type; easy to add new ones |
| Case as central entity | Everything links to a case — emails, docs, checklists, notes |
| Australia-first, multi-country ready | `country` column on tables, no over-engineering |
| Human-in-the-loop always | AI suggests and flags; consultant confirms every critical decision |
| Each phase produces a working system | Incrementally demoable, no big-bang delivery |

---

## Future Phases (Not in Scope Now, But Architecture Supports)

| Phase | What | Architecture Readiness |
|---|---|---|
| Phase 2: Tracker + News | Crowdsourced visa timelines, news aggregation | New models + scrapers; no changes to core |
| Phase 3: Community | Forums, verified badges, Q&A | New models + routes; auth system extended |
| Phase 4: Self-Service | DIY visa lodgement, consultant marketplace | Client portal (1f) is the foundation |
| Multi-country | Canada, US expansion | `country` column already in schema |

---

## Target Visa Subclasses (Phase 1)

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
