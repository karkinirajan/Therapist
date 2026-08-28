# Deployment

Status: **configuration prepared, not yet deployed.** Nothing here provisions live infrastructure by itself — it's the reference for when you're ready to actually deploy. No resources have been created, no domains purchased, no accounts set up, no EC2 instance launched.

Two deployment paths are documented. Pick one:

- **[Path A — Self-hosted EC2](#path-a--self-hosted-ec2-pm2--nginx--gunicorn)** (recommended if you're reading this): a single EC2 instance running Postgres, the FastAPI backend (Gunicorn + Uvicorn workers, managed by systemd), and the Next.js frontend (PM2), reverse-proxied by Nginx. Full control, one bill, no third-party PaaS account needed beyond AWS itself.
- **[Path B — Managed platforms](#path-b--managed-platforms-vercel--flyrender--neon)**: Vercel (frontend) + Fly.io/Render (backend) + Neon/Railway (Postgres). Less to operate yourself, but three separate accounts/bills.

Both share the same architecture principle: **the browser never calls the API origin directly.** Next.js Route Handlers under `apps/web/app/api/*` proxy to FastAPI server-side (see `apps/web/lib/auth-proxy.ts`). This is why the existing strict CSP (`connect-src 'self'` in `apps/web/next.config.ts`) doesn't need to change for production either way.

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
