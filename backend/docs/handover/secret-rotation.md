# Secret Rotation & Account Migration

At handover, **every external service is currently provisioned under the original
developer's personal accounts** with throwaway dev keys (some shared in chat — treat
them as compromised). Before launch, re-create each service under the **business
owner's account** and rotate every secret. This is task 4 in [`../../TASK.md`](../../TASK.md).

Why: ownership, billing, and access recovery must sit with the business, not an
individual. Treat the current `.env` / Infisical `dev` values as disposable.

How: re-provision under the owner's account, then set the new values in Infisical
(`dev` for staging + a fresh `prod` env). Restart both servers after changing shared
values (e.g. the Google client ID).

---

## Services to move + secrets to rotate

| Service | Env keys | Notes |
|---|---|---|
| **Neon Postgres** | `DATABASE_URL`, `TEST_DATABASE_URL` | Main DB + a separate test DB. Keep them distinct (setup script refuses a match). |
| **Infisical** | (the project itself) | Move ownership/billing of project `esl-chatbot`. |
| **Google OAuth** | `GOOGLE_CLIENT_ID` (+ frontend `NUXT_PUBLIC_GOOGLE_CLIENT_ID`) | Re-create the OAuth client; set prod Authorized JS origins. Same ID in 3 places (see monorepo CLAUDE.md). |
| **Resend (email)** | `RESEND_API_KEY`, `EMAIL_FROM` | Move off `onboarding@resend.dev` to the owner's **verified sending domain**. |
| **Cloudflare R2** | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | All five required together for R2 to activate; otherwise local-disk fallback. |
| **Gemini** | `GEMINI_API_KEY` | Dev + FREE + GOLD LLM. |
| **OpenAI** | `OPENAI_API_KEY` | PREMIUM LLM + TTS-1-HD. |
| **Azure Speech** | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | FREE/GOLD TTS + GOLD/PREMIUM STT & pronunciation. |
| **Deepgram** | `DEEPGRAM_API_KEY` | Dev + FREE STT. |
| **Upstash Redis** | `REDIS_URL` | Cache (degrades gracefully to DB if down). |
| **FIB** | `FIB_CLIENT_ID`, `FIB_CLIENT_SECRET`, `FIB_ENV=prod`, `FIB_WEBHOOK_URL` | Live creds are issued by FIB after submission (task 6). |
| **Sentry** (optional) | `SENTRY_DSN` | Error reporting; off in dev/test. |

## Production-only env to set

- `NODE_ENV=production` — activates rate limiting, the FIB webhook startup guard, and the Redis TLS check.
- `CORS_ORIGIN` — the live frontend origin.
- `FRONTEND_URL` — the live frontend origin (weekly-digest CTA; falls back to `CORS_ORIGIN` if unset).

## Procedure

1. Owner creates accounts for each service above and invites/transfers as needed.
2. Generate **new** credentials in each (do not reuse dev keys).
3. Populate Infisical `prod` with all new values; update `dev` for any shared service.
4. Re-create the Google OAuth client; update both the backend key and the frontend
   `NUXT_PUBLIC_GOOGLE_CLIENT_ID`; add prod origins. Restart both apps.
5. Verify Resend domain (DNS records) before relying on transactional email.
6. Proceed to [`deployment-runbook.md`](deployment-runbook.md).

## Verification

- App boots in `production` without env errors (Zod validates on startup).
- A test email sends from the verified domain.
- Google sign-in succeeds against the new client.
- An AI message routes to the intended provider per plan.
- FIB activation guard does not trip (i.e. `FIB_WEBHOOK_URL` is set when `FIB_CLIENT_ID` is).
