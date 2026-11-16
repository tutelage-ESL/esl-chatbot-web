# Secrets Management — Infisical

## Decision
**Infisical** for managing and sharing environment variables across environments and team members.

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

## Why Infisical

- **Open source** (MIT license) — no vendor lock-in, can self-host if needed
- **Free** for small teams (generous free tier)
- Single source of truth: change a value once, all environments and developers get it
- CLI syncs secrets directly into your shell — no `.env` file needed locally
- Available in Iraq (unlike Doppler which blocks registration from Iraq)
- Integrates with Railway, Render, Fly, DigitalOcean, GitHub Actions, and most CI/CD tools
- Audit log: see who accessed or changed what secret and when

---

## Setup

```bash
# Install Infisical CLI
# Windows (PowerShell as Administrator):
scoop install infisical

# macOS:
brew install infisical/get-cli/infisical

# Linux (Ubuntu/Debian):
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' \
  | sudo -E bash
sudo apt-get install -y infisical

# Log in (opens browser)
infisical login

# Link project to this directory (run once per machine, inside the backend folder)
infisical init

# Run the server with secrets injected
bun dev
```

### Team Access
1. Project lead creates a project named `esl-chatbot` on infisical.com
2. Creates environments: `dev`, `staging`, `prod`
3. Invites teammates via the dashboard (Settings → Members → Invite)
4. Each teammate runs `infisical login` then `infisical init` once in the backend folder

**Full step-by-step guide is in `SECRETS.md` at the project root.**

---

## If Infisical Is Not Available

Minimum safe practices:
- Keep `.env` in `.gitignore` (already configured)
- Share via a **private** password manager (1Password, Bitwarden)
- Rotate any secret that was accidentally shared or committed immediately
- Use separate secrets per environment — never use production DB in local dev
- As a last resort, Infisical can be self-hosted on any VPS

---

## Env Var Reference

See `.env.example` in the project root for all required and optional variables.
Infisical environments should mirror these keys exactly.
