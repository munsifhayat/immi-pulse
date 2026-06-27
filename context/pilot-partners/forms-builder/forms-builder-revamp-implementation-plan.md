# Form Builder Revamp — Implementation Plan

> **Status:** Ready to execute  
> **Recommendation:** Option A (Split-pane canvas) first → Option B as preview tab → Option C in phase 2  
> **Visual reference:** `context/pilot-partners/forms-builder-revamp-brainstorm.html`  
> **North star:** Build on the left. See exactly what the client sees on the right — live.

---

## Goal

Revamp the consultant **Forms builder** from a settings-style field list into an **interactive split-pane canvas**: real drag-and-drop, plain-English logic blocks, always-on live preview, autosave drafts, and immigration-native templates — **without changing the backend schema or rules engine contract** in Phase 1.

---

## What already exists (reuse, do not rebuild)

| Asset | Path | Role |
|-------|------|------|
| Rules engine (FE) | `immi-pulse-fe/src/lib/questionnaires/rulesEngine.ts` | Visibility, required-if, validation |
| Rules engine (BE) | `immi-pulse-be/src/app/agents/immigration/questionnaires/rules_engine.py` | Submit enforcement |
| Shared test fixture | `immi-pulse-be/tests/fixtures/rule_eval_cases.json` | FE/BE parity |
| Renderer | `immi-pulse-fe/src/components/questionnaires/QuestionnaireRenderer.tsx` | Public form + preview |
| Rule editor (logic) | `immi-pulse-fe/src/components/questionnaires/builder/RuleEditor.tsx` | Refactor UI, keep JSON shape |
| Live preview | `immi-pulse-fe/src/components/questionnaires/preview/LivePreview.tsx` | Move to right rail |
| Flow preview | `immi-pulse-fe/src/components/questionnaires/preview/FlowPreview.tsx` | Right rail tab |
| Main builder | `immi-pulse-fe/src/components/QuestionnaireBuilder.tsx` | Primary refactor target |
| Templates | `immi-pulse-fe/src/lib/questionnaire-templates.ts` | Standard + logic recipes |
| New form page | `immi-pulse-fe/src/app/(console)/dashboard/questionnaires/new/page.tsx` | Template picker |
| Edit form page | `immi-pulse-fe/src/app/(console)/dashboard/questionnaires/[id]/page.tsx` | Edit + publish link |
| Forms list | `immi-pulse-fe/src/app/(console)/dashboard/questionnaires/page.tsx` | Phase 2 upgrade |
| API | `immi-pulse-fe/src/lib/api/services.ts` → `questionnairesApi` | CRUD + public submit |
| React Flow | `@xyflow/react` (already installed) | Flow preview tab |

**Data model stays the same:** `QuestionField[]` with optional `logic`, `flags`, `options`. No BE migration required for Phase 1.

---

## Architecture target (Phase 1)

```
┌─────────────────────────────────────────────────────────────────┐
│  BuilderShell (full viewport width, min-h screen)               │
│  ┌─ TopBar: mode seg · form name · autosave · Save draft · Pub ─┐│
│  ├──────────────────────────────┬─────────────────────────────────┤│
│  │  BuilderCanvas (left ~55%)   │  PreviewPanel (right ~45%)     ││
│  │  · Section blocks (optional) │  · Tabs: Live | Flow           ││
│  │  · Field blocks (DnD)        │  · QuestionnaireRenderer       ││
│  │  · Logic blocks (DnD)        │  · Outcome strip (flags)       ││
│  │  · Inline edit on select     │  · Reset / test answers        ││
│  └──────────────────────────────┴─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### New component tree (proposed)

```
src/components/questionnaires/builder/
  BuilderShell.tsx          — layout + top bar + autosave orchestration
  BuilderCanvas.tsx         — DnD sortable list of canvas items
  CanvasFieldBlock.tsx      — single field row (inline edit)
  CanvasLogicBlock.tsx      — visual IF/THEN card between fields
  CanvasSectionBlock.tsx    — optional grouping header (UI-only in P1)
  FieldPalette.tsx          — moved from right rail; add field types
  LogicSentenceEditor.tsx   — human-readable rule UI (replaces popover RuleEditor surface)
  BuilderTopBar.tsx         — mode, save states, publish
  TemplateLibrarySheet.tsx  — slide-over templates (optional P1.5)

src/components/questionnaires/preview/
  PreviewPanel.tsx          — wraps LivePreview + FlowPreview + tabs
  (keep LivePreview.tsx, FlowPreview.tsx)
```

---

## Phase 1 — Canvas + split pane (ship this first)

**Estimate:** 1–2 weeks  
**Outcome:** Consultants can design forms interactively; preview always visible; real DnD; logic in plain English.

### 1.1 Dependencies & scaffolding

- [ ] Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` via `bun add`
- [ ] Create `BuilderShell.tsx` with responsive split layout
  - Desktop: side-by-side sticky preview
  - `< xl`: stacked — canvas first, collapsible preview drawer or bottom sheet
