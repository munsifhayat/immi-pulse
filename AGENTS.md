# AGENTS.md

See `CLAUDE.md` for the full architecture overview and standard development commands. This file captures durable, non-obvious guidance for agents working in this repo.

## Cursor Cloud specific instructions

This is a monorepo with two independently-run services. The update script installs their dependencies on startup; you still start the services yourself.

### Services

| Service | Dir | Start command | Port |
|---|---|---|---|
| Backend (FastAPI) | `immi-pulse-be` | `. .venv/bin/activate && make dev` | 8000 |
| Frontend (Next.js) | `immi-pulse-fe` | `bun run dev` | 3000 |

Standard lint/test/build commands are in `CLAUDE.md`, the backend `Makefile`, and `immi-pulse-fe/package.json`. Use **Bun** for the frontend (never npm/yarn/pnpm).

### Non-obvious setup / run notes

- **Backend Python runs in a virtualenv at `immi-pulse-be/.venv`** (created by the update script). Activate it before any backend command: `cd immi-pulse-be && . .venv/bin/activate`. The `Makefile` targets assume the active venv and require `PYTHONPATH=src` (already baked into the targets).
- **`make install` only installs `requirements/base.txt`.** Dev/test tools (`pytest`, `ruff`) live in `requirements/dev.txt`; the update script installs that superset.
- **PostgreSQL is required** and is not auto-provisioned by the app. On this VM it is installed as an apt cluster; start it with `sudo pg_ctlcluster 16 main start` if it is not already running (it does not auto-start on boot). DB `immi_pulse` with user/password `postgres`/`postgres` matches the default `DATABASE_URL`.
- **Migrations are not automatic.** After the DB is up, run `cd immi-pulse-be && . .venv/bin/activate && make migrate` before first run (and after pulling new migrations).
- **`.env` files are gitignored and must exist locally.** Backend reads `immi-pulse-be/.env` (copy from `.env.example`); frontend reads `immi-pulse-fe/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` and `NEXT_PUBLIC_API_KEY` set to the backend's `API_KEY`. The two API keys **must match** or all protected `/api/v1/*` calls fail with 401 (public paths like `/health`, `/docs`, `/auth/signup`, `/auth/login`, community/questionnaire are exempt).
- **External services degrade gracefully** — the product is fully testable with only Postgres + backend + frontend. OpenAI (AI triage) falls back to a heuristic, AWS S3 falls back to local `./uploads`, and Microsoft 365 / Resend features simply no-op when their secrets are unset.
- **For local signup testing set `BREACH_CHECK_ENABLED=false`** in the backend `.env` to avoid the external Pwned Passwords API. Also note the signup password policy rejects passwords that are too similar to the name/email.
- **`bun` is installed at `~/.bun/bin`** and added to PATH via `~/.bashrc`; in non-login shells run `export PATH="$HOME/.bun/bin:$PATH"` first.
