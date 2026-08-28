#!/usr/bin/env bash
# Redeploy the app on an already-provisioned EC2 box (see provision.sh for
# first-time setup). Run as the "therapist" user from anywhere inside the
# repo checkout. Pulls latest main, rebuilds both apps, runs migrations,
# restarts both processes. Not wired into CI - run manually over SSH, or
# call it from your own CI/CD job once you've decided how you want deploys
# triggered (a git push, a manual dispatch, etc.) and have SSH/secrets set
# up for that - this script is what that job would ultimately run.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "==> git pull"
git pull --ff-only origin main

echo "==> apps/api: sync deps + migrate"
(cd apps/api && uv sync --no-dev && uv run alembic upgrade head)

echo "==> apps/web: install + build"
npm ci
npm run build -w @therapist/web

echo "==> Restart services"
sudo systemctl restart therapist-api
pm2 reload apps/web/ecosystem.config.cjs

echo "==> Health check"
sleep 2
curl -sf http://127.0.0.1:8000/health && echo " - API OK"
curl -sf http://127.0.0.1:3000/ -o /dev/null && echo "Web OK"
