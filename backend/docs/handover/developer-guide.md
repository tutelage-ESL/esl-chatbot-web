# Developer Guide — ESL Chatbot (Tutelage)

Audience: a developer onboarding to maintain or extend this codebase. This guide
is the map; the authoritative per-area detail lives in the two `CLAUDE.md` files,
which are kept in sync with the code.

- Monorepo overview & type-sharing: [`../../../CLAUDE.md`](../../../CLAUDE.md)
- Backend contract (domain model, tiers, conventions): [`../../CLAUDE.md`](../../CLAUDE.md)
- Frontend rules (folders, HTTP layer, auth UI): [`../../../frontend/CLAUDE.md`](../../../frontend/CLAUDE.md)

> Sibling docs in this folder: [`deployment-runbook.md`](deployment-runbook.md)
> (going live + the migration-baseline procedure) and
> [`secret-rotation.md`](secret-rotation.md) (rotating every credential at handover).

---

## 1. What this is

An AI-assisted English-learning platform with a student / tutor / admin hierarchy.
Students hold conversations with an AI tutor (text + voice), get per-message
grammar/vocab/fluency scoring, build an SRS vocabulary deck, set goals, and track
progress. Tutors run classes, assign homework (Tasks) and vocabulary/goals, and
see class analytics. Admins manage users, subscriptions, and platform stats.

AI access is gated behind a verified contact + an `ACTIVE` subscription. Free tier
is generous but cost-capped; GOLD/PREMIUM raise the limits (see the tier table in
[`../../CLAUDE.md`](../../CLAUDE.md) → "Subscription & AI Tier System").

## 2. Repository shape

Two independent Bun workspaces — **no root workspace manager**. Always `cd` into one:

```
esl-chatbot-web/
├─ backend/    Bun + Express 5 + TypeScript + Prisma/PostgreSQL   (port 8000)
├─ frontend/   Nuxt 4 + Vue 3 + Tailwind 4 + shadcn-nuxt          (port 3001)
└─ package.json  (shared Prisma/Tailwind dev tooling only — NOT a workspace root)
```

The backend is the **source of truth for API types**: Swagger JSDoc on routers →
`openapi.json` → `frontend/types/api.ts` (committed). After any route/schema
change run `bun run generate:types` from `backend/` and commit the regenerated
`frontend/types/api.ts` in the same change. A pre-commit hook enforces this.

## 3. Backend architecture

Modular, layered, domain-based. Each module under `src/modules/<name>/`:

```
<name>.router.ts      route definitions + Swagger JSDoc (thin)
<name>.controller.ts  req/res only → calls the service
<name>.service.ts     business logic → calls Prisma (no req/res)
<name>.schema.ts       Zod validation (body/params/query)
<name>.types.ts        TypeScript types
```

Cross-cutting:

- `src/middlewares/` — `authenticate` (verifies Bearer access token → `req.user`),
  `authorize(...roles)` (role guard), `errorHandler`, `notFound`, `upload`, `rateLimits`.
- `src/utils/` — `AppError` (operational errors; carries `statusCode` + optional flat
  `details` merged into the JSON body), `asyncHandler`, `apiResponse`, `pagination`.
- `src/socket/` — Socket.io: `/chat` (text + voice pipeline) and `/notifications`
  (server push). JWT auth at handshake.
- `src/jobs/` — cron: streak reset, subscription expiry, stale-session cleanup,
  weekly digest (hourly tick, fires per-user at local Sunday 08:00).
- `src/config/` — env (Zod-validated), database, redis/cache, resend, sentry, swagger, logger.

**Response envelope** (everywhere): `{ success, message, data, meta? }`.
**Errors**: `throw new AppError(message, statusCode, details?)`. Zod failures →
422 with a field→message `errors` map. See "API Conventions" in [`../../CLAUDE.md`](../../CLAUDE.md)
for the full status-code policy.

## 4. Auth & permissions (read before touching anything user-facing)

- JWT access (15m) + refresh (7d, stored hashed server-side for true revocation).
- Registration creates an **unverified** account with `FREE/INACTIVE` — **no tokens,
  cannot log in**. The user verifies via 6-digit email OTP (`/auth/verify-email`,
  which logs them in) **or** signs in with Google (pre-verified). Either flips the
  FREE subscription `INACTIVE → ACTIVE` and unlocks AI.
- **Terms of Service**: registration requires `acceptAgreement: true`; login is
  blocked (403 `needsAgreement`) until the user has accepted the current agreement
  version, re-accepted via `/auth/accept-agreement`. Content/version live in
  `src/modules/auth/agreement.content.ts`. See Task 8 in [`../../TASK.md`](../../TASK.md).
- **Roles**: `STUDENT | TUTOR | ADMIN` (global account role). Class membership uses a
  separate `ClassRole` (`TUTOR | STUDENT` only). The backend enforces authorization on
  every endpoint; the frontend gating (via `useRole`) is UX only.
- **Stealth internal accounts** (`isInternal`): full ADMIN power, invisible to everyone
  including other admins. Never serialized, never settable via API. Grep `isInternal`
  to find every filter site before changing list/dashboard/notification code.

⚠️ **BE CAREFUL WITH ROLES/PERMISSIONS** — this warning leads both CLAUDE.md files for a reason.

## 5. Local development

Two terminals. Preferred path uses Infisical for secrets (see
[`../../SECRETS.md`](../../SECRETS.md)); the `:env` variants read a local `.env`.

