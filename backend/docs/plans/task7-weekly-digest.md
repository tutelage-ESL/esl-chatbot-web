# Implementation Plan — Task 7: Weekly Digest Email

> **For the implementing session:** read this whole file before touching code.
> The job is NOT being built from scratch — a v1 already exists at
> `src/jobs/weekly-digest.job.ts` (scheduled in `src/jobs/index.ts:39`). This plan
> upgrades it to meet the full Task 7 spec and fixes one real bug in it.

---

## Current state (already done — do not redo)

- `src/jobs/weekly-digest.job.ts` exists: queries students, aggregates last-7-days
  Progress rows, renders an HTML email (streak, study time, sessions, messages,
  vocab practiced, vocab due, active goals, estimated level, no-activity nudge),
  sends via `resend.emails.send`, HTML-escapes all user strings via `esc()`.
- Scheduled in `src/jobs/index.ts` as `0 8 * * 1` (Monday 08:00 UTC) wrapped in
  `safeRun()` (Winston + Sentry capture).
- Recipient filter already correct on: `isActive: true`, `emailVerified: true`,
  `role: "STUDENT"`, `isInternal: false` (stealth-admin exclusion per Task 9).
- Early-returns with a warning when `RESEND_API_KEY` is unset.

## Gaps vs the Task 7 spec (the actual work)

1. No `emailDigestEnabled` opt-out field (schema, API, job filter all missing).
2. Timezone is ignored — single UTC send time; spec says respect
   `LearnerProfile.timezone`.
3. Spec says **Sunday** 08:00; current cron is Monday.
4. "Skill progress" is not in the email (no grammar/vocab/fluency scores).
5. No CTA link back to the app; no "manage in settings" note.
6. **Bug:** the Resend Node SDK does **not throw** on API errors — it returns
   `{ data, error }`. The current `try/catch + sent++` counts API failures as
   successes. Same latent issue exists in `auth.service.ts` sends, but only fix
   the digest job in this task (note the other for later).
7. No tests, no manual dev trigger, seed/docs not updated.

---

## Step 1 — Prisma schema + migration

In `prisma/schema.prisma`, add to `model LearnerProfile` (around line 246, next to
`timezone`):

```prisma
emailDigestEnabled Boolean   @default(true)
digestLastSentAt   DateTime?
```

- `emailDigestEnabled` — the spec'd opt-out, default true.
- `digestLastSentAt` — idempotency guard (see Step 2); also makes the job safely
  re-runnable and gives admins visibility.

Run `bun run db:migrate` to create the migration (name it
`add_email_digest_fields`). The catch-up baseline from Task 9 is already in place;
this is a normal new migration on top.

## Step 2 — Timezone-aware scheduling (core design)

**Design: hourly cron + local-time matching.** A user receives the digest at
**their local Sunday 08:00**. This satisfies both spec lines ("Sunday 08:00" and
"respect user timezone") with one mechanism.

In `src/jobs/index.ts`:

```ts
// Hourly — weekly digest fires per-user at their local Sunday 08:00
jobs.push(new Cron("0 * * * *", { timezone: "UTC" }, safeRun("weekly-digest", runWeeklyDigestJob)));
```

Update the count/log line at the bottom of `startCronJobs()` accordingly.

Inside `runWeeklyDigestJob(now = new Date())`:

1. `prisma.learnerProfile.groupBy({ by: ["timezone"] })` — cheap, returns the
   distinct timezone strings actually in use.
2. For each timezone string, compute its current local weekday + hour using
   `Intl.DateTimeFormat` — **copy the invalid-IANA guard pattern from
   `sessions.service.ts:400-402`** (free-text column; an invalid string must fall
   back to `"UTC"`, never crash the job). Use
   `new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", hour12: false }).formatToParts(now)`.
3. Keep only timezones where local time is **Sunday, hour === 8**. If none match,
   return early (this is the common case for most hourly ticks — log at `debug`,
   not `info`, to avoid 24 log lines/day of noise).
4. Query users as today, plus:
   ```ts
   learnerProfile: {
     is: {
       emailDigestEnabled: true,
       timezone: { in: matchedTimezones },
       OR-guard for digestLastSentAt: null OR lt now - 6 days
     }
   }
   ```
   Concretely: `AND: [{ OR: [{ digestLastSentAt: null }, { digestLastSentAt: { lt: sixDaysAgo } }] }]`.
   The 6-day guard prevents double-sends if a DST shift or manual re-run makes
   local 08:00 occur twice, and makes `--force` reruns safe.
   Note: users without a LearnerProfile row are excluded by `is:` — that's fine,
   registration creates the profile in the same transaction, so every STUDENT has one.
5. **Per-timezone date windows:** the current code computes `today`/`weekStart`
   once in UTC. Since sends now happen per timezone batch, compute `today` (local
   calendar date pinned to UTC midnight — same `en-CA` trick as
   `sessions.service.ts:404-407`) and `weekStart = today - 7d` **per timezone**,
   and use them for both the `progress.where.date.gte` filter and the
   `vocabularies srsDue lte today` count. Simplest structure: loop the matched
   timezones and run the user query once per timezone (there will be very few
   matching at any given hour).
