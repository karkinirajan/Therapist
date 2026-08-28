# Thin wrappers around the Docker Compose commands documented in
# DEPLOYMENT.md's "Path C — Docker Compose" section and the README's
# "Running locally". Not required — the underlying `docker compose`
# commands work fine on their own — just fewer characters to type/get
# wrong for the two common cases.

.PHONY: dev dev-down deploy deploy-down deploy-logs

## Full stack, dev mode: hot reload, migrations applied automatically.
## Equivalent to: docker compose up
dev:
	docker compose up

## Stop and remove the dev stack (add ARGS=-v to also drop the Postgres
## volume, e.g. `make dev-down ARGS=-v`).
dev-down:
	docker compose down $(ARGS)

## Full stack, production mode: Gunicorn + Next.js production server,
## detached, no hot reload. Requires a root .env with real secrets set
## (see .env.example / DEPLOYMENT.md's Path C) — this fails fast with a
## clear error if they're left as dev placeholders.
## Equivalent to: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
deploy:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

## Stop and remove the prod stack (add ARGS=-v to also drop the Postgres
## volume — do NOT do this against a real production database you care
## about without a backup).
deploy-down:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml down $(ARGS)

## Tail logs from the prod stack.
deploy-logs:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
