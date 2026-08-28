"""Gunicorn config for running FastAPI in production behind Nginx.

Gunicorn handles process management (worker respawning, graceful reload,
signal handling); Uvicorn's ASGI worker class does the actual request
serving. This is the standard combination for a production FastAPI/ASGI app
- plain `uvicorn --workers N` has no master process to restart a crashed
worker or reload on SIGHUP, which Gunicorn provides for free.

Usage: `gunicorn -c gunicorn.conf.py app.main:app`
"""

import multiprocessing
import os

# Bind target depends on which deployment path is running this config:
#
# - Bare-EC2 (deploy/ec2/*, DEPLOYMENT.md Path A): Nginx and the Next.js
#   server-side proxy (apps/web/lib/auth-proxy.ts) share this same host's
#   network namespace, so binding to 127.0.0.1 keeps this process
#   unreachable from outside the box entirely - one less open port.
# - Docker Compose (DEPLOYMENT.md Path C): this process runs in its own
#   container network namespace. 127.0.0.1 there is the container's own
#   loopback, invisible to *other containers* (including the `web`
#   service that needs to reach it at API_BASE_URL=http://api:8000) - so
#   it must bind 0.0.0.0 to be reachable at all inside the compose
#   network. Docker's own network isolation (no published port to the
#   host in prod; see docker-compose.prod.yml) is the security boundary
#   here instead of the loopback-only bind.
#
# BIND_HOST lets each path choose the right value without editing this
# file; the compose files set it to 0.0.0.0, the EC2 systemd unit leaves
# it unset and gets the 127.0.0.1 default.
bind = f"{os.environ.get('BIND_HOST', '127.0.0.1')}:{os.environ.get('PORT', '8000')}"

worker_class = "uvicorn.workers.UvicornWorker"

# (2 x CPU cores) + 1 is Gunicorn's own documented starting point for
# sync-ish workloads; async workers can often run fewer since one worker
# handles many concurrent requests, but this is a safe, conservative default
# for a small instance. Override with the WEB_CONCURRENCY env var if needed.
workers = int(os.environ.get("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))

timeout = 30
graceful_timeout = 30
keepalive = 5

accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
