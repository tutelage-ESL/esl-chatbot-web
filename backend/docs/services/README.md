# Services Overview

Quick reference for every external service this backend uses or will use.
See individual files for full details, options, and setup guides.

---

## Decisions at a Glance

| Layer | Dev / Free | Production | File |
|-------|-----------|------------|------|
| PostgreSQL | Neon (free) | Neon Scale | [database.md](./database.md) |
| Redis | Upstash (free) | Upstash Pay-as-you-go | [redis.md](./redis.md) |
| File Storage | Cloudflare R2 (free tier) | Cloudflare R2 | [file-storage.md](./file-storage.md) |
| Email | Resend (free tier) | Resend or AWS SES | [email.md](./email.md) |
| App Hosting | Render or Railway | Railway or DigitalOcean | [hosting.md](./hosting.md) |
| Secrets | Doppler (free) | Doppler | [secrets.md](./secrets.md) |

---

## What to Set Up First

| Priority | Service | Needed For |
|----------|---------|-----------|
| ✅ Now | PostgreSQL (Neon) | Everything |
| Phase 3 | File Storage (R2) | Avatars |
| Phase 2 remaining | Email (Resend) | Registration, password reset |
| Phase 4 | File Storage (R2) | Voice recordings |
| Phase 8 | Redis (Upstash) | Rate limiting, caching |
| When deploying | App Hosting | Sharing with team / production |
| Before sharing env | Secrets (Doppler) | Team access to env vars |
