# Docker — Local Dev Setup

Spin up the full backend stack (API + Postgres + Redis) with a single command — no Infisical,
no Neon account, no cloud services required.

---

## Prerequisite

[Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
On Windows, enable the **WSL 2** backend in Docker Desktop settings.

---

## Quickstart

From the **repo root** (next to `docker-compose.yml`):

```bash
docker compose up --build
```

What happens:
1. Postgres 16 and Redis 7 start with health checks.
2. The `api` image is built from `backend/Dockerfile` (target: `dev`).
3. On first boot, `bunx prisma db push` pushes the full schema into the fresh DB.
4. `bun --watch src/index.ts` starts with hot reload.

Once running:

| Endpoint | URL |
|----------|-----|
| API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/api-docs |
| Health check | http://localhost:8000/health |

---

## Seeding Test Data

After the stack is up, seed the database with test accounts:

```bash
docker compose exec api bun prisma/seed.ts
```

See [docs/test-accounts.md](../test-accounts.md) for the seed credentials (admin/tutor/students).

**Full wipe + reseed in one command:**

```bash
RESET_DB=true docker compose up
```

This triggers the `resetDatabase()` path in `src/config/database.ts` — drops all tables,
re-pushes the schema, and re-seeds. Useful when the schema has drifted.

---

## Optional AI & Email Keys

The stack boots without any API keys. Features that need them return HTTP 503 (AI routes)
or are silently skipped (email). To enable them, create a `.env` file in the repo root
(next to `docker-compose.yml`) — compose auto-loads it for variable interpolation:

```bash
# repo root .env  (gitignored — never commit this)
GEMINI_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
DEEPGRAM_API_KEY=your-key-here
AZURE_SPEECH_KEY=your-key-here
AZURE_SPEECH_REGION=eastus
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
RESEND_API_KEY=re_your_key
EMAIL_FROM=noreply@yourdomain.com
```

> **Do not add** `R2_PUBLIC_URL`, `SENTRY_DSN`, `FIB_WEBHOOK_URL`, or `SENDGRID_FROM_EMAIL`
> to this file with an empty value — those are validated with `.url()` / `.email()` in
> `src/config/env.ts` and an empty string will crash the server on boot.

---

## Infra-Only Mode

If you prefer to run Bun natively (faster, native TS source maps, debugger support)
but still want managed Postgres and Redis:

```bash
# Terminal 1 — start only the databases
docker compose up postgres redis

# Terminal 2 — run the API natively against the containerised DBs
cd backend
# create backend/.env with:
#   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/esl_chatbot
#   REDIS_URL=redis://localhost:6379
bun run dev:env
```

The Postgres port `5432` and Redis port `6379` are published to the host, so native Bun
can reach them at `localhost`.

---

## Hot Reload Scope

Only `backend/src/` and `backend/prisma/` are bind-mounted into the container. Edits to any
file inside those directories trigger an immediate `bun --watch` reload.

Changes outside those directories require a rebuild:

```bash
docker compose up --build
```

This includes: `package.json`, `bun.lock`, `tsconfig.json`, and `prisma.config.ts`.

---

## Useful Commands

```bash
# View live API logs
docker compose logs -f api

# Run a one-off command inside the container
docker compose exec api bunx prisma studio

# Stop everything (keeps the DB volume)
docker compose down

# Stop and delete all data (wipes the Postgres volume)
docker compose down -v

# Rebuild just the API image after a dependency change
docker compose up --build api
```

---

## Troubleshooting

**Port conflicts** — if `5432`, `6379`, or `8000` is already in use on your machine:

Edit `docker-compose.yml` and remap the host-side port (left of the colon):

```yaml
ports:
  - "5433:5432"   # Postgres on host port 5433
  - "6380:6379"   # Redis on host port 6380
  - "8001:8000"   # API on host port 8001
```

Then update `DATABASE_URL` and `REDIS_URL` in the `api` environment block to match.

**Windows file-watch not triggering** — `bun --watch` relies on filesystem events. If edits
to `src/` are not reloading the server, open Docker Desktop → Settings → Resources →
File Sharing and make sure the repo path is shared, or use WSL 2 and clone the repo inside
the WSL filesystem.

**Schema out of date** — if the DB was created before a schema change, run:

```bash
docker compose exec api bunx prisma db push
```

Or do a full reset: `RESET_DB=true docker compose up`.
