# syntax=docker/dockerfile:1.7
# Build context must be the repo root so workspace packages are accessible.

FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm

# ── Install dependencies + build ─────────────────────────────────────────────
FROM base AS builder
WORKDIR /repo

# CI=true tells pnpm it can remove node_modules without an interactive prompt
ENV CI=true

# pnpm workspaces need the full source tree present so local packages
# (@sage/types, @sage/db, @sage/config) can be linked correctly
COPY . .

RUN pnpm install --frozen-lockfile

# Generate Prisma client
RUN pnpm --filter @sage/db exec prisma generate

# Build Next.js (outputs to apps/web/.next/standalone via output: 'standalone')
RUN pnpm --filter @sage/web build

# ── Production runner ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /repo/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
