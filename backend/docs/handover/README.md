# Handover Docs

Documentation for taking this project to production and handing it to the business.

| Doc | Audience | Purpose |
|---|---|---|
| [developer-guide.md](developer-guide.md) | Developer | Architecture, onboarding, local dev, testing, CI, the map to everything else |
| [deployment-runbook.md](deployment-runbook.md) | Developer / ops | Going live: hosting, the migration-baseline procedure, FIB, smoke tests, rollback |
| [secret-rotation.md](secret-rotation.md) | Developer / owner | Moving every service to the owner's account and rotating all secrets |

**Still owed by the business owner** (content tasks — task 10 in [`../../TASK.md`](../../TASK.md)):

- **Business-owner doc** — monthly cost breakdown (AI/hosting/storage/email), how
  subscriptions work, how to use the admin panel, support contacts.
- **Investor doc** — product overview, market, tech-stack summary, growth levers, tiers.
- **Terms of Service** — the real legal text for `src/modules/auth/agreement.content.ts`.

These need the owner's numbers and copy, so they're authored once that input arrives;
the developer-facing material above is complete.
