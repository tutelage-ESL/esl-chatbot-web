# Integration Testing

The backend uses **Bun's test runner** + **supertest** to exercise the full Express
middleware chain (auth → authorize → validation → controller → service → DB) exactly
as the frontend experiences it. Tests live next to each module in
`src/modules/<name>/__tests__/<name>.router.test.ts`.

## Reliability model

Three guarantees make the suite trustworthy:

1. **Dedicated test database.** Tests never run against the dev/prod DB. A preload
   (`src/test/setup.ts`, wired via `bunfig.toml`) redirects `DATABASE_URL` to
   `TEST_DATABASE_URL` *before* Prisma loads, and **hard-fails** if `TEST_DATABASE_URL`
   is missing or identical to `DATABASE_URL`. The seed step wipes all data, so this
   guard is what prevents a catastrophic reset of real data.
2. **Mocked AI layer.** `src/modules/ai/ai.service.ts` is mocked in the preload, so
   `generateAIResponse` / `generateTTS` / `transcribeAudio` return deterministic
   values instead of calling Gemini/OpenAI. Tests are fast, free, and stable.
3. **Self-cleaning tests.** Tests that create rows use collision-safe random
   usernames/emails (`uniqueId()`) and delete what they create in `afterAll`
   (cascade removes owned rows). Avoid asserting absolute global counts unless you
   control the seed state.

## One-time setup

1. **Create a separate database** (e.g. a second Neon branch/database — see
   `docs/services/database.md`). Anything works as long as it is **not** your dev DB.
2. **Add `TEST_DATABASE_URL`** to either:
   - Infisical `dev` env (recommended — keeps it with the other secrets), or
   - your local `.env` (if you run the `:env` script variants).
3. **Provision the schema + seed data:**
   ```bash
   bun run test:setup        # via Infisical
   # or
   bun run test:setup:env    # without Infisical (.env)
   ```

## Running

```bash
bun run test          # via Infisical (reads secrets from dev env)
bun run test:env      # without Infisical (reads .env)
bun run test:watch    # watch mode (Infisical)
bun test src/modules/auth   # a single module
```

Re-run `test:setup` whenever the Prisma schema or seed changes (it re-pushes and
re-seeds the test DB). Day-to-day, `bun run test` reuses the existing seeded test DB.

## Conventions

- **Tokens:** prefer `login(SEED.x)` (real auth flow). For edge cases that can't be
  produced via login (expired / wrong-secret / arbitrary-user tokens), use the
  crafters in `src/test/helpers.ts`.
- **Status matrix per endpoint:** cover 401 → 403 → 422 → business errors → 2xx, and
  assert the `{ success, message, data }` envelope, not just the status code.
- **Config-dependent success paths** (Google ID-token verification, Resend email)
  are non-deterministic in CI — assert only their deterministic guards (422/401),
  not the live success path.

## Coverage status

- ✅ Phase 0 — harness (`src/test/setup.ts`, `helpers.ts`, `scripts/setup-test-db.ts`)
- ✅ Phase 1 — Auth (`auth.router.test.ts`): login, register, me, refresh, logout,
  set-password, link-google/forgot/google validation
- ✅ Pre-existing — `users.router.test.ts` (GET /users authz + pagination)
- ✅ Phase 2 — Sessions (`sessions.router.test.ts`): create (sub gating, FREE daily
  cap, lazy downgrade), list filters, detail authz, end-session aggregation (avg
  scores, CEFR, progress + metrics EMA, streak-milestone notification), stats authz
  matrix (student/tutor/admin). 85 pass total.
- ✅ Phase 3 — Messages (`messages.router.test.ts`): send (201 + AI reply/eval,
  messageCount bump, 404/409/422 matrix), per-session 429 + FREE daily 429,
  context-window truncation (FREE 10 / default 20 via the `__aiContextLength` mock
  hook), list (order, pagination, authz). 105 pass total.
- ✅ Phase 4 — Classes (`classes.router.test.ts`): create authz, join flow
  (404/403-blocked/409-inactive/409-dup/410-expired+rotation, case-insensitive),
  detail authz + refresh-on-read (tutor rotates / student doesn't), mine, code
  refresh/block/settings two-layer authz, update, member-removal guards (last-tutor
  409), student monitoring + analytics authz. 150 pass total.
- ✅ Phase 5 — Vocabulary/Goals/Progress (`vocabulary` / `goals` / `progress`
  `.router.test.ts`): SM-2 review math (interval/ease/mastery progression +
  progress increment), lowercase dup 409, due/source filters; goal create/assign
  authz + COMPLETED auto-fields + `?studentId=` guard; progress list/today-on-demand/
  summary bounds. 207 pass total.
- ✅ Phase 6 — Metrics/Admin/Subscriptions (`metrics` / `admin` / `subscriptions`
  `.router.test.ts`): metrics upsert + tutor/admin authz; admin user patch,
  subscription assign (GOLD duration / FREE permanent / 422 guards) + cancel
  (→ FREE ACTIVE) + dashboard, all ADMIN-guarded; `GET /users/me/subscription` +
  FIB auth guards. **239 pass total — all phases complete.**
