# Infisical — Secrets Management Guide

## What is Infisical?

Infisical is an open-source secrets manager. Instead of sharing `.env` files over
Slack or email (insecure and error-prone), all environment variables live in
Infisical's cloud. Every developer connects their machine once, and secrets are
injected automatically when you run `bun dev`.

**No `.env` files. No "hey can you send me the DB password". No secrets in git.**

---

## How It Works (Mental Model)

```
You run: bun dev
       ↓
package.json says: infisical run --env=dev -- bun --watch src/index.ts
       ↓
Infisical CLI fetches your secrets from the cloud
       ↓
Infisical injects them as environment variables into the process
       ↓
Your app starts with all secrets available in process.env
```

---

## Environments

We use two environments:

| Name  | Purpose                         |
|-------|---------------------------------|
| `dev` | Local development (your laptop) |
| `prod`| Production server               |

Each environment has its own set of secrets (different DB URLs, different JWT
secrets, etc.). When you run locally, you always use `dev` secrets.

---

## Part 1: Project Lead Setup (Do This Once)

> Only **one person** on the team needs to do this. Everyone else follows Part 2.

### Step 1 — Create the Infisical Project

1. Go to **https://app.infisical.com** (you already have an account)
2. Click **+ New Project**
3. Name it: `esl-chatbot`
4. Infisical auto-creates three environments: `dev`, `staging`, `prod`
5. You can ignore `staging` — we only use `dev` and `prod`

### Step 2 — Add Secrets to `dev`

1. Click on your `esl-chatbot` project → click the **`dev`** environment
2. Click **+ Add Secret** for each variable:

| Secret Name            | Value                                                           |
|------------------------|-----------------------------------------------------------------|
| `PORT`                 | `8000`                                                          |
| `NODE_ENV`             | `development`                                                   |
| `DATABASE_URL`         | `postgresql://youruser:yourpass@host:5432/esl_chatbot`          |
| `REDIS_URL`            | `redis://localhost:6379`                                        |
| `RESET_DB`             | `true`                                                          |
| `JWT_ACCESS_SECRET`    | *(generate — see tip below)*                                    |
| `JWT_ACCESS_EXPIRES`   | `15m`                                                           |
| `JWT_REFRESH_SECRET`   | *(generate — different from access secret)*                     |
| `JWT_REFRESH_EXPIRES`  | `7d`                                                            |
| `GOOGLE_CLIENT_ID`     | *(from Google Cloud Console — see `docs/services/google-oauth.md`)* |
| `SENDGRID_API_KEY`     | *(leave empty for now)*                                         |
| `SENDGRID_FROM_EMAIL`  | *(leave empty for now)*                                         |
| `CORS_ORIGIN`          | `http://localhost:3000`                                         |

> **Tip — Generate strong secrets:**
> Run this in your terminal (requires Git Bash or WSL on Windows):
> ```bash
> openssl rand -hex 32
> ```
> Run it twice — once for `JWT_ACCESS_SECRET`, once for `JWT_REFRESH_SECRET`.

### Step 3 — Add Secrets to `prod`

Same keys as `dev` but with production values:
- `NODE_ENV` → `production`
- `DATABASE_URL` → your production Neon connection string
- `RESET_DB` → `false`
- `JWT_ACCESS_SECRET` → a **different** secret than dev
- `JWT_REFRESH_SECRET` → a **different** secret than dev
- `CORS_ORIGIN` → your production frontend URL

### Step 4 — Invite Your Team

1. In your project → **Settings** → **Members** tab
2. Click **Invite Members**
3. Enter their email → role: **Developer** (can read/write secrets, can't delete the project)
4. They will receive an email invitation

---

## Part 2: Developer Setup (Every Team Member)

> Do this on your machine. Takes ~5 minutes.
> You must have accepted the Infisical invite before starting.

### Step 1 — Install the Infisical CLI

**Windows (PowerShell as Administrator):**
```powershell
# Option A: Scoop (recommended)
scoop bucket add org https://github.com/infisical/scoop-infisical.git
scoop install infisical

# Option B: Download installer directly
# Go to: https://github.com/Infisical/infisical/releases
# Download the latest infisical_x.x.x_windows_amd64.zip, unzip, add to PATH
```

**macOS:**
```bash
brew install infisical/get-cli/infisical
```

**Linux (Ubuntu/Debian):**
```bash
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' \
  | sudo -E bash
sudo apt-get install -y infisical
```

Verify it installed:
```bash
infisical --version
```

### Step 2 — Log In

```bash
infisical login
```

This opens your browser. Log in with your Infisical account.

### Step 3 — Link the Project

Navigate to the backend folder and run:

```bash
cd path/to/esl-chatbot-web/backend
infisical init
```

It will ask:
1. **Which organization?** → select your org
2. **Which project?** → select `esl-chatbot`

This creates a `.infisical.json` file in the directory (already gitignored-safe to commit — contains only the project ID, no secrets).

### Step 4 — Run the Project

Everything works exactly the same as before:

```bash
bun dev             # starts dev server with secrets from Infisical
bun test            # runs tests with secrets from Infisical
bun run db:seed     # seeds DB with secrets from Infisical
bun run db:migrate  # runs migrations with secrets from Infisical
```

That's it. You're done.

---

## Verifying Infisical Is Working

List all your injected secrets (shows keys only, values are hidden by default):
```bash
infisical secrets --env=dev
```

Or run a quick check:
```bash
infisical run --env=dev -- printenv DATABASE_URL
```

---

## Fallback: Running Without Infisical

If you ever need to run without Infisical (e.g., a CI environment not configured
for Infisical), create a `.env` file from `.env.example` and use the fallback scripts:

```bash
cp .env.example .env
# fill in real values in .env
bun run dev:env      # runs without Infisical
bun run start:env    # starts production without Infisical
```

`.env` is gitignored — never commit it.

---

## CI/CD (GitHub Actions / Other)

For automated pipelines, use a **Machine Identity** token:

1. In Infisical dashboard → your project → **Settings** → **Integrations** tab
2. Or go to **Organization Settings** → **Machine Identities** → **Create**
3. Copy the client secret / token
4. Add it as a secret in your CI provider (e.g., GitHub Actions secret: `INFISICAL_TOKEN`)

**GitHub Actions example:**
```yaml
- name: Run migrations and start
  env:
    INFISICAL_TOKEN: ${{ secrets.INFISICAL_TOKEN }}
  run: |
    infisical run --env=prod -- bunx prisma migrate deploy
    infisical run --env=prod -- bun start
```

**Railway / Render / Fly.io:**
Most platforms let you set environment variables in their dashboard directly.
For those, just add all variables from Infisical's `prod` environment into the
platform's env var settings — no CLI needed on the server.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `infisical: command not found` | Restart your terminal after installing |
| `Error: project not initialized` | Run `infisical init` in the backend folder |
| `Error: not logged in` | Run `infisical login` |
| `Missing secret X at runtime` | Add the secret to the `dev` config in the Infisical dashboard |
| App crashes on startup with env error | Run `infisical secrets --env=dev` and check all required keys are present |
| Invite email not received | Check spam, or ask the project lead to resend from the Members tab |
