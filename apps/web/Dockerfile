# syntax=docker/dockerfile:1
#
# Multi-stage build for the Next.js frontend. Build context is apps/web
# itself (not the repo root) — apps/web/package.json fully declares its
# real dependencies (not npm-workspace `workspace:*` references), so it's
# self-contained and doesn't need the root package-lock.json or the rest
# of the monorepo to build. This also keeps `output: "standalone"`'s
# nesting flat (`.next/standalone/server.js`, not nested under apps/web/)
# since Next.js treats this directory as the project root when built in
# isolation.
#
# Build (from repo root): docker build -f apps/web/Dockerfile -t therapist-web apps/web

FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: installed in their own layer so source-only changes don't
# invalidate the (slow) dependency-install cache ----
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm install

# ---- dev: full source + dev tooling, used by docker-compose.override.yml
# for hot reload (`next dev`) ----
FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- builder: production build ----
FROM deps AS builder
COPY . .
RUN npm run build

# ---- runtime: lean production image, standalone output only (no full
# node_modules, no source, no dev tooling) ----
FROM node:22-slim AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# node:22-slim already ships a uid-1000 "node" user — reuse it rather than
# useradd'ing another uid 1000, which fails as a duplicate.
WORKDIR /app

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# apps/web has no /public directory today (no static assets committed);
# this app doesn't use next/image local assets. If one is added later,
# this COPY starts working automatically — no Dockerfile change needed.
COPY --from=builder --chown=node:node /app/public* ./public

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
