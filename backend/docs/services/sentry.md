# Sentry — Error Monitoring

Sentry is the error monitoring service for this backend. When something crashes in
production that shouldn't (an unexpected 500, an unhandled promise rejection, a cron
job crash, an AI provider fallback), Sentry captures it automatically and sends an
alert so you find out before a user complains.

---

## What Gets Captured

| Event | Source | Notes |
|-------|--------|-------|
| Unexpected 500s | `errorHandler.ts` | Includes user ID + request URL |
| Unhandled promise rejections | `index.ts` process handler | E.g. fire-and-forget async without `.catch()` |
| Uncaught exceptions | `index.ts` process handler | Hard crashes — Sentry flushes before `process.exit(1)` |
| Cron job crashes | `jobs/index.ts` `safeRun` wrapper | Errors that escape the job's internal try/catch |
| AI provider fallbacks | `ai.service.ts` | OpenAI → Gemini or OpenAI TTS → Azure; reported as **warning** level |

## What Does NOT Get Captured (intentional)

- `AppError` (400, 401, 403, 404, 409, 422…) — these are expected user-facing errors, not bugs
- `ZodError` (422 validation failures) — expected and handled
- `MulterError` (file upload errors) — expected and handled
- Anything in `development` or `test` environment — always disabled, zero noise during dev

---

## How It Works (simple version)

1. Your backend calls `Sentry.captureException(err)` when something unexpected breaks
2. Sentry receives a JSON payload containing the stack trace, user ID, and request context
3. Sentry groups identical errors into one "Issue" (100 identical crashes = 1 alert, not 100)
4. You get an email/notification with the exact file, line number, and user affected

The SDK adds roughly 1ms overhead per captured event in production. It is a no-op in development.

---

## One-Time Setup (your steps)

### Step 1 — Create a Sentry account

1. Go to **https://sentry.io** → click **Get Started for Free**
2. Sign up with your email
3. During onboarding, create an **Organization** (e.g. `tutelage` or your company name)
4. Create a new **Project**:
   - Platform: **Node.js**
   - Project name: `esl-chatbot-backend` (or any name you like)
   - Skip their SDK setup wizard — we've already done all the code changes

### Step 2 — Copy the DSN

1. Inside your new project go to:
   **Settings → Projects → esl-chatbot-backend → SDK Setup → DSN**
2. Copy the DSN — it looks like:
   ```
   https://abc123def456@o1234567.ingest.sentry.io/8901234
   ```
3. Keep this safe — treat it like a secret (it's in Infisical, not in code)

### Step 3 — Add DSN to Infisical

1. Open **https://app.infisical.com** → your `esl-chatbot` project
2. Switch to the **prod** environment
3. Add a new secret:
   - Key: `SENTRY_DSN`
   - Value: the DSN you copied in Step 2
4. Save

> **Dev environment:** Leave `SENTRY_DSN` blank (or don't add it at all) in the `dev` environment.
> The code disables Sentry in `development` and `test` regardless of whether the DSN is set,
> so there is zero local noise.

### Step 4 — Verify after deploying

After your first production deploy with this secret set:

1. Go to Sentry → your project → **Issues**
2. Optional — trigger a test error to confirm it's working:
   - Temporarily add `throw new Error("sentry connectivity test")` inside any route handler
   - Deploy, hit that endpoint once, check Sentry Issues
   - Remove the line and redeploy
3. You should see the error appear in Sentry within a few seconds of it happening

---

## Recommended Sentry Settings (do after first deploy)

**Alerts:** Go to **Alerts → Create Alert Rule**
- Trigger: "A new issue is created"
- Action: send email to `aland.zland@gmail.com`
- This means any brand-new error type that has never been seen before sends you an email

**Issue owners:** Assign yourself as the owner of the backend project under
**Settings → Projects → Members** so alerts go to you.

**Data scrubbing:** Sentry has built-in PII scrubbing. Our code already limits what we send
(`req.user.id` and `req.user.username` only — no passwords, no tokens). No extra config needed.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | Optional (prod only) | Project DSN from sentry.io Settings → SDK Setup |

Leave blank in dev. The app boots and runs normally without it — error capturing is simply disabled.

---

## Code Reference

| File | What it does |
|------|-------------|
| `src/config/sentry.ts` | Sentry init — imported first in `index.ts` |
| `src/index.ts` | `unhandledRejection` + `uncaughtException` process handlers |
| `src/middlewares/errorHandler.ts` | Captures genuine 500s with user + request context |
| `src/modules/ai/ai.service.ts` | Captures AI provider fallbacks as warnings |
| `src/jobs/index.ts` | `safeRun` wrapper around all 4 cron callbacks |
