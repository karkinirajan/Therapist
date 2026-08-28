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

bind = f"127.0.0.1:{os.environ.get('PORT', '8000')}"

# Bind to loopback only, not 0.0.0.0: in the EC2/Nginx layout this app is
# reverse-proxied by Next.js's own server-side proxy (see apps/web/lib/
# auth-proxy.ts) running on the same box, and Nginx never routes to this
# port directly (see DEPLOYMENT.md's EC2 section) - there's no reason for
# this process to be reachable from outside localhost at all.

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
