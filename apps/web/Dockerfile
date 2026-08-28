# syntax=docker/dockerfile:1
#
# Multi-stage build for the Next.js frontend. Build context is the REPO
# ROOT (not apps/web) - apps/web is an npm-workspaces member, and its
# lockfile lives only at the workspace root (package-lock.json), not inside
# apps/web itself. Building from apps/web alone would run `npm install`
# with no lockfile present at all, resolving whatever semver-matching
# versions happen to be available at build time instead of the exact,
# already-tested versions the rest of the repo (CI included) locks to -
# not reproducible, and a real risk of the Docker image shipping different
# transitive dependency versions than what was actually tested.
#
# Build (from repo root): docker build -f apps/web/Dockerfile -t therapist-web .

FROM node:22-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps: installed in their own layer so source-only changes don't
# invalidate the (slow) dependency-install cache. `npm ci`, not `install` -
# fails instead of silently re-resolving if package.json and
# package-lock.json ever drift apart. ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN npm ci

# ---- dev: full source + dev tooling, used by docker-compose.override.yml
# for hot reload (`next dev`) ----
FROM deps AS dev
COPY apps/web ./apps/web
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- builder: production build. Same `npm run build -w @therapist/web`
# command CI already runs from the repo root (see .github/workflows/ci.yml)
# - if `output: "standalone"`'s file-tracing works there against the same
# hoisted-node_modules layout, it works identically here. ----
FROM deps AS builder
COPY apps/web ./apps/web
RUN npm run build -w @therapist/web

# ---- runtime: lean production image, standalone output only (no full
# node_modules, no source, no dev tooling) ----
FROM node:22-slim AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# node:22-slim already ships a uid-1000 "node" user - reuse it rather than
# useradd'ing another uid 1000, which fails as a duplicate.
WORKDIR /app

# next.config.ts sets `outputFileTracingRoot` to the monorepo root (see that
# file) so `output: "standalone"` correctly traces this hoisted-at-the-root
# node_modules layout - its standalone bundle therefore mirrors the full
# repo-root-relative path (apps/web/server.js), not a flattened one.
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
# apps/web has no /public directory today (no static assets committed);
# this app doesn't use next/image local assets. If one is added later,
# this COPY starts working automatically - no Dockerfile change needed.
COPY --from=builder --chown=node:node /app/apps/web/public* ./apps/web/public

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "apps/web/server.js"]