6. After a **successful** send, `prisma.learnerProfile.update` that user's
   `digestLastSentAt = now`. Do this inside the per-user try/catch, after the
   send check passes — a failed send must NOT stamp the field, so the user can
   be retried by a `--force` run.

**Why not keep one weekly UTC cron?** Local Sunday 08:00 spans ~38 hours of UTC
time across the world's timezones; a single cron can't respect timezones. The
hourly tick is nearly free: one `groupBy` query, early return when nothing matches.

## Step 3 — Fix the Resend error-detection bug

Replace the bare send with:

```ts
const { error } = await resend.emails.send({ ... });
if (error) throw new Error(`Resend: ${error.message}`);
```

so the existing per-user `catch` + `failed++` actually fires on API-level errors
(invalid recipient, rate limit, etc.). Keep the per-user try/catch — one bad
address must never abort the whole batch.

**Rate limiting:** Resend's default limit is 2 requests/second. Keep the sends
sequential (already are) and add `await new Promise(r => setTimeout(r, 600))`
between sends. At current scale this is fine; if the user base grows past a few
hundred, switch to `resend.batch.send` (100 emails/call) — leave a one-line
comment noting that upgrade path, nothing more.

**From-address:** the job uses `env.EMAIL_FROM ?? "noreply@resend.dev"` while
`auth.service.ts` uses a different fallback — check what auth uses and align the
digest to the same fallback string.

## Step 4 — Email content additions

All in the HTML builder. **File-length rule:** the job file is already ~235
lines; adding skill section + CTA will push it past 300. Split first:

- `src/jobs/weekly-digest.job.ts` — orchestration only (query, loop, send, stamp).
- `src/jobs/weekly-digest.email.ts` — `buildDigestHtml()`, `esc()`,
  `formatWeekLabel()`, and the `DigestData` interface.

Additions:

