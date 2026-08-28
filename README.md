# CBT Recovery & Life-Systems Coach

A structured, CBT-based accountability platform for **ADHD and OCD**: an intake baseline, daily/weekly/monthly tracking across six categories, a gated 6-month roadmap, CBT/ERP technique guidelines, streaks and progress review, and a dedicated crisis-safety page that's always reachable.

This is **not** a psychiatrist, therapist, or crisis service. It's a structured accountability layer around existing treatment — it doesn't diagnose, prescribe, or adjust medication. See [Safety](#safety) below.

## Features

- **Accounts** — email/password or Google sign-in, real per-user data isolation.
- **Intake** — a one-time baseline (mood, anxiety, sleep, energy, medication adherence, the three off-track areas, what's already working, non-negotiables, check-in cadence). Redoable later.
- **Tracking** — six categories (Executive Function, Compulsion/ERP, Mood & Anxiety, Behavioral Activation, Sleep & Medication, Distortion Awareness), each with daily/weekly/monthly entries. Four of the six **hard-gate** the rest of the app until today's entry is logged — server-enforced, not just a UI nag.
- **Check-in** — quick numbers, one real event that worked/didn't, exactly one CBT tool per session (thought record, behavioral activation, graded exposure/ERP, or a behavioral experiment), a single piece of homework, streaks.
- **Roadmap** — four phases over 24 weeks, each gated behind its own success metric (the first two computed server-side from real check-in data, not self-reported). Advancing early is allowed but explicitly flagged, never silent.
- **CBT Tools** — the underlying framework, a glossary of cognitive distortions (including OCD-specific ones like thought-action fusion), a build-your-own exposure/ERP hierarchy.
- **Progress** — trend charts, adherence and homework streaks, log history, data export.
- **Safety** — always reachable regardless of auth/gate state. Crisis trigger conditions, a tap-to-call crisis helpline, and the medication rule (never start/stop/change dose here — flag it for the prescriber).
- **Marketing/legal** — `/about`, `/policy` (privacy policy), `/terms`, `/faq`, with real written content.

## Tech stack

| Layer      | Technology                                    |
| ---------- | ---------------------------------------------- |
| Frontend   | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 (strict) |
| Styling    | Tailwind CSS v4, Base UI + shadcn-style primitives |
| Backend    | FastAPI, Python 3.12+, SQLAlchemy 2.0 (async), Alembic |
| Database   | PostgreSQL                                     |
| Auth       | argon2id password hashing, JWT access tokens, rotating httpOnly refresh cookies, Google OAuth (PKCE) |
| Testing    | pytest (backend, 75+ tests), Playwright (e2e), ESLint/tsc (frontend) |

The browser never talks to the API directly — Next.js Route Handlers proxy to FastAPI server-side (`apps/web/lib/auth-proxy.ts`), so the API origin, refresh cookie, and any backend secrets never reach client JavaScript.

## Repo layout

```
apps/
  web/                 # Next.js frontend
    app/                 # Routes — marketing, auth, and the authenticated app
    components/          # Shared UI primitives + feature components
    lib/                 # API client (React Query), auth proxy helper, legacy localStorage hook
    proxy.ts             # Next.js 16 "proxy" (formerly middleware) — UX-only auth redirect
  api/                  # FastAPI backend
    app/
      main.py              # App entrypoint
      core/                 # Settings, security (JWT/argon2), rate limiting, gating dependency
      db/                   # SQLAlchemy session/engine
      models/               # ORM models
      schemas/              # Pydantic request/response schemas
      repositories/         # Only layer touching the ORM
      services/             # Business logic, transaction boundaries
      routers/               # Thin HTTP layer
    alembic/                # Migrations
    gunicorn.conf.py        # Production entrypoint config (Gunicorn + Uvicorn workers)
    fly.toml                 # Fly.io deploy config
deploy/ec2/            # Self-hosted EC2 deployment: systemd unit, Nginx site config, provision/deploy scripts
docker-compose.yml     # Local Postgres only
DEPLOYMENT.md          # Full deployment walkthrough (EC2 and managed-platform paths)
```

---

## Development

Everything you need to set up **from scratch** to start contributing.

### Prerequisites (install these yourself — nothing here does it for you)

| Tool | Version | Check |
|---|---|---|
| [Node.js](https://nodejs.org) | 22+ | `node --version` |
| [npm](https://www.npmjs.com) | comes with Node | `npm --version` |
| [Python](https://www.python.org) | 3.12+ | `python3 --version` |
| [uv](https://docs.astral.sh/uv/) | latest | `uv --version` |
| [Docker](https://www.docker.com) + Docker Compose | latest | `docker compose version` |

If you don't already have `uv`: `curl -LsSf https://astral.sh/uv/install.sh | sh`.

### One-time setup

```bash
git clone git@github.com:karkinirajan/Therapist.git
cd therapist

# Frontend deps (npm workspaces — installs apps/web's deps too)
npm install

# Backend deps
cd apps/api
uv sync
cp .env.example .env
cd ../..
```

`apps/api/.env` is gitignored — the copied `.env.example` has working local defaults (points at the Docker Postgres below) except `JWT_SECRET`, which you should replace with a real random value even for local dev:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
# paste the output into apps/api/.env's JWT_SECRET=
```

If you want Google sign-in working locally, also fill in `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` from a Google Cloud OAuth client with redirect URI `http://localhost:8000/auth/google/callback` — everything else works without it.

### Development conventions

- Backend layering is enforced by convention, not tooling: `routers → services → repositories → models`. Routers never touch `AsyncSession` directly; only repositories run queries.
- Frontend data fetching goes through React Query hooks in `apps/web/lib/api-client.ts`/`lib/api.ts` calling the same-origin proxy — never `fetch` the API origin directly from a client component.
- New DB schema changes need an Alembic migration (`cd apps/api && uv run alembic revision --autogenerate -m "..."`, then review the generated file by hand before committing — autogenerate misses some things, e.g. it won't drop a Postgres enum type on downgrade without you adding that explicitly).
- Both apps must pass their full check suite before a PR is expected to merge (see [Running locally](#running-locally)'s verification commands) — this is exactly what CI runs.

---

## Running locally

### 1. Start Postgres

```bash
docker compose up -d postgres
```

Runs on `localhost:5433` (not 5432 — chosen to avoid colliding with a system-wide Postgres install; adjust `POSTGRES_PORT` in a root `.env` — copy from `.env.example` — if you need a different port).

### 2. Start the backend

```bash
cd apps/api
uv run alembic upgrade head       # apply migrations — required before first run
uv run uvicorn app.main:app --reload
```

API: [http://localhost:8000](http://localhost:8000). Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs) (only enabled outside `ENVIRONMENT=production`).

### 3. Start the frontend

```bash
npm run dev
```

Frontend: [http://localhost:3000](http://localhost:3000).

### Verifying your setup

```bash
# Backend — from apps/api
uv run ruff check .        # lint
uv run pytest -q           # 75+ tests, self-provisions its own therapist_test database
uv run mypy app            # type check (informational — not a CI gate; a few pre-existing warnings are expected, see inline comments)

# Frontend — from repo root
npm run lint -w @therapist/web
npm run type-check -w @therapist/web
npm run build -w @therapist/web
npm run test:e2e -w @therapist/web    # Playwright — needs the backend + Postgres running (see above), and `npx playwright install chromium` once
```

All of the above are exactly what `.github/workflows/ci.yml` runs on every push/PR.

### Scripts reference (run from repo root unless noted)

| Script | Command | Description |
| --- | --- | --- |
| Dev | `npm run dev` | Web dev server with Turbopack |
| Build | `npm run build` | Web production build |
| Start | `npm run start` | Run the web production build |
| Lint | `npm run lint` | ESLint (0 warnings allowed) |
| Type Check | `npm run type-check` | TypeScript strict check |
| API lint | `uv run ruff check .` (from `apps/api`) | Ruff |
| API tests | `uv run pytest -q` (from `apps/api`) | pytest |
| API dev server | `uv run uvicorn app.main:app --reload` (from `apps/api`) | Dev-mode FastAPI, auto-reload |
| API prod entrypoint | `uv run gunicorn -c gunicorn.conf.py app.main:app` (from `apps/api`) | What actually runs in production — see [Deployment](#deployment) |

---

## Deployment

**Nothing is deployed yet.** All of the following is prepared configuration for when you're ready — no live infrastructure, accounts, or domains exist because of anything in this repo.

Two paths are documented in **[DEPLOYMENT.md](DEPLOYMENT.md)** — read that file for the actual step-by-step, this is just the summary of what you'll need to set up yourself:

### Path A — Self-hosted EC2 (PM2 + Nginx + Gunicorn)

What you need to create/decide manually before following `DEPLOYMENT.md`:
- An AWS account and an EC2 instance (Ubuntu 22.04/24.04, `t3.small`+), with a security group allowing inbound 80/443/22 only.
- A domain (or subdomain) you can point an A record at the instance.
- SSH access set up.
- If using Google sign-in: a second, production-only Google OAuth client.

`DEPLOYMENT.md` then walks through: running `deploy/ec2/provision.sh` (installs Postgres/Nginx/Node/PM2/uv, creates a dedicated `therapist` system user), manually creating the Postgres role/database (deliberately not scripted — a password shouldn't round-trip through a script), filling in `apps/api/.env` and `apps/web/.env.production.local` with real secrets, running `deploy/ec2/deploy.sh`, installing `deploy/ec2/therapist-api.service` (systemd) and `deploy/ec2/nginx.conf`, and provisioning TLS via `certbot`.

### Path B — Managed platforms (Vercel + Fly/Render + Neon)

What you need to create manually: a Vercel account/project (frontend), a Fly.io or Render account (backend — `apps/api/fly.toml` is prepared for Fly), a managed Postgres instance (Neon or Railway), and again a separate production Google OAuth client if using Google sign-in.

### Either path

- CI (`.github/workflows/ci.yml`) already runs lint/type-check/build/tests for both apps, a Gunicorn boot smoke-test, and a Playwright e2e job on every push/PR against `main` — this passes independent of which deployment path you pick, since it doesn't deploy anything itself.
- Actual deploy automation (a GitHub Actions job that SSHes into EC2, or that triggers a Fly deploy) isn't wired up yet — it needs credentials (`EC2_SSH_KEY` or `FLY_API_TOKEN`) that only you should decide how to store as repo secrets. `DEPLOYMENT.md`'s CI/CD section has a ready-to-use snippet for the EC2 case once you're ready.

---

## Safety

If you are having thoughts of suicide or self-harm, this tool is not enough on its own:

**Call 1166 — Nepal Suicide Prevention Helpline** (toll-free, government-backed, WHO-supported, reachable from NTC and Ncell networks), or your own country's emergency/crisis line if you're elsewhere (e.g. 988 in the US, 111 in the UK, 112 in most of the EU) — and contact the prescriber who manages your medication.

The in-app [Safety](apps/web/app/safety/page.tsx) page carries the full protocol and is reachable from every page via the "Crisis Support" button in the header, with no auth or gate required.
