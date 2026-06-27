# IMMI-PULSE — Lawyer Showcase Run-Book (9 AM)

End-to-end demo flow plumbed through real backend + frontend.

## One-time setup (do this first, before the call)

### 1. Point the frontend at the LOCAL backend
Edit `immi-pulse-fe/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_API_KEY=dccm-dev-api-key-2026
```

(The checked-in `.env.local` currently points at the Heroku backend, which does not have the new `/demo/*` endpoints.)

### 2. Start the backend (terminal 1)

```bash
cd immi-pulse-be
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001" \
PYTHONPATH=src venv/bin/python -m app.core.server
```

The extra CORS origin covers the case where another project is already on :3000 and Next.js falls through to :3001. If :3000 is free, you can drop it.

### 3. Start the frontend (terminal 2)

```bash
cd immi-pulse-fe
bun run dev
```

Note which port Next.js picks — if `:3000` is free it uses that; otherwise `:3001`. Write it down.

### 4. Log in
- Open `http://localhost:<PORT>/login`
- Use Harrison's existing TDOP credentials (the TDOP service login is still wired through `src/lib/auth.tsx`)

If TDOP is down before the demo, seed a fake session in DevTools → Console:
```js
localStorage.setItem('ip_token', 'demo-token');
localStorage.setItem('ip_user', JSON.stringify({
  id: 1, email: 'demo@consultant.au',
  first_name: 'Demo', last_name: 'Consultant',
  user_role: { id: 1, name: 'Consultant', description: '' }
}));
location.href = '/dashboard/inbox';
```

### 5. Reset demo state (optional — if a previous walkthrough already created cases)
```bash
curl -X POST -H 'X-API-Key: dccm-dev-api-key-2026' \
     http://localhost:8000/api/v1/demo/reset
```
Or click **Reset demo** on the Inbox page.

---

## The demo flow (the story)

### Step 1 — Inbox (`/dashboard/inbox`)
"Overnight, three new emails arrived. The AI Intake Classifier has already read each one, flagged whether it's a new inquiry, and proposed a visa pathway for the ones that are."

- Five seeded emails. Three immigration inquiries (Priya / Liam / Yuki), two noise (government newsletter + doc submission).
- Click **Priya Sharma**. On the right:
  - full email body
  - classification badges ("New Inquiry" · "Normal priority" · confidence %)
  - AI summary paragraph
  - **Proposed visa pathway: Subclass 189 — 91% confidence**
  - Reasoning (ANZSCO 261313, MLTSSL, EOI points)
  - Key points (bulleted)
  - Extracted details grid (age, employer, IELTS scores, etc.)

### Step 2 — Create the case
Click **Create case & generate checklist** (bottom of right panel).
- Real case is minted in Postgres with the AI summary + 8-item checklist stored on `metadata_json`.
- Auto-redirects to `/dashboard/cases/<uuid>`.

### Step 3 — Case detail
- Header: Priya Sharma · Consultation · Subclass 189 · "From inbox" badge.
- **AI Intake Summary hero**: same summary + pathway card + confidence bar + reasoning + key points.
- Tabs: **Checklist (8)**, **Documents (0)**, Overview, Timeline.
- Checklist tab opens by default, showing the 8 prerequisite documents tailored to Subclass 189 (passport, skills assessment, IELTS, education, CV, employment refs, police check, Form 80) — each with "Awaiting upload" badge.

### Step 4 — Send the portal link
Click **Generate client portal link** (top right). Dialog:
- "Generate link only" — just mints the token+PIN.
- "Generate & email to client" — mints + shows a "Delivered to priya.sharma@gmail.com" confirmation (mocked — no real email is sent during the demo).
- URL and 6-digit PIN appear with one-click copy buttons.

### Step 5 — Client portal (open in a new tab)
Paste the URL. It's a `/client-portal/<signed-token>` route.
- Client enters the PIN → 15-minute session JWT is issued.
- "Welcome, Priya" · "Document collection for Subclass 189 — Skilled Independent".
- **Your progress: 0 of 8 documents uploaded** with progress bar.
- Checklist renders with an **Upload** button per row.