1. **Skill progress section** (the spec'd missing content):
   - Current scores from `UserMetrics`: `grammarSkill`, `vocabularySkill`,
     `fluencySkill` (Float 0–100; render with `Math.round`). Add them to the
     existing user query `metrics.select`.
   - **Weekly delta:** the week's `Progress` rows are already fetched — add
     `skillSnapshot` to the progress select. If ≥2 rows in the window have a
     non-null snapshot, show `(+N this week)` per skill comparing earliest vs
     latest snapshot. `skillSnapshot` is `Json?` shaped
     `{ grammar, vocabulary, fluency }` (written in `sessions.service.ts:409-412`)
     — validate the shape defensively (`typeof x?.grammar === "number"`) since
     it's untyped JSON; if malformed, just omit the delta. Hide the whole delta
     when fewer than 2 snapshots exist (don't show "+0").
   - If all three current scores are 0 (brand-new user), omit the section
     entirely rather than showing a row of zeros.
2. **CTA button:** a prominent "Continue learning →" button linking to the app.
   Add an optional `FRONTEND_URL` to the env schema
   (`z.string().url().optional()` in `config/env.ts`), defaulting the link to
   `env.CORS_ORIGIN` when unset (it's a single origin, default
   `http://localhost:3000`). Document `FRONTEND_URL` in `.env.example`.
3. **Footer opt-out note:** extend the existing footer line:
   *"You can turn this digest off anytime in Settings → Profile."* Do **not**
   build a tokenized one-click unsubscribe endpoint in this task — the settings
   toggle is the spec'd mechanism. (A signed unsubscribe link is a sensible
   follow-up before real users; note it in TASK.md as a future item.)
4. Truncate goal descriptions to ~80 chars with `…` before escaping length-wise
   (long descriptions break the layout).

## Step 5 — API: expose `emailDigestEnabled` on the learner profile

Mirror exactly how `timezone` flows through the users module:

| File | Change |
|---|---|
| `users.schema.ts:50` area | add `emailDigestEnabled: z.boolean().optional()` to `updateLearnerProfileSchema` |
| `users.service.ts` lines ~74, ~160, ~360 | add `emailDigestEnabled: true` to each learnerProfile `select` (grep `timezone: true` to find all three sites) |
| `users.types.ts` lines ~28, ~130 | add `emailDigestEnabled: boolean` to both learnerProfile shapes |
| `users.router.ts` ~329 and ~559 | add the property to both Swagger JSDoc blocks (`type: boolean`) |

The update path needs no service-logic change — the PATCH handler spreads the
validated input into `prisma.learnerProfile.update` (verify this is the existing
pattern; if fields are whitelisted explicitly, add it there).

Then run `bun run generate:types` and commit the regenerated
`frontend/types/api.ts` **in the same commit** (the pre-commit hook enforces
this — do not hand-edit that file).

Do **not** expose `digestLastSentAt` via any API — it's internal job state.

## Step 6 — Manual dev trigger

New `backend/scripts/run-digest.ts`:

- Imports `runWeeklyDigestJob` and runs it once, then `process.exit(0)`.
- Accepts `--force`: pass an options arg into `runWeeklyDigestJob({ force: true })`
  that (a) skips the local-Sunday-08:00 hour matching (all timezones match) and
  (b) skips the `digestLastSentAt` 6-day guard. The function signature becomes
  `runWeeklyDigestJob(opts: { force?: boolean } = {})` — the cron caller in
  `jobs/index.ts` needs a thin arrow wrapper since `safeRun` passes no args.
- Add package.json script: `"job:digest": "infisical run -- bun scripts/run-digest.ts"`
  (match the infisical-wrapping pattern of the other scripts).

This is how you'll smoke-test the email rendering against the seeded users.

## Step 7 — Seed update

In `prisma/seed.ts` (learner profiles at ~line 154): leave `student_ali`
(Asia/Baghdad) with the default `emailDigestEnabled: true`, and set
`emailDigestEnabled: false` explicitly on `student_yuki` (Asia/Tokyo) — this
gives the dev DB one opted-out user so `bun run job:digest --force` visibly
exercises the filter. Update the seed-data section of `backend/CLAUDE.md` if it
mentions profile fields.

## Step 8 — Tests

No `src/jobs/__tests__/` exists yet — this task creates the first one. Two layers:

1. **Pure unit tests** (DB-independent) — `src/jobs/__tests__/weekly-digest.test.ts`:
   - Export the local-time helper (e.g. `isLocalSundayDigestHour(timezone: string, now: Date): boolean`)
     from the job file and test it: a UTC instant that is Sunday 08:xx in
     `Asia/Baghdad`, the same instant NOT matching in `Asia/Tokyo`, an invalid
     timezone string falling back to UTC behavior (no throw), a half-hour offset
     zone like `Asia/Kathmandu`.
   - Test `buildDigestHtml`: output contains escaped goal description when given
     `<script>` in the description; zero-activity variant renders the nudge;
     skill section omitted when all scores are 0; delta omitted with <2 snapshots.
2. **Router integration tests** — extend the existing
   `src/modules/users/__tests__/users.router.test.ts`:
   - `PATCH /users/me/learner-profile` with `{ emailDigestEnabled: false }` →
     200 and the response reflects `false`.
   - `GET /users/me` → learnerProfile includes `emailDigestEnabled`.
   - 422 on `{ emailDigestEnabled: "yes" }` (non-boolean).

Do not attempt to integration-test the actual send: `resend` is null without an
API key and the job early-returns — that early-return path is the test-env
behavior by design.

## Step 9 — Docs & task-board updates (don't skip)

1. `backend/TASK.md` — mark Task 7 ✅ DONE with the checklist of what was built
   (match the style of Tasks 1–3/9). Note the "tokenized unsubscribe link"
   follow-up under it or in the Blocked/Deferred section.
2. `backend/CLAUDE.md` — update the cron list in Phase 9 (the digest is now
   hourly-tick/local-Sunday-08:00, opt-out via `emailDigestEnabled`) and the
   email line (`welcome, password reset, weekly digest ✅`). Update seed section.
3. `frontend/TASKS.md` — add a task for Rekar: settings page needs an
   "Email me a weekly progress digest" toggle wired to
   `PATCH /users/me/learner-profile { emailDigestEnabled }` (field now in
   `types/api.ts`).

## Verification checklist (run all before committing)

```bash
cd backend
bun run typecheck            # must pass
bun test                     # 239 existing + new tests, all green
bun run job:digest -- --force   # against seeded DB: expect 1 sent (ali), yuki skipped (opted out)
```

- Confirm the forced run logs `sent=1` and that `digestLastSentAt` got stamped
  only for ali (check via `bun run db:studio` or a quick query).
- Run `--force` twice WITHOUT the guard-skip... (i.e., run once forced, then run
  the script without `--force`): expect 0 sent — proves the 6-day guard.
- If you have a real `RESEND_API_KEY` in dev Infisical, check the email renders
  in an actual inbox (Gmail strips some CSS — the existing inline-style approach
  is correct, keep all styles inline).
- Commit message should note the Resend `{ data, error }` bug fix explicitly.

## Pitfalls recap (each of these has bitten this codebase or will)

- `timezone` is a free-text column — ALWAYS guard `Intl` calls (RangeError on
  invalid IANA names). Pattern exists at `sessions.service.ts:400-402`.
- Resend SDK returns errors, doesn't throw — check `{ error }`.
- Never hand-edit `frontend/types/api.ts`; the pre-commit hook regenerates and
  blocks stale copies.
- Per-user try/catch in the send loop — one bad email must not kill the batch.
- Stamp `digestLastSentAt` only on success, inside the loop.
- Keep the job file under ~300 lines — split the HTML builder out (Step 4).
- `skillSnapshot` is untyped JSON — validate shape before reading numbers.
- The hourly tick must log quietly (debug) when no timezone matches.
