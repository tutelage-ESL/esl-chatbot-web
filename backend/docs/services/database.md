# PostgreSQL — Neon

## Decision
**Neon** for both development and production.
- Serverless PostgreSQL with branching, auto-suspend, and a generous free tier
- No migration needed when moving from dev to prod — same platform, same tooling

---

## Setup (Dev / Free Tier)

1. Go to [neon.tech](https://neon.tech) → Create account → New Project
2. Use these settings:

| Setting | Value |
|---------|-------|
| Project name | `tutelage` |
| PostgreSQL version | **17** |
| Cloud provider | **AWS** |
| Region | **eu-central-1 (Frankfurt)** |
| Neon Auth | **Disabled** |

> **Why Frankfurt?** Neon has no Middle East region yet. Frankfurt (eu-central-1) is
> the closest available AWS region for users in Kurdistan/Iraq (~3,500 km).
> When Neon adds a UAE region, migrating a branch is straightforward.

> **Why not Azure?** Neon's Azure support is newer with fewer regions. AWS is more
> stable and has more available regions on Neon.

> **Why disable Neon Auth?** This project has a complete custom auth system
> (JWT + bcryptjs + RefreshToken table). Neon Auth would be a redundant parallel
> system — skip it entirely.

3. Copy the **pooled** `DATABASE_URL` connection string
4. Add to `.env`:
```env
DATABASE_URL="postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```
5. Run migrations and seed:
```bash
bun run db:migrate
bun run db:seed
```

---

## Sharing With Frontend Devs

Never paste the `DATABASE_URL` in Slack or email. Use Doppler (see [secrets.md](./secrets.md))
or share it once via a private channel and rotate it after.

---

## Production (When Ready)

Upgrade to **Neon Scale** (~$19/mo):
- Same project, same region, same connection string — just a plan upgrade
- Enables larger storage, more compute, no auto-suspend
- Automatic daily backups included

### Alternatives if you want to move away from Neon
| Service | Cost | Notes |
|---------|------|-------|
| DigitalOcean Managed PG | $15/mo | Predictable pricing, automatic backups |
| Supabase Pro | $25/mo | Good if you adopt its ecosystem |
| AWS RDS | $30–100+/mo | Enterprise-grade, most control |
