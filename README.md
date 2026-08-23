# CBT Recovery & Life-Systems Coach

A structured, CBT-based personal recovery and accountability tool: a first-session intake, tracked check-ins, a gated 6-month roadmap, CBT technique guidelines, progress tracking, and a dedicated crisis-safety page.

This is **not** a psychiatrist, therapist, or crisis service. It's a text-based accountability layer around existing treatment — it doesn't diagnose, prescribe, or adjust medication. See [Safety](#safety) below.

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

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script     | Command               | Description                |
| ---------- | ---------------------- | --------------------------- |
| Dev        | `npm run dev`          | Dev server with Turbopack   |
| Build      | `npm run build`        | Production build            |
| Start      | `npm run start`        | Run production build        |
| Lint       | `npm run lint`         | ESLint (0 warnings allowed) |
| Type Check | `npm run type-check`   | TypeScript strict check     |

## Deployment

Deploys directly to [Vercel](https://vercel.com) or any Next.js-compatible host — no environment variables or external services are required.

```bash
npm run lint && npm run type-check && npm run build
```

CI (`.github/workflows/ci.yml`) runs the same three checks on every push and pull request against `main`.

## Project structure

```
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
  storage.ts           # localStorage-backed data hook + streak/phase logic
```

## Safety

If you are having thoughts of suicide or self-harm, this tool is not enough on its own:

**Call 1166 — Nepal Suicide Prevention Helpline** (toll-free, government-backed, WHO-supported, reachable from NTC and Ncell networks), and contact the prescriber who manages your medication.

The in-app [Safety](app/safety/page.tsx) page carries the full protocol and is reachable from every page via the "Crisis Support" button in the header.