```bash
# Terminal 1 — API on :8000
cd backend && bun install && bun dev        # or: bun run dev:env  (needs .env)

# Terminal 2 — Nuxt on :3001
cd frontend && bun install && bun run dev   # or: bun run dev:env  (needs .env)
```

**No Infisical / no cloud accounts?** One-command stack (API + Postgres + Redis):

```bash
docker compose up --build   # from repo root; API on :8000, schema auto-pushed
```

See [`../services/docker.md`](../services/docker.md) for seeding, infra-only mode, and hot reload.

Daily commands (from `backend/`):

```bash
bun run typecheck        # tsc --noEmit
bun run db:migrate       # prisma migrate dev (via Infisical)
bun run db:push          # prisma db push — schema sync without a migration
bun run db:seed          # seed test data (5 users; password123)
bun run generate:types   # regenerate frontend/types/api.ts from Swagger
bun test                 # integration tests (needs a running test DB)
```

Frontend type-check: `cd frontend && bunx nuxi typecheck` (no lint/test runner there).

## 6. Database & migrations

Prisma + PostgreSQL (Neon in dev/prod). Schema: `prisma/schema.prisma`. Models map
to snake_case tables via `@@map`. All IDs are UUID v4; all rows have
`createdAt`/`updatedAt`; user-owned relations cascade on delete.

**Important migration nuance:** the dev and prod databases were historically managed
with `prisma db push` (schema sync), not `migrate dev`, so `prisma migrate status`
reports the committed migrations as "not yet applied" even though the tables exist.
Migration **files are still maintained** for a clean prod `migrate deploy`. Before the
first `migrate deploy`, baseline the already-present migrations with
`prisma migrate resolve --applied <name>` — full procedure in
[`deployment-runbook.md`](deployment-runbook.md).

When you change the schema:

1. Edit `prisma/schema.prisma`.
2. `bun run db:generate` (regenerates the typed client).
3. Apply to your DB: `bun run db:push` (dev) **and** add a migration file for prod
   (either `migrate dev` against a clean shadow, or hand-author one matching Prisma's
   output — see `prisma/migrations/20260617190000_add_user_agreement/` as a recent example).
4. If routes/response shapes changed: `bun run generate:types` and commit `api.ts`.
5. Update the seed (`prisma/seed.ts`) if new tables need baseline rows.

## 7. AI / media providers (where the money goes)

Routing lives in `src/modules/ai/` and the provider files; model strings are one-line
constants. Summary (full detail in [`../ai-providers/`](../ai-providers/)):

- **LLM**: dev → Gemini Flash; FREE → Gemini 2.5 Flash-Lite; GOLD → Gemini 2.5 Flash;
  PREMIUM → GPT-5 mini (OpenAI, auto-falls back to Gemini). No key → heuristic stub.
- **TTS**: dev → Edge TTS (free); FREE+GOLD → Azure Neural; PREMIUM → OpenAI TTS-1-HD.
- **STT**: dev+FREE → Deepgram Nova-3; GOLD+PREMIUM → Azure (adds pronunciation scoring).
- **Storage**: Cloudflare R2 for audio/avatars; falls back to local disk in dev.

All provider keys are optional — the matching feature returns 503 (or a stub) when a
key is missing, so the app boots without any AI credentials.

## 8. Testing

- Bun's built-in runner + `supertest` (real HTTP against the Express app, full
  middleware chain). Integration-style.
- Co-located: `src/modules/<name>/__tests__/<name>.router.test.ts`.
- Runs against a **dedicated** `TEST_DATABASE_URL` (must differ from `DATABASE_URL`;
  the setup script refuses to wipe a matching DB). Prep + run:

  ```bash
  bun run test:setup       # push schema + seed the test DB (via Infisical)
  bun run test             # run the suite
  # …or the no-Infisical variants: test:setup:env / test:env
  ```

- AI is mocked and FIB is stubbed, so tests are deterministic in CI. Current suite:
  **398 tests across 16 files**. Shared helpers: `src/test/helpers.ts`
  (`createTestUser`, `login`, signed-token factories).

## 9. CI/CD

`.github/workflows/ci.yml` — two parallel jobs on push to `main` and on PRs:

- **Typecheck**: install → `prisma generate` → `tsc --noEmit` (dummy DATABASE_URL).
- **Integration tests**: Postgres 16 service container → `prisma generate` →
  `test:setup:env` → `test:env`.

**Manual step (one-time):** enable branch protection — Settings → Branches → require
the `Typecheck` and `Integration tests` checks on `main`. CD (auto-deploy) is wired
during Hosting (Task 5).

## 10. Going to production

The remaining launch work is operational, sequenced, and tracked in
[`../../TASK.md`](../../TASK.md) (tasks 4 → 5 → 6) and the
[`deployment-runbook.md`](deployment-runbook.md):

1. **Account migration** — re-provision every third-party service under the business
   owner's account and rotate all secrets ([`secret-rotation.md`](secret-rotation.md)).
2. **Hosting** — pick hosts (Render recommended for the Bun API), set a domain,
   `NODE_ENV=production`, `CORS_ORIGIN`, `FRONTEND_URL`; baseline migrations then
   `migrate deploy`.
3. **FIB production** — submit the business checklist for live payment credentials
   once a public HTTPS URL exists.

Health probe once running: `GET /health`. API docs (Swagger UI): `GET /api-docs`.
