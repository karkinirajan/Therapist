# Deployment — EC2, Docker Compose, step by step

Ordered checklist. Run everything from repo root unless noted. Replace `app.yourdomain.com`, `YOUR_EC2_IP`, and secrets with real values.

## 1. Launch the EC2 instance

- [ ] Launch instance: Ubuntu 24.04 LTS, `t3.small` minimum (2GB RAM — `t3.micro` will OOM under `npm ci`/build)
- [ ] Security group inbound rules: `22` (your IP only), `80` (0.0.0.0/0), `443` (0.0.0.0/0)
- [ ] Allocate + associate an Elastic IP
- [ ] Point DNS: A record `app.yourdomain.com` → Elastic IP

## 2. Provision the instance

SSH in:
```
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

Run:
```
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx git

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Swap (t3.small has 2GB RAM, prevents OOM during `npm run build`)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 3. Clone and configure

```
git clone git@github.com:karkinirajan/therapist.git
cd therapist
cp .env.example .env
```

Edit `.env` — set every `REQUIRED for prod` value:
```
nano .env
```
- `POSTGRES_PASSWORD` — real random value
- `JWT_SECRET` — `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`
- `FRONTEND_URL=https://app.yourdomain.com`
- `CORS_ALLOW_ORIGINS=["https://app.yourdomain.com"]`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI=https://app.yourdomain.com/api/auth/google-exchange` — only if Google sign-in is used
- `NEXT_PUBLIC_SITE_URL=https://app.yourdomain.com` (add this line — used by sitemap/OG/manifest)

## 4. Build and start the stack

```
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
This builds `api` + `web`, starts `postgres`, and runs `alembic upgrade head` automatically on `api` container start.

Verify:
```
docker compose ps
docker compose logs -f api    # watch migration + gunicorn startup, ctrl-C when healthy
curl -s http://127.0.0.1:8000/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

## 5. Nginx reverse proxy + TLS

```
sudo cp deploy/ec2/nginx.conf /etc/nginx/sites-available/therapist
sudo sed -i 's/app.yourdomain.com/app.yourdomain.com/' /etc/nginx/sites-available/therapist   # confirm domain is correct
sudo ln -s /etc/nginx/sites-available/therapist /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d app.yourdomain.com
```
Certbot rewrites the Nginx server block to redirect 80→443 and auto-renews via its own systemd timer (`sudo systemctl status certbot.timer` to confirm).

## 6. Auto-start on reboot

```
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```
Restart policy is already `unless-stopped` in `docker-compose.prod.yml`, and Docker's own systemd service (`docker.service`) starts on boot by default — confirm:
```
sudo systemctl is-enabled docker
```
If not enabled: `sudo systemctl enable docker`

## 7. Create the admin/first user

```
curl -s -X POST https://app.yourdomain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-real-password-8chars-min"}'
```

## 8. Post-deploy verification

- [ ] `curl -sI https://app.yourdomain.com/` → `200`, check `Strict-Transport-Security` header present
- [ ] Visit site in browser, sign up / log in, confirm dashboard loads
- [ ] `docker compose logs api --tail=50` — no errors
- [ ] `curl -s https://app.yourdomain.com/robots.txt` and `/sitemap.xml` resolve
- [ ] Lighthouse audit against the live URL (desktop + mobile) — expect Accessibility 100 / SEO 100 / Best Practices 96

## 9. Backups

```
# One-off dump
docker compose exec postgres pg_dump -U therapist therapist > backup-$(date +%F).sql

# Cron: daily 3am dump, keep 7 days
( crontab -l 2>/dev/null; echo "0 3 * * * cd $(pwd) && docker compose exec -T postgres pg_dump -U therapist therapist > /home/ubuntu/backups/therapist-\$(date +\%F).sql && find /home/ubuntu/backups -mtime +7 -delete" ) | crontab -
mkdir -p /home/ubuntu/backups
```

## 10. Redeploying after a code change

```
cd therapist
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
Migrations re-run automatically (idempotent) on `api` container start.

## Rollback

```
git log --oneline -5
git checkout <previous-good-commit>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
Note: if the rollback needs a schema downgrade, run `docker compose exec api alembic downgrade -1` before rebuilding — check `alembic/versions/` for the target revision first.