### Step 6 — Upload a document
- Click Upload on, e.g., **Current passport (bio page)**.
- Pick any file (a PDF works best; even a renamed text file demos the flow).
- For on-the-fly "AI flags" demo, name the file with a hint:
  - `passport-priya-expires-2026-08.pdf` → triggers "expires within 6 months" flag
  - `ielts-5-0-priya.pdf` → triggers "below 6.0 threshold" flag
  - `national-police-check-priya.pdf` → triggers "AFP Name Check needed" flag
  - `bank-statement-1-month-priya.pdf` → triggers "3–6 months typically required" flag
- The row immediately becomes **Received** / **Needs attention** and the progress bar increments.

### Step 7 — Consultant reviews the upload
Switch back to the consultant tab. On the case detail:
- Checklist row flips to **Uploaded — awaiting review** (auto-linked by document type).
- Documents tab shows the uploaded file with:
  - Document type badge (e.g. "Passport")
  - AI confidence %
  - **AI FLAGS** box (amber) with the specific issues
  - **SUGGESTED ACTION** box with the fix
  - **Approve** and **Flag** buttons
- Click **Approve** — the document becomes **Validated** (green), and the matching checklist row also flips to "Validated". All cross-wired.

---

## What's real vs mocked

| Piece | Behaviour |
|---|---|
| Inbox emails | Static mock list served from `/api/v1/demo/inbox` (5 curated scenarios). |
| AI intake summary | Pre-computed per email — written into `case.metadata_json.ai_summary` on "Create case". |
| Checklist | Real DB-backed template per visa subclass (`checklist_templates.py`, 12 subclasses covered). |
| Portal link + PIN | Real — itsdangerous-signed token + bcrypt-hashed PIN + session JWT. |
| "Email to client" | Logged only (`logger.info` with `[demo] Pretending to email…`) — no Graph call. |
| Document upload | Real — stored via `storage.upload_case_document` (local FS by default). |
| AI flags on uploads | **Heuristic** — filename-based rules in `heuristic_analyzer.py`. Runs inline, always populates `ai_analysis`. If Bedrock is configured (it isn't for this demo), the real analyzer overwrites with stronger results in the background. |
| Auto-link upload → checklist | Real — `CaseService.auto_link_document_to_checklist` matches by `document_type`. |
| Approve / flag | Real — writes to `CaseDocument` + propagates to checklist row + records timeline event. |

## Useful curl commands

```bash
# Show current demo state
curl -H 'X-API-Key: dccm-dev-api-key-2026' \
     http://localhost:8000/api/v1/demo/status | jq

# Wipe demo cases (keeps emails intact)
curl -X POST -H 'X-API-Key: dccm-dev-api-key-2026' \
     http://localhost:8000/api/v1/demo/reset

# List inbox
curl -H 'X-API-Key: dccm-dev-api-key-2026' \
     http://localhost:8000/api/v1/demo/inbox | jq '.[] | {id, from_name, subject}'

# Create case from any of the three inquiries
curl -X POST -H 'X-API-Key: dccm-dev-api-key-2026' -H 'Content-Type: application/json' \
     -d '{"assign_checklist":true}' \
     http://localhost:8000/api/v1/demo/emails/demo-email-liam-482/create-case | jq
```

## Troubleshooting

- **CORS error** on inbox: make sure you started the backend with `CORS_ALLOWED_ORIGINS` covering the actual frontend port.
- **"Case not found"** after clicking `Open case`: previous demo state has a stale linked case — click **Reset demo** and start again.
- **Portal link 404** in browser: the URL generated uses `FRONTEND_URL` from backend settings (defaults to `:3000`). If your Next.js fell through to `:3001`, just swap the port in the copied URL or set `FRONTEND_URL=http://localhost:3001` when starting the backend.
- **Upload fails with "Session expired"**: the portal session JWT is 15 minutes. Re-enter the PIN.
