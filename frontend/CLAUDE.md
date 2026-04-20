# CLAUDE.md — ESL Chatbot Frontend

This file provides guidance to Claude Code (claude.ai/code) when working in the `frontend/` workspace.

## Tech Stack

- **Framework:** Nuxt 4 (Vue 3 Composition API, `app/` directory layout)
- **Language:** TypeScript 6 (strict)
- **Styling:** Tailwind CSS 4 (via `@tailwindcss/vite`) + `tw-animate-css`
- **UI kit:** [shadcn-nuxt](https://www.shadcn-vue.com/) on top of [reka-ui](https://reka-ui.com/) — configured with **two prefixes** in [nuxt.config.ts](nuxt.config.ts):
  - `Ui*` → `components/ui/` (shadcn base components)
  - `Ai*` → `components/ai/` (reserved for AI-specific components)
- **State:** Pinia (`@pinia/nuxt`)
- **Utilities:** `@vueuse/core`, `tailwind-merge`, `class-variance-authority`, `clsx`
- **Icons:** `vue-iconsax`, `@iconify/vue`, `lucide-vue-next`
- **Notifications:** `vue-sonner`
- **OTP input:** `vue-input-otp`
- **Images:** `@nuxt/image`

## Commands

```bash
bun install
bun run dev        # Dev server on port 3001 (NOT 3000)
bun run build
bun run preview
bun run generate   # Static generation
```

There is no lint step or test runner configured in this workspace.

## Folder Structure Rules (authoritative)

The folder structure for `app/` is codified in [docs/folder_structure_rules.md](docs/folder_structure_rules.md). Follow it strictly — summary below:

```
app/
├─ assets/
│  ├─ css/          # main.css, fonts.css
│  └─ fonts/
├─ app.vue
├─ plugins/
│
├─ common/
│  ├─ data/         # static data (country-code.ts, nav-links.ts, profile-links.ts, ...)
│  ├─ model/        # types mirroring backend tables (e.g. user.ts)
│  ├─ types/        # other TS types (button-types.ts, iconsax-types.ts, ...)
│  └─ schema/       # Zod validation schemas
│
├─ components/      # Subfolders are PascalCase, EXCEPT package folders (e.g. `ui` for shadcn — never rename)
│  ├─ App/          # main UI primitives: Button, Iconsax, Link, Text, Image, ...
│  ├─ Form/         # form-related components: Input, Error, VerificationInput, ...
│  ├─ Layouts/      # layout components
│  ├─ Pages/        # page-specific components grouped per page
│  │  └─ Home/
│  │     ├─ Hero.vue
│  │     └─ About.vue
│  ├─ Skeletons/    # loading skeletons, grouped per page/component
│  └─ ui/           # shadcn — DO NOT rename, DO NOT capitalize
│
├─ composables/     # useXxx() — multiple related exports per file OK
├─ layouts/         # Nuxt layouts
├─ lib/             # utilities (e.g. utils.ts with cn())
├─ middleware/      # Nuxt route middleware
└─ pages/           # Nuxt pages (file-based routing)
```

**Key rules:**
- Component folders use **PascalCase** (`App/`, `Form/`, `Pages/`). Package-owned folders (`ui/` for shadcn) stay as the package expects.
- Page-specific sections live under `components/Pages/<PageName>/` — not under `pages/` itself.
- Skeleton components are grouped under `components/Skeletons/` mirroring the page/component they load for.
- `common/model/` holds types that correspond 1:1 to backend DB tables. Generated API types live separately in [types/api.ts](types/api.ts).
- Composables are named `useXxx()` and may export multiple related functions from one file.
- the components use Auto imports By Nuxt, for examplewe have app/components/App/Button.vue, we use it as  <AppButton></AppButton>
- for the designes use tailwind css, if a design is global amke it utility and put it in the main.css, if a style is dont by using css like key rames use <style scoped></style> inside the component itself!

## API Types (do not edit)

[types/api.ts](types/api.ts) is **auto-generated** from the backend's Swagger spec via `openapi-typescript`. Never edit it manually — it is overwritten whenever the backend runs `bun run generate:types`. If a type is missing or wrong, fix the Swagger JSDoc on the relevant backend router, not this file.

Consume generated types with [openapi-fetch](https://openapi-ts.dev/openapi-fetch/):
```ts
import createClient from "openapi-fetch";
import type { paths } from "~/types/api";

const api = createClient<paths>({ baseUrl: "http://localhost:8000/api/v1" });
```

## HTTP Layer: `useHttp`

All API calls MUST go through [app/composables/useHttp.ts](app/composables/useHttp.ts). Do not call `fetch` directly from components or pages.

Responsibilities handled centrally:
- Base URL resolution and URL normalization
- JSON headers + `Accept-Language`
- Bearer token injection when `requireAuth: true` (reads from `useAuthStore().getAccessToken`, then `localStorage`, then cookie)
- **Automatic 401 → refresh-token retry** via `useAuthStore().refreshTokens()`, then silent retry of the original request
- Sign-out + toast when refresh fails
- Optional toast on success/failure (`showToast`)
- Uniform return shape: `{ success, message, data, status }`

Usage:
```ts
const { success, data, message } = await useHttp<User>({
  method: "GET",
  url: "/auth/me",
  baseUrl: "http://localhost:8000/api/v1",
  requireAuth: true,
  showToast: false,
});
```

## Auth Flow

- **Store:** Pinia store at `~~/stores/auth` (referenced by `useHttp`). It must expose `getAccessToken`, `refreshTokens()`, `signOut()`, and `isTokenRefreshed`. *(Currently not yet created — add under `stores/auth.ts` at the workspace root when building auth.)*
- **Tokens:** access token in memory + `localStorage` + cookie; refresh handled silently by `useHttp`.
- **Route guarding:** handled in [app/middleware/middleware.global.ts](app/middleware/middleware.global.ts) by reading `to.meta.requiresAuth` / `to.meta.guestOnly` and redirecting accordingly. The scaffolding is in place but commented — uncomment and wire it up as auth ships.
- **Google Sign-In:** client ID comes from `NUXT_PUBLIC_GOOGLE_CLIENT_ID` (exposed via `runtimeConfig.public.googleClientId`). Dev test page at [app/pages/google-test.vue](app/pages/google-test.vue).

## Runtime Config

Defined in [nuxt.config.ts](nuxt.config.ts):
- `BASE_URL` — server-side base URL
- `public.googleClientId` — from `NUXT_PUBLIC_GOOGLE_CLIENT_ID`

Add new public values under `runtimeConfig.public` and consume via `useRuntimeConfig().public.*`.

## Conventions

- **Imports:** `~/` → `app/`, `~~/` → workspace root. Prefer `~/` for anything inside `app/`.
- **Styling:** use `cn()` from [app/lib/utils.ts](app/lib/utils.ts) + `tailwind-merge` to merge classes. Use CVA (`class-variance-authority`) for variant-based components — see [app/common/types/button-types.ts](app/common/types/button-types.ts) for the pattern.
- **Icons:** prefer the `App/Iconsax.vue` wrapper; use `@iconify/vue` directly only when an icon isn't in the Iconsax set.
- **Toasts:** `vue-sonner` — `useHttp` already integrates it via `showToast: true`.
- **Naming:** components PascalCase, composables `useXxx`, types and Zod schemas go in `common/types/` and `common/schema/` respectively (not co-located with components).

## Related Docs

- [docs/folder_structure_rules.md](docs/folder_structure_rules.md) — authoritative folder layout
- [../backend/CLAUDE.md](../backend/CLAUDE.md) — backend API contract, auth endpoints, tier limits
- [../CLAUDE.md](../CLAUDE.md) — monorepo overview + type-sharing flow