- [ ] Refactor `QuestionnaireBuilder.tsx` to delegate to `BuilderShell` (keep same `onSave` props for pages)

**Acceptance:** New/edit form pages render split layout without regressions.

### 1.2 Real drag-and-drop

- [ ] Implement sortable field list in `BuilderCanvas.tsx`
- [ ] Drag handle on each field block (replace arrow-only reorder)
- [ ] Keep keyboard-accessible reorder fallback (arrow buttons or dnd-kit keyboard sensor)
- [ ] On reorder: preserve rule validity (rules only reference earlier fields — re-validate after move)

**Acceptance:** User can drag fields; order persists on save; `validateFieldRules` stays clean.

### 1.3 Always-on preview panel

- [ ] Extract `PreviewPanel.tsx` — tabs: **Live** (default), **Flow**
- [ ] Live tab: existing `LivePreview` + `QuestionnaireRenderer`
- [ ] Flow tab: existing `FlowPreview`; click node → scroll/highlight canvas block
- [ ] Bidirectional highlight: selecting canvas field → highlight in preview if visible
- [ ] Show outcome strip when flags would fire (qualified / urgent / etc.) based on preview answers

**Acceptance:** Preview visible in **both** Standard and Advanced density — not Advanced-only.

### 1.4 Inline field editing

- [ ] `CanvasFieldBlock.tsx`: click to select; inline edit label, type, required, options
- [ ] Collapse verbose options editor until selected
- [ ] Field type picker as compact dropdown or icon menu (not full card per type in main list)
- [ ] Auto-generate `key` from label (existing `slugify` logic)

**Acceptance:** No nested accordion-per-field for basic edits; feels like editing the form directly.

### 1.5 Logic as first-class blocks

- [ ] Introduce `CanvasLogicBlock` — purple dashed card **between** fields (attached to the field it controls)
- [ ] Display human text: `When [Country] is [Australia] → Show [Current visa]`
- [ ] "Add rule" action on field or between fields opens `LogicSentenceEditor`
- [ ] Refactor `RuleEditor.tsx` internals into `LogicSentenceEditor.tsx`:
  - Chip-based: When **[field]** **is** **[value]** → **Show/Require/Flag**
  - Still writes same `FieldLogic` JSON
- [ ] Urgent/disqualified flags visible on logic blocks (amber/red styling)

**Acceptance:** Consultant never opens a technical popover to add branching; rules visible on canvas.

### 1.6 Mode density (not separate builders)

- [ ] Keep Standard | Advanced segmented control
- [ ] **Standard:** logic blocks hidden by default; "Add branching" reveals them
- [ ] **Advanced:** logic blocks + flow tab visible by default
- [ ] Remove "Recommended (soon)" disabled tab OR show disabled with tooltip "Phase 2"
- [ ] Persist mode in `localStorage` (already exists via `modeStorageKey`)

**Acceptance:** One canvas, two density levels — not two different UIs.

### 1.7 Autosave & publish UX

- [ ] Debounced local draft: `localStorage` key `questionnaire-draft:{id|new}`
- [ ] Optional: debounced PATCH for edit mode (if API supports partial update — today `questionnairesApi.update` exists)
- [ ] Top bar states: `Saving…` · `Draft saved` · `Unsaved changes`
- [ ] Split actions: **Save draft** ( PATCH / local ) vs **Save & publish** (existing create/update)
- [ ] Block publish when `validateFieldRules` has errors (already partially done)

**Acceptance:** User can refresh page without losing work; clear publish vs draft.

### 1.8 Template picker integration (light)

- [ ] Keep template picker on `/questionnaires/new` OR add `TemplateLibrarySheet` inside builder
- [ ] Applying template replaces canvas with confirm dialog (existing `applyRecipe` behavior)
- [ ] Blank start lands directly in split canvas

**Acceptance:** New form flow ≤ 2 clicks to editing with preview visible.

### 1.9 Pages & polish

- [ ] Update `new/page.tsx` and `[id]/page.tsx` headers — less editorial chrome, more workspace room
- [ ] Full-width builder: reduce outer `space-y-10` padding on edit pages when in builder
- [ ] Branded preview: pass org name/logo if available from auth context (stretch)

### 1.10 Verification

- [ ] `bun run build` — no TS errors
- [ ] `bun run lint` — clean on touched files
- [ ] Manual: create form → add fields → add logic → preview branches → save → public `/q/[slug]` submit
- [ ] Run `rule_eval_cases` parity: `immi-pulse-fe/src/lib/questionnaires/__verify__rulesEngine.ts` if present
- [ ] BE: `make test` — questionnaire logic tests still pass

**Phase 1 done when:** Split pane works, DnD works, logic blocks readable, preview always on, autosave works, publish path unchanged.

---

## Phase 2 — Intelligence & library (after Phase 1 ships)

**Estimate:** ~1 week  
**Outcome:** Faster form creation; better forms list; test-as-applicant.

