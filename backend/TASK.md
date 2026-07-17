# Backend Task Board

Tasks are ordered by recommended priority. Work top-to-bottom.

---

## 1. Teacher Task System ✅ DONE (2026-06-11)
Tutors assign homework/tasks with deadlines. Students submit their work. Tutor gives feedback.

- ✅ New `Task` and `TaskSubmission` models in Prisma schema + `TaskStatus` enum (OPEN/CLOSED)
- ✅ `TASK_ASSIGNED` + `TASK_SUBMITTED` added to `NotificationType` enum
- ✅ `POST /classes/:id/tasks` — tutor creates a task with title, description, deadline
- ✅ `GET /classes/:id/tasks` — list tasks for a class (tutors/admins get submissionCount, students get mySubmission)
- ✅ `GET /tasks/:id` — task detail
- ✅ `PATCH /tasks/:id` — tutor updates title/description/deadline or opens/closes a task (`closed: bool`)
- ✅ `DELETE /tasks/:id` — tutor deletes
- ✅ `POST /tasks/:id/submissions` — student uploads their submission (text or fileUrl; 409 if already submitted or task closed)
- ✅ `GET /tasks/:id/submissions` — tutor lists submissions for a task
- ✅ `PATCH /tasks/:id/submissions/:submissionId/feedback` — tutor writes feedback
- ✅ Notifications: TASK_ASSIGNED → all students on create; TASK_SUBMITTED → all tutors on submit
- ✅ Added to `frontend/TASKS.md` so Rekar knows what to wire
- ✅ `bun run db:push` applied schema to DB; `bun run generate:types` updated `frontend/types/api.ts`

---

## 2. CI/CD Pipeline — GitHub Actions ✅ DONE (2026-06-12)
Automated checks on every push to main and on PRs.

- ✅ `.github/workflows/ci.yml` created — two parallel jobs: `typecheck` and `test`
- ✅ `typecheck` job: `bun install` → `prisma generate` → `tsc --noEmit` (dummy DATABASE_URL, no real DB needed)
- ✅ `test` job: spins up a **Postgres 16 service container** (no external secret needed) → `prisma generate` → `test:setup:env` (db push + seed) → `test:env` (239 tests, AI mocked, FIB stubbed)
- ✅ Concurrency group cancels redundant runs on the same branch
- **Manual step required:** Enable branch protection in GitHub repo settings:
  `Settings → Branches → Add rule for main → "Require status checks to pass before merging"` → select `Typecheck` and `Integration tests`
- **CD deferred:** auto-deploy to Render will be wired in Task 5 (Hosting) once a host is configured

---

## 3. Docker — Local Dev Setup ✅ DONE (2026-06-12)
One-command local stack for onboarding without Infisical or cloud accounts.

- ✅ `backend/Dockerfile` — multi-stage: `deps` (full install + prisma generate) → `dev` (db push + bun --watch) → `prod-deps` → `production` (prod-only deps, ready for Task 5)
- ✅ `docker-compose.yml` at repo root — services: `api` (dev target), `postgres:16-alpine`, `redis:7-alpine`; healthchecks; persistent `pgdata` volume; targeted bind mounts for hot reload; optional AI keys via root `.env`
- ✅ `backend/.dockerignore` — excludes node_modules, .env*, uploads, logs, docs, openapi.json, .git
- ✅ `backend/docs/services/docker.md` — quickstart, seeding, infra-only mode, hot reload scope, troubleshooting
- ✅ Root `.gitignore` updated: `/.env` (compose interpolation file) is now gitignored
- ✅ Root `CLAUDE.md` updated: Docker compose listed as the no-Infisical dev alternative

---

## 4. Account Migration — All Services → Business IT Email
Everything is currently on Aland's personal accounts. Must move before production launch.

