#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 22.04/24.04 EC2 instance. Run manually
# via SSH as a sudo-capable user - this is not wired into CI and nothing
# runs it automatically. Idempotent-ish (safe to re-run), but written for a
# clean box, not for patching an already-customized one.
#
# What this does NOT do: open security-group ports, attach an Elastic IP,
# set up a domain/DNS, or touch AWS resources at all - that's console/CLI
# work outside the instance itself. See DEPLOYMENT.md for the full picture.
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:karkinirajan/Therapist.git}"
APP_DIR="/opt/therapist"
APP_USER="therapist"

echo "==> System packages"
sudo apt-get update
sudo apt-get install -y curl git nginx postgresql postgresql-contrib \
  build-essential ca-certificates gnupg

echo "==> Node.js 22 (NodeSource) + PM2"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

echo "==> Dedicated app user"
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  sudo useradd --create-home --shell /bin/bash "$APP_USER"
fi

echo "==> uv (for the $APP_USER user)"
sudo -u "$APP_USER" bash -c 'curl -LsSf https://astral.sh/uv/install.sh | sh'

echo "==> Clone the repo into $APP_DIR"
sudo mkdir -p "$APP_DIR"
sudo chown "$APP_USER:$APP_USER" "$APP_DIR"
sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR" 2>/dev/null || \
  echo "  (already cloned, skipping)"

echo "==> Postgres: create the app database + role"
echo "    Skipping automatic creation - run this manually so the password"
echo "    is never captured in shell history or a script:"
echo ""
echo "    sudo -u postgres psql"
echo "    CREATE ROLE therapist WITH LOGIN PASSWORD '<choose-a-real-password>';"
echo "    CREATE DATABASE therapist OWNER therapist;"
echo "    \\q"
echo ""

echo "==> Next steps (manual, deliberately not scripted - see DEPLOYMENT.md):"
echo "    1. Create $APP_DIR/apps/api/.env  (DATABASE_URL, JWT_SECRET, ...)"
echo "    2. Create $APP_DIR/apps/web/.env.production.local (API_BASE_URL)"
echo "    3. Run deploy/ec2/deploy.sh as $APP_USER to build + start everything"
echo "    4. sudo cp deploy/ec2/therapist-api.service /etc/systemd/system/ && systemctl enable --now therapist-api"
echo "    5. sudo cp deploy/ec2/nginx.conf /etc/nginx/sites-available/therapist (edit server_name first), symlink into sites-enabled, nginx -t, reload"
echo "    6. sudo certbot --nginx -d <your-domain>  (installs certbot first if needed: apt-get install python3-certbot-nginx)"
echo "    7. pm2 startup   # follow its printed instructions to survive reboots"
