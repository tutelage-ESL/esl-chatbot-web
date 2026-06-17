# Deployment Runbook — Production

Step-by-step for taking the backend + frontend live. Prerequisite: account
migration is complete and secrets are rotated
([`secret-rotation.md`](secret-rotation.md)). Tracked as tasks 4 → 5 → 6 in
[`../../TASK.md`](../../TASK.md).

---

## 0. Pre-deploy checklist

From `backend/`:

- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes (auth + sessions at minimum)
- [ ] All Prisma migrations committed (`prisma/migrations/`)
- [ ] All prod secrets present in Infisical `prod` env (rotated, not dev values)
- [ ] `CORS_ORIGIN` = live frontend origin
- [ ] `FRONTEND_URL` = live frontend origin (weekly-digest CTA link)
- [ ] `NODE_ENV=production` (activates rate limiting, the FIB webhook guard, Redis TLS check)

## 1. Hosting

- **Backend**: Render is recommended (native Bun support). One web service + a
  Postgres instance (or keep Neon). Start command runs `bun start`.
- **Frontend**: Vercel or Render static. Set `NUXT_PUBLIC_BASE_URL` to the API URL and
  `NUXT_PUBLIC_GOOGLE_CLIENT_ID` to the (newly re-created) Google OAuth client ID.
- **Domain**: point DNS, enable HTTPS. Add the prod origins to the Google OAuth client's
  **Authorized JavaScript origins** (frontend + API). Remember the "same Client ID in 3
  places" trap (see the monorepo [`../../../CLAUDE.md`](../../../CLAUDE.md)).

## 2. Database migration — baseline first, then deploy

The prod DB was provisioned with `prisma db push` (schema sync), so its tables already
exist but the `_prisma_migrations` ledger does not list them. Running `migrate deploy`
blindly would try to re-create existing tables and fail. **Baseline the
already-present migrations as applied, then deploy only the genuinely-new ones.**

1. Point Prisma at the prod DB (prod `DATABASE_URL`) and check reality:

   ```bash
   bunx prisma migrate status
   ```

2. For **every** migration whose schema is already present in the prod DB, mark it
   resolved (do **not** re-run it):

   ```bash
   bunx prisma migrate resolve --applied <migration_dir_name>
   ```

   Known already-applied catch-up migrations on the historical prod DB include:

   ```
   20260611235357_tasks_archiving_assigned_vocab_internal_flag
   20260612150622_add_email_digest_fields
   ```

   Use `migrate status` as the source of truth for the full list — anything whose
   tables/columns already exist gets `--applied`.

3. The **new** `20260617190000_add_user_agreement` migration creates the
   `user_agreements` table, which does **not** exist on the historical prod DB — leave
   it unresolved so `migrate deploy` creates it. (If you ever `db push` to prod before
   deploying, baseline this one too.)

4. Apply the rest:

   ```bash
   bunx prisma migrate deploy
   ```

5. Create the **prod stealth monitoring account** via direct SQL (never via seed) with a
   non-guessable username/email/password and `isInternal = true`. See task 9 in
   [`../../TASK.md`](../../TASK.md).

> Going forward, manage prod schema changes exclusively with `migrate deploy` on
> committed migration files — no more `db push` against prod.

## 3. Terms of Service note

After deploy, existing users have **no** `user_agreements` row for the current version,
so their next login returns 403 `needsAgreement` and they re-accept via
`POST /auth/accept-agreement` — this is intended (everyone accepts the live Terms once).
Before launch, drop the business owner's real Terms text into
`src/modules/auth/agreement.content.ts` and bump `CURRENT_AGREEMENT.version`.

## 4. FIB production (Task 6)

Code is complete (webhook, fail-fast guard, reconcile job). Once a public HTTPS URL exists:

- Fill the business fields in [`../payment/fib-preproduction-checklist.md`](../payment/fib-preproduction-checklist.md)
  (business name, IBAN, contacts, 500×500 logo).
- Set `FIB_ENV=prod`, real `FIB_CLIENT_ID`/`FIB_CLIENT_SECRET`, and `FIB_WEBHOOK_URL`
  (public HTTPS) in Infisical `prod`. The env guard **fails startup** in production if
  `FIB_CLIENT_ID` is set without `FIB_WEBHOOK_URL` (see `src/config/env.ts`) — this is
  deliberate (otherwise activations fall back to an unreachable localhost webhook).
- Submit the checklist to FIB → they issue live credentials. Smoke-test one real
  low-value subscription end to end. Note the 1% per-transaction commission.

## 5. Smoke test (post-deploy)

- [ ] `GET /health` returns OK
- [ ] `GET /api-docs` loads
- [ ] Register → receive verification email → verify → login works (and Terms accept)
- [ ] Google sign-in works (origins + client ID correct)
- [ ] Start a session → send a message → AI replies and is scored
- [ ] Weekly-digest CTA points at the live frontend (`FRONTEND_URL`)
- [ ] Rate limiting active (429 after burst on an auth endpoint)

## 6. Rollback

- App: redeploy the previous image/commit (hosts keep prior deploys).
- DB: migrations are additive; if one fails mid-deploy, fix forward with a new
  migration rather than down-migrating a live DB. Take a Neon branch/snapshot before
  `migrate deploy` so you have a restore point.
