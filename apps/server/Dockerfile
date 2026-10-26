# Multi-stage Dockerfile for ANVAYA Backend Express API Server
# Build from monorepo root: docker build -f apps/server/Dockerfile -t anvaya-server .

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl libc6-compat python3 make g++

# Copy package manifests for workspace installation
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/server/package*.json ./apps/server/
COPY apps/web/package*.json ./apps/web/
COPY apps/mobile/package*.json ./apps/mobile/

# Install dependencies across all workspaces
RUN npm ci

# Copy shared library and build it
COPY packages/shared ./packages/shared
RUN npm --workspace=packages/shared run build

# Copy server code and Prisma schema
COPY apps/server ./apps/server

# Generate Prisma Client & compile TypeScript
RUN npm --workspace=apps/server run db:generate
RUN npm --workspace=apps/server run build

# ── Production Runtime Stage ────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime dependencies (OpenSSL required by Prisma engine)
RUN apk add --no-cache openssl libc6-compat dumb-init

# Create non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 anvaya

# Copy package manifests
COPY --chown=anvaya:nodejs package*.json ./
COPY --chown=anvaya:nodejs packages/shared/package*.json ./packages/shared/
COPY --chown=anvaya:nodejs apps/server/package*.json ./apps/server/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled shared package and server build
COPY --chown=anvaya:nodejs --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --chown=anvaya:nodejs --from=builder /app/apps/server/dist ./apps/server/dist
COPY --chown=anvaya:nodejs --from=builder /app/apps/server/prisma ./apps/server/prisma
COPY --chown=anvaya:nodejs --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=anvaya:nodejs --from=builder /app/node_modules/@prisma ./node_modules/@prisma

USER anvaya

EXPOSE 4000

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "apps/server/dist/index.js"]
