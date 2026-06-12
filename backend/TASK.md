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
Do after account migration is complete.

- Choose host for backend (Render recommended: native Bun support, ~$7/mo web service + $7/mo Postgres or keep Neon)
- Choose host for frontend (Vercel or Render static)
- Register/configure domain
- Set `CORS_ORIGIN` to the live frontend domain
- Set `NODE_ENV=production` — activates rate limiting, FIB_WEBHOOK_URL guard, Redis TLS check
- Run `bun run db:migrate` against the prod DB
- Smoke-test all critical paths before announcing

**Pre-deploy checklist:**
- [ ] `bun run typecheck` passes
- [ ] `bun test` passes (auth + sessions minimum)
- [ ] All Prisma migrations committed
- [ ] All prod secrets in Infisical `prod` env
- [ ] `CORS_ORIGIN` set to live frontend domain
- [ ] Health endpoint responding

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

## 8. User Agreement / Terms of Service Signing
Legal requirement before charging users.

- Get agreement text from business owner
- New `UserAgreement` model: `{ userId, version, acceptedAt, ipAddress }`
- On registration: store acceptance with version string and IP
- `GET /auth/agreement` — returns current agreement version + text
- Guard: if a new agreement version is published, prompt user to re-accept on next login (frontend banner)

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

- **Business owner doc** (simple): monthly costs breakdown (AI, hosting, storage, email), how subscriptions work, how to use the admin panel, who to contact for support
- **Developer doc** (complex): full architecture, how to onboard, how to deploy, how to rotate secrets, module map — update `backend/CLAUDE.md` + `docs/`
- **Investor doc** (medium): product overview, market, tech stack summary, growth levers, subscription tiers

---

## Blocked

### FIB Payment — Waiting for Deployment
See task 6 above. Code is complete; only the live URL is missing.

### Stripe Integration — Long-Term Future
Not started. Add after FIB is live and the business wants a second payment option.

### Lessons Module — Deferred
No `Lesson` model or data source yet. `lessonsCompleted`, `readingSkill`, `writingSkill`, `listeningSkill` in `UserMetrics` are zeroed placeholders. Build when the business defines what a "lesson" is.
