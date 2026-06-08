# Services Overview

Quick reference for every external service this backend uses or will use.
See individual files for full details, options, and setup guides.

---

## Decisions at a Glance

| Layer | Dev / Free | Production | File |
|-------|-----------|------------|------|
| PostgreSQL | Neon (free) | Neon Scale | [database.md](./database.md) |
| Google OAuth | Google Cloud (free) | Google Cloud | [google-oauth.md](./google-oauth.md) |
| Redis | Upstash (free) | Upstash Pay-as-you-go | [redis.md](./redis.md) |
| File Storage | Cloudflare R2 (free tier) | Cloudflare R2 | [file-storage.md](./file-storage.md) |
| Email | Resend (free tier) | Resend or AWS SES | [email.md](./email.md) |
| App Hosting | Render or Railway | Railway or DigitalOcean | [hosting.md](./hosting.md) |
| Secrets | Infisical (free) | Infisical | [secrets.md](./secrets.md) |
| Error Monitoring | Disabled (dev/test) | Sentry (free tier) | [sentry.md](./sentry.md) |

---

## What to Set Up First

| Priority | Service | Needed For |
|----------|---------|-----------|
| ✅ Now | PostgreSQL (Neon) | Everything |
| ✅ Phase 2 | Google OAuth (Google Cloud) | Google Sign-In |
| Phase 3 | File Storage (R2) | Avatars |
| Phase 2 remaining | Email (Resend) | Registration, password reset |
| Phase 4 | File Storage (R2) | Voice recordings |
| Phase 8 | Redis (Upstash) | Rate limiting, caching |
| When deploying | App Hosting | Sharing with team / production |
| Before sharing env | Secrets (Infisical) | Team access to env vars |
| Before going live | Error Monitoring (Sentry) | Catch crashes before users do |
