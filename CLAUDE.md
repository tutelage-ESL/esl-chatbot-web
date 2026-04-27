# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

Monorepo for an AI-powered ESL learning platform. Two independent workspaces, each with its own `package.json`, `bun.lock`, and `node_modules`:

- **[backend/](backend/)** — Bun + Express 5 + TypeScript + Prisma/PostgreSQL API. See [backend/CLAUDE.md](backend/CLAUDE.md) for the full backend guide (domain model, tier limits, module pattern).
- **[frontend/](frontend/)** — Nuxt 4 + Vue 3 + Tailwind 4 + shadcn-nuxt. See [frontend/CLAUDE.md](frontend/CLAUDE.md) for the frontend guide (folder rules, HTTP layer, auth flow).

The root `package.json` is **not** a workspace manager — it only holds shared Prisma/Tailwind dev tooling so Prisma VS Code extensions work from the repo root. Always `cd` into `backend/` or `frontend/` before running commands. There is no root-level script that builds or tests both workspaces together.

## Bootstrap & Common Commands

Both workspaces use **Bun**, not npm/pnpm/yarn. Install dependencies separately per workspace:

```bash
cd backend && bun install
cd frontend && bun install
```

Day-to-day dev — run in two terminals:

```bash
# Terminal 1 — API (requires Infisical CLI; see backend/SECRETS.md for setup)
cd backend && bun dev           # uses infisical run; wraps real secrets around bun
cd backend && bun run dev:env   # fallback when Infisical isn't set up, needs a local .env

# Terminal 2 — Nuxt
cd frontend && bun run dev      # port 3001
```

Full backend command list (including Prisma, tests, type-gen) lives in [backend/CLAUDE.md](backend/CLAUDE.md). Frontend has no lint or test runner configured — commands are in [frontend/CLAUDE.md](frontend/CLAUDE.md).

## Cross-Workspace: Type Sharing

The backend is the source of truth for API types. Flow:

```
Swagger JSDoc on backend routers
  → swagger-jsdoc → backend/openapi.json  (gitignored)
  → openapi-typescript → frontend/types/api.ts  (committed)
```

After **any** backend route or schema change, run `bun run generate:types` from `backend/` and commit the updated [frontend/types/api.ts](frontend/types/api.ts) in the same change. **Never edit `frontend/types/api.ts` by hand** — it is overwritten on every regeneration. Type quality depends entirely on the accuracy of Swagger JSDoc on the routers.

## Secrets & Config

Backend secrets are managed via **Infisical** (project `esl-chatbot`, envs `dev` and `prod`). See [backend/SECRETS.md](backend/SECRETS.md). Frontend reads `NUXT_PUBLIC_BASE_URL` and `NUXT_PUBLIC_GOOGLE_CLIENT_ID` from its own `.env`.

**Google OAuth gotcha (common trap):** three places must hold the *same* Client ID — `frontend/.env` (`NUXT_PUBLIC_GOOGLE_CLIENT_ID`), Infisical's dev env (`GOOGLE_CLIENT_ID`), and the OAuth client whose Authorized JavaScript origins include `http://localhost:3001` and `http://localhost:8000`. If `/auth/google` returns *"Google token was not issued for this application"*, the frontend and backend are pointed at different clients. Restart both servers after changing either.

## Ports

- Backend dev: **8000**
- Frontend dev: **3001** (not 3000 — configured in [frontend/nuxt.config.ts](frontend/nuxt.config.ts))

## File Length Rule

**Keep files short. Extract into components aggressively.**

- Vue SFC templates over ~150 lines → split into sub-components. A 500-line template is always wrong.
- If a section of a page has its own visual identity or could be reused, it is a component.
- Page files (`pages/`) should contain only layout glue and state — no large inline template blocks.
- Composables handle all API calls and business logic. Pages/components only call them.
- Backend: service files over ~300 lines → split by concern. Router files should stay thin (route definitions only, no logic).
- The only acceptable reason for a long file is a generated file (e.g. `types/api.ts`) or a file that genuinely cannot be split (e.g. a large Zod schema or a migration).
