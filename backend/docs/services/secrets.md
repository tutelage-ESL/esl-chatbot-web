# Secrets Management — Doppler

## Decision
**Doppler** for managing and sharing environment variables across environments and team members.

---

## The Problem
This project has a growing list of secrets:
- `DATABASE_URL` (Neon)
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `REDIS_URL` (Upstash)
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID` (Cloudflare)
- `RESEND_API_KEY` (or `SENDGRID_API_KEY`)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (Phase 8)

Sharing `.env` files over Slack or email is insecure and breaks when values change.

---

## Why Doppler

- **Free** for small teams (up to 5 members on free plan)
- Single source of truth: change a value once, all environments and developers get it
- CLI syncs secrets directly into your shell — no `.env` file needed locally
- Integrates with Railway, Render, Fly, DigitalOcean, and most CI/CD tools
- Audit log: see who accessed or changed what secret and when

---

## Setup

```bash
# Install Doppler CLI
# On Windows: use the MSI installer from doppler.com/docs/install-cli

# Login
doppler login

# Link project
doppler setup

# Run the server with secrets injected
doppler run -- bun dev
```

### Team Access
1. Create a Doppler project: `tutelage`
2. Create environments: `dev`, `staging`, `production`
3. Invite teammates — they run `doppler setup` once and never manage `.env` files again

---

## If Not Using Doppler

Minimum safe practices:
- Keep `.env` in `.gitignore` (already should be)
- Share via a **private** password manager (1Password, Bitwarden)
- Rotate any secret that was accidentally shared or committed immediately
- Use separate secrets per environment — never use production DB in local dev

---

## Env Var Reference

See `.env.example` in the project root for all required and optional variables.
Doppler environments should mirror these keys exactly.
