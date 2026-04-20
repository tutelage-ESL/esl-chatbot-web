# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

Monorepo for an AI-powered ESL learning platform. Two independent workspaces, each with its own `package.json`, `bun.lock`, and `node_modules`:

- **[backend/](backend/)** — Bun + Express 5 + TypeScript + Prisma/PostgreSQL API. See [backend/CLAUDE.md](backend/CLAUDE.md) for the full backend guide (domain model, tier limits, module pattern).
- **[frontend/](frontend/)** — Nuxt 4 + Vue 3 + Tailwind 4 + shadcn-nuxt. See [frontend/CLAUDE.md](frontend/CLAUDE.md) for the frontend guide (folder rules, HTTP layer, auth flow).

The root `package.json` is **not** a workspace manager — it only holds shared Prisma/Tailwind dev tooling. Always `cd` into `backend/` or `frontend/` before running commands.

## Cross-Workspace: Type Sharing

The backend is the source of truth for API types. Flow:

```
Swagger JSDoc on backend routers
  → swagger-jsdoc → backend/openapi.json  (gitignored)
  → openapi-typescript → frontend/types/api.ts  (committed)
```

After **any** backend route or schema change, run `bun run generate:types` from `backend/` and commit the updated [frontend/types/api.ts](frontend/types/api.ts) in the same change. **Never edit `frontend/types/api.ts` by hand** — it is overwritten on every regeneration. Type quality depends entirely on the accuracy of Swagger JSDoc on the routers.

## Secrets

Backend secrets are managed via **Infisical** (project `esl-chatbot`, envs `dev` and `prod`). See [backend/SECRETS.md](backend/SECRETS.md). Frontend reads `NUXT_PUBLIC_GOOGLE_CLIENT_ID` from its own `.env`.

## Ports

- Backend dev: **8000**
- Frontend dev: **3001** (not 3000 — configured in [frontend/nuxt.config.ts](frontend/nuxt.config.ts))