**Services to migrate:**
- Neon Postgres (current DB + test DB)
- Infisical project `esl-chatbot` (ownership + billing)
- Google OAuth client (`GOOGLE_CLIENT_ID` + frontend `NUXT_PUBLIC_GOOGLE_CLIENT_ID`) — re-create under business account, update Authorized JS origins for prod domain
- Resend (`RESEND_API_KEY`, `EMAIL_FROM`) — move off `onboarding@resend.dev` to verified sending domain
- Cloudflare R2 (`R2_*`, bucket `tutelage-uploads`)
- Gemini API key (`GEMINI_API_KEY`)
- OpenAI API key (`OPENAI_API_KEY`) — PREMIUM tier
- Azure Speech (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`)
- Deepgram (`DEEPGRAM_API_KEY`)
- Upstash Redis (`REDIS_URL`)

**After migration:** rotate every secret (old dev values were shared in chat and are compromised). Update Infisical `prod` env with all new values.

---

## 5. Hosting & Deployment
In progress (started 2026-07-02). **Backend is LIVE.** Business owner's email is the account
owner; Aland is fronting hosting cost on his personal card until the owner's card is ready.

**Identity for all new infra:** dedicated business Gmail `tutelage.it.team@gmail.com`
(NOT Aland's personal), every credential in Bitwarden. `Alandkf` added as a second GitHub
org owner after the 2026-07-02→07-10 account-suspension incident (single-point-of-failure fix).

**Host decision — researched and confirmed 2026-07-02** (compared Render, Railway,
Fly.io, Vercel on cost/reliability/fit for our Bun+WebSocket+cron workload; see
`docs/handover/deployment-runbook.md` §1 for the writeup and sources):
- **Backend → Render** (Starter, $7/mo target). `render.yaml` blueprint committed at the repo root.
- **Frontend → Vercel** (Pro, $20/mo — Hobby forbids commercial use).

**Infra provisioned under the business email (all in Bitwarden):**
- ✅ Render service `tutelage-api` — LIVE at `https://tutelage-api.onrender.com` (Frankfurt,
  Docker `production` stage, deploys from `main` via `render.yaml`). On the **Free** instance
  for now (deliberate — no traffic yet; flip to Starter before public launch).
- ✅ Neon (`tutelage-prod` project + `test` branch for TEST_DATABASE_URL, Frankfurt, direct/unpooled URL)
- ✅ Upstash Redis (`tutelage-prod`, Frankfurt, `rediss://` TLS)
- ✅ Cloudflare R2 (bucket `tutelage-uploads`, public R2.dev URL, scoped token)
- ✅ Prod DB migrations run (`prisma migrate deploy` — fresh Neon, no baseline dance needed)
- ✅ Prod-only fixes shipped during first deploy: dropped Winston file transports (EACCES on
  non-root container) + multi-origin comma-separated `CORS_ORIGIN`.

**Frontend / domain:**
- ✅ Rekar's Vercel deploy is LIVE at `https://ai.tutelage.krd`. DNS is managed directly at
  **Namecheap** (Cloudflare turned out not to be involved — all records go in Namecheap's
  Advanced DNS for `tutelage.krd`).

**AI / service provider keys** (overlaps Task 4 rotation):
- ✅ Gemini (`GEMINI_API_KEY`, free tier — see billing wrinkle in the AI-billing note)
- ✅ Deepgram (`DEEPGRAM_API_KEY`, saved in backend env)
- [ ] Azure Speech (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`)
- [ ] OpenAI (`OPENAI_API_KEY`, PREMIUM tier)
- ✅ Resend — **fully DONE & smoke-tested E2E on prod (2026-07-17)**: domain `tutelage.krd`
  verified (eu-west-1, DNS at Namecheap), `tutelage-prod` API key (Sending access, scoped
  to the domain), `RESEND_API_KEY` + `EMAIL_FROM=Tutelage <noreply@tutelage.krd>` set on
  Render. Verified live: register → OTP email delivered → verify-email → FREE ACTIVE + tokens.
  Gotchas hit: `EMAIL_FROM` must be `Name <addr>` or bare `addr` (bare `<addr>` → Resend 422);
  domain-scoped API keys break when the domain is deleted/re-added. Cleanup notes: test user
  `aland_smoketest` exists in prod DB; local `.env` still has the old personal-account dev key
  (rotate in Task 4).

**Remaining steps:**
- [ ] Google OAuth: a single client already exists under the business email (its ID is in
      the backend env). No need for a separate prod client — just add all prod origins to its
      Authorized JavaScript origins (`https://ai.tutelage.krd`, `https://tutelage-api.onrender.com`,
      plus localhost:3001/8000 for testing) and ensure the SAME ID is in all 3 places
      (frontend `.env`, Infisical, this OAuth client — the 3-places rule in root CLAUDE.md).
