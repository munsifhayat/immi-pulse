# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IMMI-PULSE is an AI-powered immigration consulting platform, starting with Australia. It serves two audiences: immigration consultants (OMARA-registered agents) via a dashboard, and visa applicants via a public experience. The platform handles email intake, AI visa classification, document validation, checklist generation, and case management.

## Monorepo Structure

- `immi-pulse-be/` — Python FastAPI backend
- `immi-pulse-fe/` — Next.js 16 TypeScript frontend
- `context/` — Market research & implementation planning docs

## Development Commands

**IMPORTANT: Always use `bun` for frontend. Never use `npm`, `yarn`, or `pnpm`.**

### Frontend (`immi-pulse-fe/`)

```bash
bun install            # Install dependencies
bun run dev            # Next.js dev server
bun run build          # Production build
bun run lint           # ESLint
bun add <package>      # Add a dependency
bun add -d <package>   # Add a dev dependency
```

### Backend (`immi-pulse-be/`)

```bash
make install           # Install Python dependencies
make dev               # Run dev server (PYTHONPATH=src python -m app.core.server)
make test              # Run tests (PYTHONPATH=src pytest tests/ -v)
make migrate           # Apply migrations (PYTHONPATH=src alembic upgrade head)
make migration msg="X" # Create new Alembic migration
```

Backend requires `PYTHONPATH=src` prefix for all Python commands.

## Architecture

### Frontend

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Package manager**: Bun (always — never npm/yarn/pnpm)
- **Styling**: Tailwind CSS v4, shadcn/ui (Radix primitives), Framer Motion
- **Fonts**: Outfit (headings, `font-heading` class), Inter (body, `font-sans` default)
- **Data fetching**: TanStack React Query v5 with Axios
- **Path alias**: `@/*` maps to `src/*`

**Route groups** (`src/app/`):
- `(public)/` — Public website (no auth): home, for-consultants, for-applicants, features, pricing, about, get-started, blog
- `(console)/` — Consultant dashboard (auth required): dashboard with sub-routes
- `login/` — Authentication (shared, at root level)

**Public components**: `src/components/public/` — navbar, footer
**Console components**: `src/components/layout/` — sidebar, header
**UI primitives**: `src/components/ui/` — shadcn/ui components
**Shared animation utils**: `src/lib/motion.ts` — fadeUp, stagger variants for Framer Motion

**Design system** (CSS variables in `globals.css`):
- Navy `#101928` (primary dark), Purple `#7A5AF8` (primary accent), Purple Deep `#3E1C96` (dark accent)
- Purple Light `#BDB4FE`, Purple Muted `#D9D6FE` (light accents)
- Gray Text `#475367` (body text), Gray Light `#F0F2F5` (secondary bg), White `#FFFFFF` (background)
- Teal `#1B7B6F` (success/secondary), Teal Light `#2DD4BF`

**API layer**: `src/lib/api/client.ts` — Axios instance with X-API-Key header
**Auth**: `src/lib/auth.tsx` — Context-based auth via external TDOP service

### Backend

- **Framework**: FastAPI with async SQLAlchemy 2.0 + asyncpg (PostgreSQL)
- **Entry point**: `src/app/main.py` — app factory with CORS, middleware, routers
- **Config**: `src/app/core/config.py` — pydantic-settings, loaded from `.env`
- **AI Gateway**: `src/app/core/ai_gateway.py` — AWS Bedrock (Claude Haiku for analysis, Claude Sonnet for drafting)
- **Auth middleware**: `src/app/middleware/api_key_auth.py` — X-API-Key header validation

**Agent modules** (`src/app/agents/`): Each agent follows `router.py`, `service.py`, `models.py`, `schemas.py`:
- `invoice/`, `p1_classifier/`, `emergent_work/`, `compliance/` — Property Pulse agents (to be replaced with immigration agents in Phase 1)
- `shared/` — Shared models & activity tracking
- `unified/` — Unified classification pipeline ("Classify Once, Act Many")

**Integrations**: `src/app/integrations/microsoft/` — Microsoft 365 email via MSAL OAuth
**Background jobs**: APScheduler in `src/app/scheduler/jobs.py`
**Migrations**: Alembic in `migrations/` directory

### API Contract

Backend base URL: `http://localhost:8000/api/v1`
All protected endpoints require `X-API-Key` header.

### Environment Setup

- Backend: Copy `.env.example` to `.env` — requires PostgreSQL URL, AWS credentials, Microsoft 365 OAuth creds, encryption key
- Frontend: `.env.local` — `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_KEY`
- AWS Bedrock region: `ap-southeast-2`

## Implementation Status

- **Phase 0 (Public Site)**: Complete — 8 public pages with route groups, navbar/footer, design system
- **Phase 1 (Console)**: Pending — immigration agents, case management, visa knowledge base, document intelligence
