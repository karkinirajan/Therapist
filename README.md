# CBT Recovery & Life-Systems Coach

A structured, CBT-based personal recovery and accountability tool: a first-session intake, tracked check-ins, a gated 6-month roadmap, CBT technique guidelines, progress tracking, and a dedicated crisis-safety page.

This is **not** a psychiatrist, therapist, or crisis service. It's a text-based accountability layer around existing treatment — it doesn't diagnose, prescribe, or adjust medication. See [Safety](#safety) below.

> **In progress**: this repo is being rebuilt as a multi-user, account-based, ADHD/OCD-focused platform (Next.js frontend + FastAPI/PostgreSQL backend). The description below still reflects the current single-user, localStorage-only build in `apps/web`; it will be rewritten as the overhaul lands.

## Privacy

**All data stays on this device.** There is no backend, no database, and no account — every check-in, the baseline snapshot, and the exposure hierarchy are stored in the browser's `localStorage` only. Nothing is transmitted anywhere. Use **Progress → Export backup** periodically, since clearing browser data clears everything.

## Features

- **Intake** — a one-time baseline (mood, anxiety, sleep, energy, medication adherence, the three off-track areas, what's already working, non-negotiables, check-in cadence).
- **Check-in** — quick numbers, one real event that worked/didn't, exactly one CBT tool per session (thought record, behavioral activation, graded exposure, or a behavioral experiment), a single piece of homework, and a generated `CBT-LOG` block to save and paste back next time.
- **Roadmap** — four phases over 24 weeks (Stabilize → Structure → Rebuild career traction → Compound & stress-test), each gated behind its own success metric. Advancing early is allowed but explicitly flagged, never silent.
- **CBT Tools** — the underlying framework (cognitive restructuring, behavioral activation, graded exposure, behavioral experiments, values-based goal-setting), a glossary of the eight named cognitive distortions, a build-your-own exposure hierarchy, and a pull of past thought records/experiments.
- **Progress** — a mood/anxiety trend chart, adherence and homework streaks, a phase timeline, full log history, a cold numbers-first 6-month review once there's enough data, and JSON export/import/reset.
- **Safety** — crisis trigger conditions, the Nepal 1166 Suicide Prevention Helpline as a tap-to-call button, and the medication rule (never start/stop/change dose here — flag it for the prescriber).

## Tech stack

| Layer      | Technology                        |
| ---------- | ---------------------------------- |
| Framework  | Next.js 16 (App Router, Turbopack) |
| UI         | React 19, TypeScript 5 (strict)    |
| Styling    | Tailwind CSS v4                    |
| Components | Base UI + shadcn-style primitives  |
| Icons      | Lucide React                       |
| Storage    | Browser `localStorage` only        |

No database, no auth, no environment variables required.

## Local development

This is an npm-workspaces monorepo: `apps/web` (Next.js) and `apps/api` (FastAPI), sharing one PostgreSQL instance via Docker Compose.

```bash
# 1. Database
docker compose up -d postgres

# 2. Frontend (from repo root — npm workspaces)
npm install
npm run dev

# 3. Backend
cd apps/api
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload
```

Frontend: [http://localhost:3000](http://localhost:3000). API: [http://localhost:8000/docs](http://localhost:8000/docs).

## Scripts (run from repo root)

| Script     | Command               | Description                |
| ---------- | ---------------------- | --------------------------- |
| Dev        | `npm run dev`          | Web dev server with Turbopack |
| Build      | `npm run build`        | Web production build        |
| Start      | `npm run start`        | Run web production build    |
| Lint       | `npm run lint`         | ESLint (0 warnings allowed) |
| Type Check | `npm run type-check`   | TypeScript strict check     |

API checks (from `apps/api`): `uv run ruff check .`, `uv run pytest`.

## Deployment

Frontend deploys to [Vercel](https://vercel.com) (project root: `apps/web`). The API is a standalone Docker service intended for a container host (Render/Fly) with a managed Postgres instance — see `apps/api/Dockerfile`.

CI (`.github/workflows/ci.yml`) runs lint/type-check/build for the web app and lint for the API on every push and pull request against `main`.

## Project structure

```
apps/
  web/                 # Next.js frontend
    app/
      layout.tsx        # Root layout — nav, footer, metadata
      page.tsx           # Dashboard
      intake/             # First-session intake
      checkin/            # Standard check-in flow
      roadmap/            # 6-month phased roadmap
      tools/              # CBT framework, distortions, exposure hierarchy
      progress/           # Trend chart, streaks, log history, data export
      safety/             # Crisis protocol (always accessible, no gating)
    components/
      ui/                 # Shared primitives (button, card, input, etc.)
      *.tsx               # Feature components (nav, scale-input, trend-chart, ...)
    lib/
      types.ts            # Data model
      constants.ts        # Roadmap phases, distortions, crisis copy
      storage.ts           # localStorage-backed data hook + streak/phase logic (being replaced by the API)
  api/                  # FastAPI backend
    app/
      main.py             # App entrypoint
      core/                # Settings, security (auth, JWT, hashing)
      db/                  # SQLAlchemy session/engine
      models/              # ORM models
      schemas/             # Pydantic request/response schemas
      repositories/        # Only layer touching the ORM
      services/            # Business logic, transaction boundaries
      routers/              # Thin HTTP layer
    alembic/               # Migrations
docker-compose.yml     # Local Postgres
```

## Safety

If you are having thoughts of suicide or self-harm, this tool is not enough on its own:

**Call 1166 — Nepal Suicide Prevention Helpline** (toll-free, government-backed, WHO-supported, reachable from NTC and Ncell networks), and contact the prescriber who manages your medication.

The in-app [Safety](app/safety/page.tsx) page carries the full protocol and is reachable from every page via the "Crisis Support" button in the header.
