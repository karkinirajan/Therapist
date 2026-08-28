# Deployment

Status: **configuration prepared, not yet deployed.** Nothing here provisions live infrastructure by itself — it's the reference for when you're ready to actually deploy. No resources have been created, no domains purchased, no accounts set up, no EC2 instance launched.

Three deployment paths are documented. Pick one:

- **[Path A — Self-hosted EC2](#path-a--self-hosted-ec2-pm2--nginx--gunicorn)**: a single EC2 instance running Postgres, the FastAPI backend (Gunicorn + Uvicorn workers, managed by systemd), and the Next.js frontend (PM2), reverse-proxied by Nginx — all as native OS processes, no containers. Full control, one bill, no third-party PaaS account needed beyond AWS itself.
- **[Path B — Managed platforms](#path-b--managed-platforms-vercel--flyrender--neon)**: Vercel (frontend) + Fly.io/Render (backend) + Neon/Railway (Postgres). Less to operate yourself, but three separate accounts/bills.
- **[Path C — Docker Compose](#path-c--docker-compose-identical-devprod)** (recommended if you're reading this and want the same setup on your dev machine and in production): three containers — Postgres, FastAPI, Next.js — orchestrated by Docker Compose, with one command each for dev (hot reload) and prod (Gunicorn + Next.js production server). Runs identically on Arch/CachyOS, any other dev machine, or a bare EC2 instance with just Docker installed — no systemd units, no PM2, no Nginx to hand-configure.

All three share the same architecture principle: **the browser never calls the API origin directly.** Next.js Route Handlers under `apps/web/app/api/*` proxy to FastAPI server-side (see `apps/web/lib/auth-proxy.ts`). This is why the existing strict CSP (`connect-src 'self'` in `apps/web/next.config.ts`) doesn't need to change for production either way.

---

## Path A — Self-hosted EC2 (PM2 + Nginx + Gunicorn)

### Architecture on the box

```
Internet ──443/80──▶ Nginx ──▶ PM2: Next.js (127.0.0.1:3000)
                                        │
                                        │ server-side only, via API_BASE_URL
                                        ▼
                              systemd: Gunicorn+Uvicorn workers (127.0.0.1:8000)
                                        │
                                        ▼
                              Postgres (127.0.0.1:5432, same box)
```

FastAPI is bound to `127.0.0.1:8000` only — Nginx never routes to it, and it's not reachable from outside the box at all. Only the Next.js server (same machine) calls it, via the `API_BASE_URL` env var. This is deliberate, not an oversight: there's no reason to expose it publicly given the proxy architecture, and one less open port is one less thing to secure.

**Why Gunicorn + Uvicorn workers rather than plain Uvicorn:** Gunicorn is the process *manager* (worker respawning on crash, graceful reload, signal handling); Uvicorn's `UvicornWorker` class does the actual ASGI request serving. Plain `uvicorn --workers N` has no master process to restart a worker that dies or reload cleanly — Gunicorn adds exactly that layer, which matters once this is a long-running production process instead of a local dev server. Config: `apps/api/gunicorn.conf.py`.

**Why PM2 for the frontend:** the Next.js server needs to survive reboots, restart on crash, and be manageable without a raw `nohup`/`screen`. PM2 is the standard tool for that on a Node process. Config: `apps/web/ecosystem.config.cjs` (single instance — no PM2 cluster mode; see the comment in that file for why).

### Prerequisites

- An EC2 instance (Ubuntu 22.04 or 24.04 LTS; a `t3.small` or larger — `t3.micro` will be tight running Postgres + Node + Python together) with a security group allowing inbound 80/443 (and 22 for your own SSH access).
- A domain (or subdomain) you can point an A record at the instance's IP.
- SSH access to the box.
- If using Google sign-in in production: a **separate** Google OAuth client from your local-dev one (see [Google OAuth](#google-oauth-if-using-it) below).

### 1. Provision the box

SSH in, then from a checkout of this repo (or just download the two scripts):

```bash
git clone git@github.com:karkinirajan/Therapist.git /tmp/therapist-setup
cd /tmp/therapist-setup
sudo bash deploy/ec2/provision.sh
```

`deploy/ec2/provision.sh` installs Postgres, Nginx, Node 22, PM2, `uv`, creates a dedicated unprivileged `therapist` system user, and clones the repo to `/opt/therapist` owned by that user. It deliberately does **not** create the Postgres role/database automatically (prints the two commands to run by hand instead) — a password should never round-trip through a script's stdout/shell history.

Run the printed `sudo -u postgres psql` commands to create the `therapist` role and database.

### 2. Configure secrets

As the `therapist` user (`sudo -u therapist -i`), from `/opt/therapist`:

```bash
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env — at minimum:
#   DATABASE_URL=postgresql+asyncpg://therapist:<the-password-you-set>@localhost:5432/therapist
#   JWT_SECRET=<openssl rand -base64 48>
#   ENVIRONMENT=production
#   FRONTEND_URL=https://<your-domain>
#   CORS_ALLOW_ORIGINS=["https://<your-domain>"]
#   (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI if using Google sign-in)

echo 'API_BASE_URL=http://127.0.0.1:8000' > apps/web/.env.production.local
```

`apps/web/.env.production.local` is loaded automatically by Next.js for both `npm run build` and `npm run start` — no need to inject it via PM2's own env block. It's gitignored, same as `apps/api/.env`.

### 3. First deploy

Still as `therapist`, from `/opt/therapist`:

```bash
bash deploy/ec2/deploy.sh
```

This pulls `main`, installs/builds both apps, runs Alembic migrations, and (on a fresh box) will fail to restart services that don't exist yet — that's expected the first time. Then, as a `sudo`-capable user, wire up the actual process managers:

```bash
sudo cp deploy/ec2/therapist-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now therapist-api
sudo systemctl status therapist-api   # should be active (running)

sudo -u therapist bash -c 'cd /opt/therapist/apps/web && pm2 start ecosystem.config.cjs && pm2 save'
pm2 startup   # run the systemd command it prints, as root, so PM2 survives a reboot
```

### 4. Nginx + TLS

```bash
sudo cp deploy/ec2/nginx.conf /etc/nginx/sites-available/therapist
sudo nano /etc/nginx/sites-available/therapist   # replace app.yourdomain.com with your real domain
sudo ln -s /etc/nginx/sites-available/therapist /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.yourdomain.com   # provisions TLS and rewrites the Nginx server block for HTTPS + redirect
```

### 5. Subsequent deploys

```bash
sudo -u therapist bash -c 'cd /opt/therapist && bash deploy/ec2/deploy.sh'
```

`deploy/ec2/deploy.sh` pulls, rebuilds, migrates, and restarts both `therapist-api` (systemd) and `therapist-web` (PM2). This is the command a CI/CD job would ultimately SSH in and run — see [CI/CD](#cicd) below for wiring that up.

### Post-deploy checklist (EC2)

- [ ] `curl http://127.0.0.1:8000/health` on the box returns `{"status":"ok"}`
- [ ] `sudo systemctl status therapist-api` and `pm2 status` both show the processes running/online
- [ ] `journalctl -u therapist-api -n 50` shows Alembic ran cleanly on the last deploy, no errors
- [ ] `https://<your-domain>` loads over TLS with a valid certificate
- [ ] A real signup → login → refresh → logout flow works end-to-end
- [ ] `apps/api/.env`'s `JWT_SECRET` is a real random value, not the placeholder from `.env.example`, and the file is `chmod 600`
- [ ] Postgres is only listening on `localhost` (default on a fresh install) — confirm with `sudo ss -tlnp | grep 5432`, should show `127.0.0.1:5432` not `0.0.0.0:5432`
- [ ] The EC2 security group only allows inbound 80/443/22 — not 3000, 8000, or 5432 from the public internet

---

## Path B — Managed platforms (Vercel + Fly/Render + Neon)

- **Frontend** (`apps/web`) → Vercel.
- **Backend** (`apps/api`) → a container host with a persistent process — Render or Fly.io (`apps/api/fly.toml` is prepared for Fly; Render works from the same `Dockerfile` with a `render.yaml` if you prefer). Not Vercel serverless — the API holds a Postgres connection pool and isn't a good fit for cold-start-per-request functions.
- **Database** → managed Postgres (Neon or Railway both work; Neon's branching is convenient for preview environments).

### Prerequisites

- A Postgres instance (Neon, Railway, or Fly's own Postgres).
- A container host account (Fly.io or Render).
- A Vercel account/project.

### 1. Database

Provision a Postgres instance (Neon: free tier is fine to start). Note the connection string — you'll need an `asyncpg`-compatible URL:

```
postgresql+asyncpg://<user>:<password>@<host>/<db>?ssl=require
```

Neon/most managed providers require `ssl=require` (or an equivalent `sslmode` param).

### 2. Backend (`apps/api`)

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

`fly.toml`'s `[deploy] release_command = "alembic upgrade head"` runs migrations before new machines take traffic.

**Render** (alternative): use the same `Dockerfile`, set the same env vars in the dashboard, and add `alembic upgrade head` as Render's "Pre-Deploy Command".

Either way: `docs_url`/`redoc_url` are automatically disabled when `ENVIRONMENT=production` (see `apps/api/app/main.py`).

### 3. Frontend (`apps/web`)

In Vercel: **New Project → import this repo → set Root Directory to `apps/web`.** Vercel auto-detects Next.js, no `vercel.json` needed.

| Variable | Value | Notes |
|---|---|---|
| `API_BASE_URL` | `https://<your-api-domain>` | **Server-only** — no `NEXT_PUBLIC_*` prefix, must never reach the client bundle. |

### 4. DNS / domains

Point custom subdomains at each service (e.g. `app.yourdomain.com` → Vercel, `api.yourdomain.com` → Fly/Render) rather than the platform-assigned URLs long-term.

### Post-deploy checklist (managed)

- [ ] `curl https://<api-domain>/health` returns `{"status":"ok"}`
- [ ] Platform logs show `alembic upgrade head` ran cleanly
- [ ] A real signup → login → refresh → logout flow works end-to-end
- [ ] `CORS_ALLOW_ORIGINS` matches the exact production frontend origin
- [ ] `JWT_SECRET` is a real random value, not the local-dev placeholder

---

## Path C — Docker Compose (identical dev/prod)

### Architecture

```
Compose network (bridge, DNS resolves service names)

  postgres (5432 internal, published to host as ${POSTGRES_PORT:-5433})
       ▲
       │ depends_on: condition: service_healthy
       │
      api (Gunicorn+Uvicorn workers, 8000 internal — published to host
       │   in dev only, for direct debugging; NOT published in prod,
       │   same "frontend proxies to it, nothing else reaches it
       │   directly" posture as Path A)
       ▲
       │ API_BASE_URL=http://api:8000 (Compose service DNS, not localhost)
       │
      web (Next.js, 3000 internal — published to host as ${WEB_PORT:-3000}
           in both dev and prod)
```

Three files, layered by Compose:

- `docker-compose.yml` — base: all three services, production-shaped defaults (Gunicorn, Next.js production server, no bind mounts).
- `docker-compose.override.yml` — **auto-loaded** on top of the base file whenever you run plain `docker compose up` (Compose's own default behavior, no flags needed). Adds hot reload (bind-mounted source, `uvicorn --reload`, `next dev`) and a directly-published API port for debugging.
- `docker-compose.prod.yml` — **never auto-loaded**, always passed explicitly via `-f`. Requires real secrets (fails fast, not silently, if left as dev placeholders), adds restart policies and conservative resource limits.

### The two commands

**Dev** (CachyOS, any other dev machine, or even a spare EC2 box if you want to develop against a real instance):

```bash
cp .env.example .env   # once — see the vars below, dev defaults are safe as-is
docker compose up
```

One command. Brings up Postgres, runs Alembic migrations, starts FastAPI with `--reload` and Next.js with `next dev --turbopack` (hot reload on both). First run also builds both images and self-installs Python/Node deps inside named volumes (`api_venv`, `web_node_modules`) — a few minutes; subsequent runs are fast.

**Prod** (EC2, or anywhere Docker runs):

```bash
cp .env.example .env
# edit .env — at minimum set real values for:
#   JWT_SECRET        (openssl rand -base64 48, or the python3 one-liner in .env.example)
#   POSTGRES_PASSWORD  a real password, not the local-dev placeholder
#   FRONTEND_URL       your real deployed frontend origin, e.g. https://app.yourdomain.com
#   CORS_ALLOW_ORIGINS a JSON array matching FRONTEND_URL exactly, e.g. ["https://app.yourdomain.com"]
#   (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI if using Google sign-in)

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

One command, detached, production builds (Gunicorn workers, `next start`'s standalone server — no hot reload, no bind mounts, no dev tooling in the image). `docker-compose.prod.yml`'s `${VAR:?message}` guards mean this **refuses to start** with a clear error if `JWT_SECRET`/`POSTGRES_PASSWORD`/`FRONTEND_URL`/`CORS_ALLOW_ORIGINS` are left unset — it won't silently run with a weak/placeholder secret in production.

`make deploy` (root `Makefile`) is a shorter alias for the same command.

If you're putting this behind Nginx/a load balancer for TLS (recommended — Compose alone doesn't terminate HTTPS): point it at the host's published `${WEB_PORT:-3000}`, same as Path A's Nginx config points at PM2's port, just swap in the Docker-published port instead.

### Migrations

Run automatically, every `api` container start, before Gunicorn/Uvicorn takes over (`alembic upgrade head && exec ...` — see the `command:` in `docker-compose.yml`, with the reasoning for that choice over a separate one-shot migration service in the comment above it). `alembic upgrade head` is idempotent — a no-op if the schema's already current — so this is safe to run on every restart/redeploy, not just the first one.

### Worker sizing

`apps/api/gunicorn.conf.py`'s own default worker count is `(2 × CPU cores) + 1`, sized for a process running directly on a host. Inside a container with `docker-compose.prod.yml`'s resource limits, that can badly overshoot the memory budget on a many-core build/host machine (verified while building this: 25 workers on a 12-core box pinned a 512M limit at 100% immediately). `docker-compose.yml` sets `WEB_CONCURRENCY: ${WEB_CONCURRENCY:-2}` to keep this container-appropriate regardless of host core count — raise it (and `docker-compose.prod.yml`'s memory limit) together if your target instance is bigger than the conservative default assumes.

### Post-deploy checklist (Docker Compose, prod mode)

- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml ps` shows all three containers `healthy` (Docker's own `HEALTHCHECK`s in each Dockerfile, not just "running")
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml exec web node -e "fetch('http://api:8000/health').then(r=>r.text()).then(console.log)"` prints `{"status":"ok"}` — confirms the internal Compose network, not just each container in isolation
- [ ] `curl http://localhost:${WEB_PORT:-3000}/` returns 200 through the actual container (or your real domain, once Nginx/TLS is in front)
- [ ] A real signup → login → refresh → logout flow works end-to-end through the web container's proxy (not curled against the API directly — the API isn't published to the host in prod mode by design)
- [ ] `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs api` shows Alembic ran cleanly on this deploy, no errors
- [ ] `.env`'s `JWT_SECRET`/`POSTGRES_PASSWORD` are real random values, not the placeholders from `.env.example`, and `.env` is `chmod 600` and never committed
- [ ] Only the host ports you actually publish (80/443 if fronted by Nginx, or `${WEB_PORT:-3000}` directly) are open in your security group/firewall — the `api` service has no `ports:` in prod, so there's nothing to lock down there beyond the Docker network itself

### Rollback

`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` rebuilds and replaces containers in place. To roll back: `git checkout <previous-commit>` and re-run the same command — Compose will rebuild the previous images and recreate the containers. There's no separate "keep the old image around" step in this setup (unlike a tagged-image registry workflow) — if you need guaranteed instant rollback without a rebuild, tag and push images to a registry (ECR, Docker Hub) as part of your deploy step and reference the tag instead of building on the box; that's a reasonable next step once this is actually running in production, not included here since it needs a registry account/credentials decision.

---

## Google OAuth (if using it, either path)

In the Google Cloud Console, create a **second** OAuth 2.0 Client ID for production (keep the localhost one for local dev):

- Authorized redirect URI: `https://<your-domain>/auth/google/callback` — the **API's** own domain/path per the design in `apps/api/app/routers/oauth.py`. On the EC2 path, since the API isn't publicly exposed (see architecture diagram above), this means either exposing `/auth/google/*` specifically through Nginx to the backend, or routing the whole `/auth/google/*` prefix through Next.js's own proxy the same way `/api/auth/*` already works (`apps/web/app/api/auth/google/*/route.ts`) and pointing Google's redirect URI at the frontend domain instead — the app's existing frontend OAuth proxy routes already assume this pattern, so this is the simpler option on EC2.
- Set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI` as backend secrets.

If the OAuth consent screen requires domain verification, use a real custom domain (not a raw `*.vercel.app` or the EC2 instance's public DNS name) for the consent screen's homepage link — shared-platform subdomains can fail Google's homepage-verification check.

## CI/CD

`.github/workflows/ci.yml` runs lint/type-check/build/tests for both apps plus a Playwright e2e job on every push and PR against `main` — this already passes cleanly regardless of which deployment path you choose, since it doesn't deploy anything itself, only verifies the code.

Deployment is **not** automated yet on either path — wiring it up needs credentials only you should decide how to store:

- **EC2**: add a `deploy` job to `ci.yml` (gated to `main` pushes, or a manual `workflow_dispatch`) that SSHes in and runs `deploy/ec2/deploy.sh` — needs an `EC2_SSH_KEY` (and `EC2_HOST`/`EC2_USER`) repo secret. A minimal version:
  ```yaml
  - uses: appleboy/ssh-action@v1
    with:
      host: ${{ secrets.EC2_HOST }}
      username: therapist
      key: ${{ secrets.EC2_SSH_KEY }}
      script: cd /opt/therapist && bash deploy/ec2/deploy.sh
  ```
- **Managed platforms**: Vercel's own GitHub integration auto-deploys previews/production once the project is connected (Path B, step 3) — no custom Action needed. A Fly deploy-on-merge job needs a `FLY_API_TOKEN` secret.

Add whichever of these once you've decided who holds the deploy credentials — happy to wire it up at that point.