### 2.1 Recommended mode (AI or smart templates)

- [ ] **V0 (no LLM):** Prompt box → match nearest template/recipe by keywords → show accept/reject chips
- [ ] **V1 (LLM):** BE endpoint `POST /questionnaires/draft-from-prompt` → returns `QuestionField[]` draft
- [ ] Recommended tab in mode segment becomes active
- [ ] Suggestion rows: Accept · Edit · Remove per field/branch

### 2.2 Test walkthrough mode

- [ ] Third preview tab: **Test** — step through visible fields one at a time (Typeform-style)
- [ ] Path breadcrumb: `Country → Australia → Visa → 482`
- [ ] End screen: simulated outcome flags → maps to pre-case triage labels

### 2.3 Forms list upgrade

- [ ] Card grid with mini preview thumbnail (render first 3 fields)
- [ ] Stats: submission count (if API exposes — else defer)
- [ ] Actions: Duplicate · Copy link · Edit · Pause
- [ ] Empty state links to template picker

### 2.4 Public form polish (optional same sprint)

- [ ] `/q/[slug]` — option to hide marketing navbar or use minimal layout
- [ ] Progress indicator for multi-section forms

---

## Phase 3 — Power features (later)

- [ ] **Editable flow canvas** — React Flow as primary Advanced sub-mode (drag nodes, auto-sync to fields)
- [ ] **Calculations** — age from DOB, expiry countdown (extend rules engine + BE)
- [ ] **Multi-page forms** — `page` or `section` in schema (requires BE schema discussion)
- [ ] **Section persistence** — if sections become real, add optional `section_id` on fields

---

## Explicit non-goals (Phase 1)

- No Stripe, no new BE tables
- No rewrite of `rules_engine.py` semantics
- No AI endpoint unless Phase 2 explicitly started
- No journey wizard integration
- No changes to pre-case pipeline after submit

---

## File change map (Phase 1)

| Action | File |
|--------|------|
| **Add** | `builder/BuilderShell.tsx`, `BuilderCanvas.tsx`, `CanvasFieldBlock.tsx`, `CanvasLogicBlock.tsx`, `LogicSentenceEditor.tsx`, `PreviewPanel.tsx`, `BuilderTopBar.tsx`, `FieldPalette.tsx` |
| **Refactor** | `QuestionnaireBuilder.tsx` → thin wrapper or replace |
| **Refactor** | `RuleEditor.tsx` → extract sentence UI to `LogicSentenceEditor.tsx` |
| **Move/wire** | `LivePreview.tsx`, `FlowPreview.tsx` via `PreviewPanel.tsx` |
| **Touch** | `questionnaires/new/page.tsx`, `questionnaires/[id]/page.tsx` |
| **Add dep** | `@dnd-kit/*` |
| **Optional** | `questionnaires/page.tsx` (Phase 2) |

---

## Design tokens (match existing IMMI-PULSE)

- Navy `#101928`, Purple `#7A5AF8`, Purple Deep `#3E1C96`
- Logic blocks: purple dashed (`border-purple/40`, `bg-purple/[0.04]`)
- Urgent flags: amber/rose (`warn-soft`)
- Preview panel bg: `#F4F2FB` (already in LivePreview)
- Fonts: `font-heading` (Outfit), body Inter

---

## Risk register

| Risk | Mitigation |
|------|------------|
| Reorder breaks forward-ref rules | Re-run `validateFieldRules` on drop; show inline errors |
| Split pane cramped on laptop | Collapsible preview; full-screen preview toggle |
| Scope creep into AI | Lock Phase 1 scope; Recommended tab stays disabled until Phase 2 |
| `@dnd-kit` + React 19 | Use latest dnd-kit; test touch devices |
| Autosave conflicts with server version | Edit page: compare `updated_at` or version id before PATCH |

---

## Suggested build order (single developer)

1. `BuilderShell` layout + `PreviewPanel` wired (no DnD yet) — **visible win day 1**
2. `@dnd-kit` sortable fields
3. `CanvasFieldBlock` inline editing
4. `LogicSentenceEditor` + `CanvasLogicBlock`
5. Autosave + top bar
6. Mode density toggle polish
7. Page header/layout cleanup
8. `bun run build` + manual QA + BE tests

---

## Success metrics

- Consultant can build a 5-field branched form **without opening a popover**
- Preview updates **live** while typing logic
- Gideon-style ask satisfied: **drag-and-drop** + **plain-English rules**
- Zero regression on public submit → pre-case creation
- `rule_eval_cases.json` still passes on FE and BE

---

## Reference links in repo

- Brainstorm visual: `context/pilot-partners/forms-builder-revamp-brainstorm.html`
- Original vision doc: `context/pilot-partners/forms-builder-vision-non-technical.html`
- Phase 1 pipeline plan: `PHASE_1_PLAN.md` (consultant pipeline — separate from builder UX)
- Gideon feedback: `context/pilot-partners/gideon-3rd-call.md` — "drag and drop, like Legal Fun"
