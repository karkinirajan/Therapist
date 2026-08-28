# Deployment

Status: **configuration prepared, not yet deployed.** Nothing here provisions live infrastructure by itself — it's the reference for when you're ready to actually deploy. No resources have been created, no domains purchased, no accounts set up.

## Architecture

- **Frontend** (`apps/web`, Next.js) → Vercel.
- **Backend** (`apps/api`, FastAPI) → a container host with a persistent process (Render or Fly.io — `apps/api/fly.toml` is prepared for Fly; Render works from the same `Dockerfile` with a `render.yaml` if you prefer it instead). Not Vercel serverless — the API holds a Postgres connection pool and isn't a good fit for cold-start-per-request functions.
- **Database** → managed Postgres (Neon or Railway both work; Neon's branching is convenient for preview environments).
- **The browser never calls the API origin directly.** Next.js Route Handlers under `apps/web/app/api/*` proxy to FastAPI server-side (see `apps/web/lib/auth-proxy.ts`). This is why the existing strict CSP (`connect-src 'self'` in `apps/web/next.config.ts`) doesn't need to change for production, and why FastAPI's CORS allowlist is defense-in-depth rather than something the browser depends on.

## Prerequisites

- A Postgres instance reachable from wherever the API runs (Neon, Railway, or Fly's own Postgres).
- A container host account (Fly.io or Render).
- A Vercel account/project.
- If using Google sign-in in production: a **separate** Google OAuth client from your local-dev one, with its own redirect URI (see below) — don't reuse the localhost client.

## 1. Database

Provision a Postgres instance (Neon: free tier is fine to start). Note the connection string — you'll need an `asyncpg`-compatible URL:

```
postgresql+asyncpg://<user>:<password>@<host>/<db>?ssl=require
```

Neon/most managed providers require `ssl=require` (or an equivalent `sslmode` param) — the local dev `DATABASE_URL` in `apps/api/.env.example` doesn't need this since it's a local, unencrypted connection.

## 2. Backend (`apps/api`)

**Fly.io** (config already in `apps/api/fly.toml`):

```bash
cd apps/api
flyctl launch --no-deploy         # creates the app from fly.toml, don't deploy yet
flyctl secrets set \
  DATABASE_URL='postgresql+asyncpg://...' \
  JWT_SECRET="$(openssl rand -base64 48)" \
  GOOGLE_CLIENT_ID='...' \
  GOOGLE_CLIENT_SECRET='...' \
  GOOGLE_REDIRECT_URI='https://<your-api-domain>/auth/google/callback' \
  FRONTEND_URL='https://<your-vercel-domain>' \
  CORS_ALLOW_ORIGINS='["https://<your-vercel-domain>"]'
flyctl deploy
```

`fly.toml`'s `[deploy] release_command = "alembic upgrade head"` runs migrations before new machines take traffic — never run migrations manually against production alongside a live deploy.

**Render** (alternative): use the same `Dockerfile`, set the same env vars in the dashboard, and add `alembic upgrade head` as Render's "Pre-Deploy Command" (Render's equivalent of Fly's release_command).

Either way: `docs_url`/`redoc_url` are automatically disabled when `ENVIRONMENT=production` (see `apps/api/app/main.py`) — don't override that.

## 3. Frontend (`apps/web`)

In Vercel: **New Project → import this repo → set Root Directory to `apps/web`.** Vercel auto-detects Next.js, no `vercel.json` needed for the basic build.

Environment variables (Vercel dashboard, Production + Preview as appropriate):

| Variable | Value | Notes |
|---|---|---|
| `API_BASE_URL` | `https://<your-api-domain>` | **Server-only** — do not prefix `NEXT_PUBLIC_*`, it must never reach the client bundle (see `apps/web/lib/auth-proxy.ts`'s comment on why). |

That's the only one required — the frontend has no other server secrets (it never talks to Postgres or holds the JWT secret).

## 4. Google OAuth (if using it)

In the Google Cloud Console, create a **second** OAuth 2.0 Client ID for production (keep the localhost one for local dev):

- Authorized redirect URI: `https://<your-api-domain>/auth/google/callback` (the API's own domain, per the design in `apps/api/app/routers/oauth.py` — not the Vercel domain).
- Set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` as API secrets (step 2).

If the OAuth consent screen requires domain verification, see the vault note on Google's homepage-verification checks rejecting shared-platform subdomains if you hit that — use a custom domain on the frontend rather than the raw `*.vercel.app` URL for the consent screen's homepage link.

## 5. DNS / domains

Point custom subdomains at each service (e.g. `app.yourdomain.com` → Vercel, `api.yourdomain.com` → Fly/Render) rather than using the platform-assigned URLs long-term — this also sidesteps the Google OAuth verification issue above. Both platforms issue TLS automatically once DNS is pointed correctly.

## 6. Post-deploy checklist

- [ ] `curl https://<api-domain>/health` returns `{"status":"ok"}`
- [ ] `flyctl logs` / Render logs show `alembic upgrade head` ran cleanly with no errors
- [ ] A real signup → login → refresh → logout flow works end-to-end against the deployed frontend
- [ ] `CORS_ALLOW_ORIGINS` matches the exact production frontend origin (scheme + host, no trailing slash)
- [ ] `apps/web`'s CSP (`next.config.ts`) still reflects `connect-src 'self'` only — if anything ever needs a direct client-side call to a third-party origin, that CSP has to be deliberately widened, not silently broken
- [ ] Rotate/verify `JWT_SECRET` is a real random value, not the local-dev placeholder from `.env.example`

## CI/CD

`.github/workflows/ci.yml` runs lint/type-check/build/tests/e2e on every push and PR — deployment itself is not automated yet (no deploy job exists, since it would need `FLY_API_TOKEN`/`VERCEL_TOKEN` secrets configured in the repo, which is a decision for whoever owns deploy credentials, not something to wire up silently). Vercel's own GitHub integration will auto-deploy previews/production once the project is connected in step 3, without needing a custom Action. A Fly deploy-on-merge workflow can be added once `flyctl` auth is set up — happy to add that when you're ready to actually deploy.