- [ ] Finish DNS for `ai.tutelage.krd`; give Rekar the backend URL for `NUXT_PUBLIC_BASE_URL`
      (mention Free-tier ~50s cold start during testing)
- [ ] Set `CORS_ORIGIN` (comma-separated) + `FRONTEND_URL` on Render once the Vercel domain is final
- [ ] Populate remaining Render env vars (blueprint's `sync: false` list) with rotated prod secrets
- [ ] Private beta: Aland + owner + trusted testers exercise the app end-to-end
- [ ] Flip Render Free → Starter before public launch
- [ ] Smoke-test all critical paths (§5 below) before announcing

**Small follow-ups found during the Resend rollout (2026-07-17):**
- [ ] **Bug: auth emails swallow Resend errors** — the Resend SDK returns `{ data, error }`
      and never throws, but the 4 send sites in `auth.service.ts` (verification, welcome,
      forgot-password ×2) don't check `error`, so failed sends return 200 with zero trace.
      Apply the same `if (error) throw` fix already used in `weekly-digest.job.ts` (Task 7).
- [ ] Swagger (`/api-docs`) is publicly exposed on prod — decide whether to disable or
      protect it before public launch.
- [ ] `docs/services/hosting.md` says the health endpoint is `/api/v1/health` — it's `/health`.
- [ ] Delete the `aland_smoketest` prod test user when no longer useful.

**Pre-deploy checklist:**
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes (auth + sessions minimum)
- ✅ All Prisma migrations committed
- [ ] All prod secrets in Infisical `prod` env
- [ ] `CORS_ORIGIN` set to live frontend domain
- ✅ Health endpoint responding (Render `tutelage-api` boots + serves `/api/v1/health`)

---

## 6. FIB Production Submission
Unblocked once the app is hosted and has a public URL.

- Code is 100% complete (webhook 202, fail-fast guard, reconcile job, docs)
- Fill in business fields in `docs/payment/fib-preproduction-checklist.md` (business name, IBAN, contacts, logo 500×500 PNG)
- Set `FIB_ENV=prod`, real `FIB_CLIENT_ID`/`FIB_CLIENT_SECRET`, `FIB_WEBHOOK_URL` in Infisical `prod`
- Submit checklist to FIB — they issue live credentials
- Smoke-test one real low-value subscription end-to-end
- Note: FIB charges 1% commission per transaction — confirm pricing accounts for it

---

## 7. Weekly Digest Email ✅ DONE (2026-06-12)
Resend is already wired (welcome + password reset done). This adds the weekly summary.

- ✅ `emailDigestEnabled Boolean @default(true)` + `digestLastSentAt DateTime?` added to `LearnerProfile`; migration `20260612150622_add_email_digest_fields` applied
- ✅ `PATCH /users/me/learner-profile` accepts `emailDigestEnabled` (opt-out toggle); exposed in `GET /users/me` and `GET /users/:id` responses; Swagger + `frontend/types/api.ts` updated
- ✅ `FRONTEND_URL` optional env var added (`config/env.ts` + `.env.example`); digest CTA defaults to `CORS_ORIGIN`
- ✅ Cron changed to hourly tick (`0 * * * *`); `runWeeklyDigestJob()` matches users whose local time is **Sunday 08:00** per `LearnerProfile.timezone` — satisfies both "Sunday 08:00" and "respect timezone" spec requirements
- ✅ Email content: streak, study time, sessions, messages, vocab reviewed, skill scores (grammar/vocab/fluency) with weekly delta from `Progress.skillSnapshot`, vocab due, active goals (truncated 80 chars), CTA button, "turn off in Settings → Profile" footer note
- ✅ HTML builder split into `src/jobs/weekly-digest.email.ts`; orchestration in `weekly-digest.job.ts`
- ✅ Fixed Resend SDK bug: SDK returns `{ data, error }` not throws — now checks `if (error) throw` so per-user `catch + failed++` actually fires on API errors
- ✅ `digestLastSentAt` stamped only on success; 6-day dedup guard prevents double-sends from DST shifts or manual reruns
- ✅ `bun run job:digest` (+ `-- --force`) dev trigger in `scripts/run-digest.ts`
- ✅ Seed: `student_yuki` has `emailDigestEnabled: false`; `student_ali` defaults to `true` — lets `--force` verify the filter
- ✅ Tests: `src/jobs/__tests__/weekly-digest.test.ts` (unit: `isLocalSundayDigestHour`, `buildDigestHtml`, `esc`); 3 new integration tests in `users.router.test.ts` (set false/true, 422 non-boolean, `GET /users/me` includes field)
- **Follow-up (pre-launch):** tokenized one-click unsubscribe link — settings toggle is sufficient for now
- **Prod note:** set `FRONTEND_URL` in Infisical `prod` env to the live frontend domain

---

## 8. User Agreement / Terms of Service Signing ✅ DONE (2026-06-17, infra) — ⚠️ placeholder text pending
Legal requirement before charging users. **Plumbing is final; only the legal copy is outstanding.**

- ✅ New `UserAgreement` model: `{ userId, version, ipAddress, acceptedAt }`, `@@unique([userId, version])` (one row per accepted version = full audit history); migration `20260617190000_add_user_agreement`
- ✅ Agreement content + version live in `src/modules/auth/agreement.content.ts` (`CURRENT_AGREEMENT`, currently v1.0). Bumping `version` forces every user to re-accept — no code/migration change. The `text` is a **project-specific v1.0 template** (real Tutelage terms: service, tiers, FIB/cash payment, AI-content disclaimer, classes, data, etc.); have legal/owner review the `[Company]`/governing-law/refund clauses, then bump version — nothing else changes.
- ✅ `GET /auth/agreement` — public; returns `{ version, effectiveDate, text }`
- ✅ `POST /auth/register` now requires `acceptAgreement: true` (422 otherwise); records acceptance with version + `req.ip` inside the create transaction. Google new-account branch (`POST /auth/google` with username) requires `acceptAgreement: true` too (400 otherwise).
- ✅ Re-accept guard on **both** `POST /auth/login` and the existing-user/merge paths of `POST /auth/google` → **403** `{ needsAgreement: true, agreementVersion }` (via new `AppError.details`) when the current version isn't accepted. Blocked user calls **`POST /auth/accept-agreement`** — `{ username, password }` (LOCAL) or `{ idToken }` (Google, no password) — re-proves identity, records acceptance, returns tokens. (Google guard added in review so version bumps truly force *everyone* to re-accept, not just password users.)
- ✅ `errorHandler` hardened: `AppError.details` is spread so it can only *add* fields, never clobber `success`/`message`/`data`.
- ✅ Seed: all 5 seed users get an acceptance row so they can log in. Existing prod users (none accepted yet) will be prompted to re-accept on first login post-deploy — intended.
- ✅ Tests: 8 new cases in `auth.router.test.ts` (GET agreement, login 403 needsAgreement, accept-agreement records + unblocks, wrong-pw 400, idToken-variant 401/503, 422 ×2, register-without-agreement 422). Auth suite **50 pass**; full suite green (heavy DB tests occasionally hit the 5s timeout on remote Neon — environmental, not logic).
- **Remaining (business):** provide final Terms text → drop into `agreement.content.ts` + bump version. Frontend (Rekar): register checkbox + login-403 `needsAgreement` re-accept modal (noted in `frontend/TASKS.md`).
- **Prod note (Task 5):** baseline `20260617190000_add_user_agreement` alongside the other catch-up migrations before `migrate deploy` (see Account/Hosting runbook in `docs/handover/`).

---

## 9. Hidden Programmer Admin ✅ DONE (2026-06-12)
A stealth monitoring account not visible as "ADMIN" to anyone — including other admins.

- ✅ Approach decided: `isInternal Boolean @default(false)` on the User model (NOT a new role — keeps every `authorize("ADMIN")` callsite and the shared `Role` enum untouched)
- ✅ `isInternal` is never serialized in any API response, never in Swagger (`frontend/types/api.ts` unchanged), and not settable via any endpoint — set only via seed (dev) or direct SQL (prod)
- ✅ Excluded from `GET /users` (incl. `?search=` and `?role=` filters); `GET /users/:id` → 404
- ✅ All 6 admin mutation routes (`PATCH /admin/users/:id`, profile, avatar, learner-profile, PUT/DELETE subscription) → 404 on internal targets (`assertTargetNotInternal` in `admin.service.ts`)
- ✅ Admin dashboard counts exclude internal users (roles, subscriptions by plan, DAU/WAU, sessions today, revenue by provider)
- ✅ Hidden from class member lists, student rosters, student detail (404), class analytics, and `memberCount` on `GET /classes` + `/classes/mine`; tutor dashboard excludes them
- ✅ Notification/email fan-outs skip internal recipients (announcements, TASK_ASSIGNED, TASK_SUBMITTED, weekly digest)
- ✅ Full access preserved: internal account passes all role guards, can join classes, list users, view dashboards
- ✅ Seed: `sys_monitor` / monitor@tutelage.com (`password123`) — stealth ADMIN with FREE ACTIVE sub + zeroed metrics
- ✅ Catch-up migration generated via `bun run db:migrate` (bundles drifted Task-system/archiving/vocab changes + `isInternal`)
- ✅ Tests: stealth describe blocks in users/admin/classes/tutor router tests; `createTestUser({ isInternal: true })` helper
- **Prod note (Task 5):** the prod DB was schema-pushed, so before `migrate deploy` it must be baselined with `prisma migrate resolve --applied <catch-up-migration>`. Create the prod internal account via SQL with a non-guessable username/email.

---

## 10. Documentation × 3 Audiences
Content task — coordinate with business owner for non-technical sections.

- ✅ **Developer doc** (complex) — DONE (2026-06-17): `docs/handover/` — `developer-guide.md`
  (architecture, onboarding, testing, CI, module map), `deployment-runbook.md` (hosting +
  the migration-baseline procedure + FIB + smoke tests + rollback), `secret-rotation.md`
  (account migration + rotating every credential). `backend/CLAUDE.md` already kept current.
- **Business owner doc** (simple): monthly costs breakdown (AI, hosting, storage, email), how subscriptions work, how to use the admin panel, who to contact for support — **blocked: needs owner's cost numbers**
- **Investor doc** (medium): product overview, market, tech stack summary, growth levers, subscription tiers — **blocked: needs owner's market/business input**

> **Prod-hardening note:** the `NODE_ENV=production` + `FIB_WEBHOOK_URL` startup guard is
> already implemented in `src/config/env.ts` (fails fast only when `FIB_CLIENT_ID` is set
> without a webhook URL). The migration-baseline procedure is documented in
> `docs/handover/deployment-runbook.md`.

---

## Blocked

### FIB Payment — Waiting for Deployment
See task 6 above. Code is complete; only the live URL is missing.

### Stripe Integration — Long-Term Future
Not started. Add after FIB is live and the business wants a second payment option.

### Lessons Module — Deferred
No `Lesson` model or data source yet. `lessonsCompleted`, `readingSkill`, `writingSkill`, `listeningSkill` in `UserMetrics` are zeroed placeholders. Build when the business defines what a "lesson" is.
