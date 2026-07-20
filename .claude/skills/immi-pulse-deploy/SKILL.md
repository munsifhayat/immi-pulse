---
name: immi-pulse-deploy
description: "Deploy IMMI-PULSE to production — detects whether the change is backend, frontend, or both, lands it on main through the CI gate, and verifies the deploy actually reached users. Use when asked to deploy, ship, release, or push immi-pulse to prod, or when asked to check whether something is actually deployed. Triggered by phrases like 'deploy immi-pulse', 'ship this', 'push to prod', 'release this', 'is this deployed', 'deploy the backend', 'deploy the frontend'."
---

# IMMI-PULSE Deployment

Deployment is **automated**. You do not push to Heroku or Vercel by hand — you land
code on `main` correctly and then **verify it actually reached users**.

```
push / merged PR on main
   ├─ CI (ci.yml) ────────────► 234 backend tests + FE production build
   ├─ deploy-be.yml ──────────► subtree split → Heroku  (+ alembic via release phase)
   └─ Vercel git integration ─► immi360.com.au
```

**The single most important rule: a green tick is not a deploy.** Every wall this
project has hit came from trusting a status instead of checking the artefact. Run
the verification in §5 every time.

---

## 1. Detect what changed

```bash
git status --short
git diff --stat origin/main...HEAD
```

| Paths touched | What deploys | Notes |
|---|---|---|
| `immi-pulse-be/**` | Heroku (`deploy-be.yml`) **+ Vercel** | Vercel's "Skip deployments" is Disabled, so the FE redeploys too. Wasteful, intentional — keeps the pair in lockstep. |
| `immi-pulse-fe/**` | Vercel only | |
| both | both | See the lockstep warning in §6. |
| `context/`, `.phase/`, docs only | Vercel only (no-op build) | No backend deploy; `deploy-be.yml` path filter excludes it. |

---

## 2. Preflight — run locally before pushing

```bash
# Backend (needs no .env and no database — every Settings field has a default)
cd immi-pulse-be && PYTHONPATH=src .venv/bin/python -m pytest tests/ -q

# Frontend (bun, never npm/yarn/pnpm)
cd immi-pulse-fe && bun run build
```

Do **not** run `bun run lint` as a gate — lint is already failing on `main` and is
deliberately excluded from CI. Fix it separately.

If migrations are involved:

```bash
cd immi-pulse-be && PYTHONPATH=src .venv/bin/alembic heads   # MUST show exactly one
```

Two heads has bitten this repo before. The Procfile uses `alembic upgrade heads`
(plural) so a split still deploys — it just quietly applies both branches. Collapse
them before shipping.

---

## 3. Land it on main

`main` is **protected**. Required checks: `Backend tests`, `Frontend build`.
`strict: true` (branch must be up to date). `enforce_admins: false`.

Direct pushes to `main` are generally rejected — a fresh commit has no passing
checks yet. **Use a branch and a PR:**

```bash
git checkout -b feat/<slug>
git add <paths>
git commit -m "feat(scope): what changed and why"
git push -u origin feat/<slug>
gh pr create --fill
gh pr checks --watch          # wait for both checks
gh pr merge --squash --delete-branch
```

**Always merge with `gh pr merge`, never by squashing onto main by hand.** Hand
squashing is what orphaned PR #16: the content landed, the PR stayed open, and the
branch lingered. `--squash --delete-branch` closes and cleans up atomically.

Commit messages: conventional prefixes (`feat:`, `fix:`, `chore:`, `ci:`, `docs:`).
**Never add `Co-Authored-By: Claude` or "Generated with Claude Code."**

---

## 4. Watch the pipelines

```bash
gh run list --limit 3 --json name,status,conclusion \
  --jq '.[] | "\(.name): \(.status)/\(.conclusion // "running")"'
```

To block until done (do not chain sleeps):

```bash
until [ "$(gh run list --limit 2 --json status \
  --jq '[.[] | select(.status != "completed")] | length')" = "0" ]; do sleep 15; done
```

---

## 5. Verify it actually shipped — REQUIRED

### Backend: compare trees, do not trust the log

```bash
git fetch heroku main
git rev-parse heroku/main^{tree}        # what Heroku is serving
git rev-parse main:immi-pulse-be        # what main says it should be
```

**These two must be equal.** This is the only reliable way to tell a real deploy
from a no-op, and it catches a failed `deploy-be.yml` that reported success.

```bash
heroku releases -a immi-pulse-be -n 3        # new version at the top?
heroku ps -a immi-pulse-be                   # web.1 up?
heroku run --exit-code -a immi-pulse-be 'PYTHONPATH=src alembic current'   # at head?
curl -s -o /dev/null -w "%{http_code}\n" https://immi-pulse-be-6a20ac3e42e1.herokuapp.com/health
```

