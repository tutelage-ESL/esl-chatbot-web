# PostgreSQL — Neon

## Decision
**Neon** for both development and production.
- Serverless PostgreSQL with branching, auto-suspend, and a generous free tier
- No migration needed when moving from dev to prod — same platform, same tooling
- Database name used in this project: `esl-chatbot-web`

---

## What You'll Need Before Starting

- A Neon account (free) — [neon.tech](https://neon.tech)
- Infisical CLI installed and logged in — see [secrets.md](./secrets.md)
- Bun installed — `bun --version` should work in your terminal
- This backend repo cloned and dependencies installed (`bun install`)

---

## Step 1 — Create a Neon Account

1. Go to [neon.tech](https://neon.tech) → click **Sign Up**
2. Use GitHub login (recommended) or email
3. You'll land on the Neon dashboard

---

## Step 2 — Create a New Project

Click **+ New Project** and fill in these exact settings:

| Setting | Value | Why |
|---------|-------|-----|
| Project name | `tutelage` | Matches the product name |
| PostgreSQL version | **17** | Latest stable — use this unless a dependency requires an older version |
| Cloud provider | **AWS** | More stable on Neon than Azure, more available regions |
| Region | **eu-central-1 (Frankfurt)** | Closest AWS region to Kurdistan/Iraq (~3,500 km). Switch to UAE when Neon adds it |
| Neon Auth | **Disabled** | This project has its own complete auth system (JWT + bcryptjs) — Neon Auth would be redundant |

Click **Create Project**.

---

## Step 3 — Create the Database

Neon creates a default database called `neondb`. Rename it to match the project:

1. In your project dashboard → **Databases** tab (left sidebar)
2. Click the three-dot menu next to `neondb` → **Rename**
3. Set name to: `esl-chatbot-web`

> If renaming is not available in the UI, click **+ New Database** instead, name it `esl-chatbot-web`, and use that one.

---

## Step 4 — Get the Connection String

### Pooled (use this for the app)

1. Go to **Dashboard** → click **Connect** (top right)
2. Set **Connection type** to **Pooled connection** (uses pgBouncer — more efficient for serverless)
3. Copy the connection string — it looks like:

```
postgresql://username:password@ep-xxx-yyy.eu-central-1.aws.neon.tech/esl-chatbot-web?sslmode=require
```

This is what goes into `DATABASE_URL`.

### Direct (briefly — for migrations only)

Neon also provides a **direct (non-pooled)** connection string. You only need this if Prisma migrations fail with a pooled string (pgBouncer does not support DDL in transaction mode). In that case, set `DIRECT_URL` in your env and add to `schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

For now, the pooled string works for both app and migrations in this project. Keep the direct URL saved somewhere safe in case you need it later.

---

## Step 5 — Add the Connection String to Infisical

**Do not paste the connection string into a `.env` file.** Infisical is the source of truth.

1. Go to [infisical.com](https://infisical.com) → your `esl-chatbot` project → `dev` environment
2. Find the `DATABASE_URL` secret → click **Edit**
3. Paste your pooled connection string as the value
4. Click **Save** — do not navigate away without saving, changes are lost silently

> **Common gotcha:** Infisical does not auto-save. If you edit a secret and forget to click Save, the old value is still injected the next time you run `bun dev`. Always confirm the value in the dashboard after saving.

If you haven't set up Infisical yet, follow [secrets.md](./secrets.md) first, then come back here.

---

## Step 6 — Run Migrations

With Infisical set up and your `DATABASE_URL` pointing to Neon, push the schema:

```bash
# Apply all pending migrations (creates tables, enums, indexes)
bun run db:migrate
```

This runs `prisma migrate dev` under the hood with secrets injected by Infisical.

> **First time only:** Prisma will create all tables from scratch. You'll see output like:
> `✔  Your database is now in sync with your schema.`

---

## Step 7 — Seed the Database

Populate the database with test data (admin, tutor, students, classes, etc.):

```bash
bun run db:seed
```

After seeding, you'll have:

| Username | Email | Role | Password |
|----------|-------|------|----------|
| `admin_main` | admin@tutelage.com | ADMIN | `password123` |
| `tutor_sarah` | sarah@tutelage.com | TUTOR | `password123` |
| `student_ali` | ali@tutelage.com | STUDENT | `password123` |
| `student_yuki` | yuki@tutelage.com | STUDENT | `password123` |

---

## Step 8 — Verify the Connection

Start the server:

```bash
bun dev
```

On startup, the server logs a table list with row counts, for example:

```
┌────────────────────────────────────┐
│  Table                  Rows       │
├────────────────────────────────────┤
│  users                  4          │
│  classes                2          │
│  ...                               │
└────────────────────────────────────┘
🚀 Server running on http://localhost:8000
📚 API docs:  http://localhost:8000/api-docs
🏥 Health:    http://localhost:8000/health
```

If you see the table list and server URL, the database connection is working correctly.

---

## Neon Branching (Dev vs Prod Isolation)

Neon lets you create database **branches** — isolated copies of the schema and data — similar to Git branches. This is useful for the team:

| Branch | Purpose |
|--------|---------|
| `main` | Production data — never touch directly |
| `dev` | Development and testing — safe to wipe and reseed |

### Creating a dev branch

1. In Neon dashboard → **Branches** tab → **+ New Branch**
2. Name it `dev`, branch from `main`
3. Go to **Connect** → switch to the `dev` branch → copy the new pooled connection string
4. Update `DATABASE_URL` in Infisical `dev` environment to the `dev` branch URL

Your local dev environment now hits the `dev` branch, production hits `main`. Schema changes get tested on `dev` first.

---

## Local PostgreSQL Alternative (Offline / EDB)

If you need to work offline or want to avoid hitting Neon, you can use a local PostgreSQL instance.

> **Note:** EDB PostgreSQL's web interface runs on port `8080`. The project backend runs on `8000`. These do not conflict — PostgreSQL itself uses port `5432`.

### Using EDB PostgreSQL (already installed)

1. Make sure EDB is running (check pgAdmin or `pg_isready -p 5432`)
2. Create the database:

```sql
-- Run in psql or pgAdmin
CREATE DATABASE "esl-chatbot-web";
```

3. Set your connection string (locally, not via Infisical):

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/esl-chatbot-web?schema=public"
```

> If your password has special characters (`&`, `(`, `)`), URL-encode them.
> Example: `(Gochan&DB)` → `(Gochan%26DB)`

4. Run migrations and seed:

```bash
bun run db:migrate
bun run db:seed
```

This setup is identical to Neon — same commands, same Prisma schema — just a different connection string.

---

## Production

When ready to go live, upgrade the Neon project to **Scale** (~$19/mo):
- Same project, same region, same connection string — just a plan upgrade
- Enables larger storage, more compute, no auto-suspend
- Automatic daily backups included

No data migration needed — you're already on Neon.

### Alternatives if moving away from Neon

| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Managed PG | $15/mo | Predictable pricing, automatic backups |
| Supabase Pro | $25/mo | Good if you adopt its ecosystem |
| AWS RDS | $30–100+/mo | Enterprise-grade, most control |

---

## Sharing the Connection String With the Team

Never paste `DATABASE_URL` in Slack, email, or Discord. Use Infisical:
- Team lead adds the secret once to the `dev` environment
- Each developer runs `infisical login` + `infisical init` — done
- See [secrets.md](./secrets.md) for the full Infisical setup guide

---

## Troubleshooting

### `SSL required` error
Neon requires SSL. Make sure your connection string ends with `?sslmode=require`.

### `ECONNREFUSED` or connection timeout
- Check that Neon's project is not suspended (free tier auto-suspends after 5 min of inactivity — it wakes up automatically on first query, but the first request may be slow)
- Verify `DATABASE_URL` is set correctly in Infisical and injected via `bun dev`

### `P1001: Can't reach database server`
- You're likely running `bun run dev:env` (which reads `.env`) but `DATABASE_URL` is commented out in `.env`
- Either uncomment and fill `.env`, or use `bun dev` (via Infisical)

### Prisma migration fails with `prepared statement` error
- This is a pgBouncer incompatibility in transaction mode
- Add `?pgbouncer=true&connection_limit=1` to the end of `DATABASE_URL`, or switch to the direct connection string for migrations (see Step 4)

### `password authentication failed`
- Special characters in the password must be URL-encoded in the connection string
- Example: `(Gochan&DB)` → `(Gochan%26DB)`

### Secret change in Infisical has no effect after `bun dev`
You edited a secret in Infisical but the old value is still being injected. You forgot to click **Save** in the Infisical dashboard — edits are discarded silently if you navigate away without saving. Go back, re-enter the value, and click Save before rerunning.

### Tables exist but are empty after seed
- The seed ran but `RESET_DB=true` is wiping the DB on startup — set `RESET_DB=false` in your dev secrets after initial setup
