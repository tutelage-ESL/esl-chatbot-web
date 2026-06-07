# Backend Task Board

Tasks are ordered by recommended priority. Work top-to-bottom.

---

## 1. Teacher Task System — NEW FEATURE (High Priority)
Tutors assign homework/tasks with deadlines. Students submit their work. AI or tutor gives feedback.

- New `Task` and `TaskSubmission` models in Prisma schema
- `POST /classes/:id/tasks` — tutor creates a task with title, description, deadline
- `GET /classes/:id/tasks` — list tasks for a class (tutor/admin sees all, student sees assigned)
- `GET /tasks/:id` — task detail
- `PATCH /tasks/:id` — tutor updates or closes a task
- `DELETE /tasks/:id` — tutor deletes
- `POST /tasks/:id/submissions` — student uploads their submission (text or file)
- `GET /tasks/:id/submissions` — tutor lists submissions for a task
- `PATCH /tasks/:id/submissions/:submissionId/feedback` — tutor writes feedback
- Notifications: `TASK_ASSIGNED` (student), `TASK_SUBMITTED` (tutor)
- Add to `frontend/TASKS.md` so Rekar knows what to wire

---

## 2. CI/CD Pipeline — GitHub Actions
Automated checks on every push to main and on PRs.

- `.github/workflows/ci.yml`: typecheck → `bun test` → (optional) deploy to Render on merge to main
- Requires `TEST_DATABASE_URL` as a GitHub Actions secret
- Gate: PRs cannot merge if typecheck or tests fail

---

## 3. Docker — Local Dev Setup
Not needed for Render deployment but helps new devs onboard in minutes.

- `backend/Dockerfile` — multi-stage: install → build → run with Bun
- `docker-compose.yml` at repo root — services: `api` (backend), `postgres`, `redis`
- `.dockerignore` — exclude node_modules, .env, openapi.json
- Update `docs/` with a "local dev via Docker" quickstart

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

## 7. Weekly Digest Email
Resend is already wired (welcome + password reset done). This adds the weekly summary.

- New cron job `src/jobs/weekly-digest.job.ts` — runs Sunday 08:00 UTC
- Email: streak, study time this week, skill progress, vocab due count, encouraging CTA
- Respect user timezone (`LearnerProfile.timezone`)
- Add `emailDigestEnabled` boolean to `LearnerProfile` (opt-out, default true)
- New migration + seed update

---

## 8. User Agreement / Terms of Service Signing
Legal requirement before charging users.

- Get agreement text from business owner
- New `UserAgreement` model: `{ userId, version, acceptedAt, ipAddress }`
- On registration: store acceptance with version string and IP
- `GET /auth/agreement` — returns current agreement version + text
- Guard: if a new agreement version is published, prompt user to re-accept on next login (frontend banner)

---

## 9. Hidden Programmer Admin
A stealth monitoring account not visible as "ADMIN" to regular users.

- Decide on approach: separate `SUPERADMIN` role vs a flag on the User model (e.g. `isInternal: Boolean`)
- Internal users excluded from `GET /users` admin listing
- Full access to all endpoints
- Not shown in class member lists

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
