# syntax=docker/dockerfile:1
FROM oven/bun:1.3-slim AS base
WORKDIR /app

# ── deps: full install (prisma CLI is a devDependency; needed for generate + db push) ──
FROM base AS deps
COPY package.json bun.lock ./
# --ignore-scripts skips the prepare hook (git config) which has no git binary in the image
RUN bun install --frozen-lockfile --ignore-scripts
COPY prisma ./prisma
COPY prisma.config.ts ./
# prisma.config.ts calls env("DATABASE_URL") at load time even during generate —
# a dummy value satisfies the config without opening a real connection
RUN DATABASE_URL=postgresql://user:pass@localhost:5432/dummy bunx prisma generate

# ── dev: hot reload via bun --watch; schema is pushed on every container start ──
FROM deps AS dev
COPY . .
ENV NODE_ENV=development
EXPOSE 8000
# exec replaces the shell so bun receives SIGTERM for graceful shutdown
CMD ["sh", "-c", "bunx prisma db push && exec bun --watch src/index.ts"]

# ── prod-deps: install only runtime dependencies ──
FROM base AS prod-deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

# ── production: minimal runtime image (ready for Task 5 container deploys) ──
FROM base AS production
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
# Bring the generated Prisma client (Linux engine binary) from the full-deps stage
COPY --from=deps /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
USER bun
EXPOSE 8000
CMD ["bun", "src/index.ts"]