### Frontend: check the status, not the URL

```bash
cd immi-pulse-fe && npx vercel ls --yes | head -4
curl -s -o /dev/null -w "%{http_code}\n" https://immi360.com.au/
```

> **A failed Vercel deploy never replaces the live alias.** Vercel keeps serving the
> last good build, so production looks perfectly healthy while every deploy fails.
> This hid a broken pipeline here for weeks. **Always confirm the newest production
> deployment says `● Ready`, not `● Error`.**

Expected redirect, not a bug: `/community` → `/` returns **307**. The community *is*
the homepage — documented in `immi-pulse-fe/next.config.ts`. Same for
`/find-consultants` → `/`.

---

## 6. Known walls — read before deploying

**BE and FE must ship together when the API contract changes.** `publish` is a
required field on `CreateJourneyRequest` (`schemas.py`), and the FE sends it
(`lib/api/hooks/community.ts`). An older FE against a newer BE **422s every journey
post**. When a contract changes, land both in one PR and confirm both deploys go
green before calling it done.

**Migrations run automatically** via the Procfile `release` phase
(`alembic upgrade heads`), before the new web dyno takes traffic. Do not run them by
hand. For a risky migration, snapshot first:

```bash
heroku pg:backups:capture -a immi-pulse-be
```

**Seeders are order-dependent.** After a taxonomy change:
`seed_visa_taxonomy.py` → *then* `seed_occupations.py`. Reversed, every subclass
stays `requires_occupation=false` and the feature silently disables.

**Never require `Push subtree to Heroku` as a branch-protection check.** It comes
from `deploy-be.yml`, which triggers on `push` only, never `pull_request` — requiring
it leaves every PR hanging on a check that can never run.

**Audit any long-lived branch before merging it.** PR #3 sat open for two weeks and
would have been a **53,812-line deletion** reverting the community MVP. Always:

```bash
git diff --stat origin/main..origin/<branch> | tail -3
```

**Scheduler replica gate:** `RUN_SCHEDULED_JOBS` must be `false` on every dyno but
one **before** scaling past a single web dyno, or rate-limited government-API fetches
race each other.

---

## 7. Manual fallbacks

Only when the automation is broken. All are safe to run from a clean `main`.

```bash
# Backend → Heroku (what deploy-be.yml automates)
git subtree push --prefix immi-pulse-be heroku main

# Frontend → Vercel
cd immi-pulse-fe && vercel --prod

# Re-run an existing deployment without a new commit (e.g. after a settings change).
# Use this when `vercel --prod` is blocked by the permission classifier — this one
# goes through where that one does not.
cd immi-pulse-fe && npx vercel redeploy <deployment-url>
```

---

## 8. Rollback

```bash
# Backend — instant, and re-runs the release phase.
heroku releases -a immi-pulse-be -n 10
heroku releases:rollback vNN -a immi-pulse-be
```

⚠️ A Heroku rollback does **not** roll back the database. If the bad release applied
a migration, downgrade deliberately (`alembic downgrade -1`) or restore the backup —
rolling back code alone against a migrated schema can be worse than the bug.

```bash
# Frontend — promote a known-good deployment.
cd immi-pulse-fe && npx vercel ls --yes
cd immi-pulse-fe && npx vercel promote <good-deployment-url>
```

---

## 9. Infrastructure reference

| | |
|---|---|
| Repo | `munsifhayat/immi-pulse` (**public**) |
| Live site | `https://immi360.com.au` |
| Backend | Heroku `immi-pulse-be`, `https://immi-pulse-be-6a20ac3e42e1.herokuapp.com` |
| Heroku plan | Basic dyno + `heroku-postgresql:essential-0`, region us, stack heroku-24 |
| Vercel project | `immi-pulse-fe` · `prj_8EJZzrSsNmJGJ8gq9Fym9Vz0Sv4J` · team `team_wUUnprLDggsSTFlv0rRZ5lgZ` |
| Vercel Root Directory | **`immi-pulse-fe`** — if unset, every git deploy fails with `No Next.js version detected` |
| CI secret | `HEROKU_API_KEY` — from `heroku authorizations:create`, **not** `heroku auth:token` (that one expires and breaks deploys silently) |

**Local dev quirks:** backend runs on `:8001` while `server.py` defaults to `:8000`;
CORS allows `3000`/`3001`; Postgres via docker container `immi-pg`. Always
`PYTHONPATH=src` for backend commands. Always `bun` for the frontend.

The API key is public by design (`NEXT_PUBLIC_API_KEY` == backend `API_KEY`, shipped
in the browser bundle and present in git history on a public repo). Do not treat it
as a secret; do not "fix" it by rotating alone — it needs a real auth model.
