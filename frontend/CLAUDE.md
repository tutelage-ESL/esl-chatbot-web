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
- **OTP input:** custom `FormVerificationInput` (6-digit, paste-friendly)
- **Google Sign-In:** `vue3-google-login`
- **Images:** `@nuxt/image`
- **Marquee:** `nuxt-marquee`

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
│  └─ schemas/      # Zod validation schemas
│
├─ components/      # Subfolders are PascalCase, EXCEPT package folders (e.g. `ui` for shadcn — never rename)
│  ├─ App/          # main UI primitives: Button, Iconsax, Link, Text, Image, ...
│  ├─ Form/         # form-related components: Form, Input, Label, Error, ServerError, VerificationInput, CopyButton, CountryCode, GoogleButton, AllDone, ...
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

Pinia stores live at the **workspace root** in `stores/` (imported as `~~/stores/...`), NOT under `app/stores/`. See [useHttp.ts](app/composables/useHttp.ts) importing from `~~/stores/auth`.

**Key rules:**
- Component folders use **PascalCase** (`App/`, `Form/`, `Pages/`). Package-owned folders (`ui/` for shadcn) stay as the package expects.
- Page-specific sections live under `components/Pages/<PageName>/` — not under `pages/` itself.
- Skeleton components are grouped under `components/Skeletons/` mirroring the page/component they load for.
- `common/model/` holds types that correspond 1:1 to backend DB tables. Generated API types live separately in [types/api.ts](types/api.ts).
- Composables are named `useXxx()` and may export multiple related functions from one file.
- Components auto-import with folder-path PascalCase prefix — `app/components/App/Button.vue` is used as `<AppButton />`, `app/components/Pages/Home/Hero.vue` as `<PagesHomeHero />`.
- Styling: use Tailwind utilities. Put reusable/global styles in [app/assets/css/main.css](app/assets/css/main.css) as utility classes. Use `<style scoped>` inside a component only for things Tailwind can't express (e.g. `@keyframes`).
- Fetch data via the `useHttp` composable ([app/composables/useHttp.ts](app/composables/useHttp.ts)) — never call `fetch` directly from components or pages.
- always check teh components/APP and components/ui and components/Form base on the need and the request to use teh actual available resouces and components

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

- **Store:** Pinia store at [stores/auth.ts](../stores/auth.ts). Exposes state (`user`, `accessToken`, `refreshToken`, `isAuthenticated`, `isLoading`, `isCheckedUser`, `isTokenRefreshed`), getters (`getAccessToken`, `getRefreshToken`, `getUser`, `getIsAuthenticated`, `getIsLoading`), and actions (`signIn`, `signUp`, `googleAuth`, `forgotPassword`, `resetPassword`, `fetchUser`, `refreshTokens`, `signOut`).
- **Tokens:** access token in memory + `localStorage` + cookie; refresh handled silently by `useHttp` via `refreshTokens()`.
- **Route guarding:** [app/middleware/middleware.global.ts](app/middleware/middleware.global.ts) calls `fetchUser()` once per session and reads `to.meta.requiresAuth` / `to.meta.guestOnly`. Unauthenticated users on protected routes → `/signin`. Authenticated users on guest-only routes → `/dashboard`.
- **Landing:** `/` is the public marketing page. `/dashboard` is the authenticated home.

### Auth pages + layout

- Layout: [app/layouts/auth.vue](app/layouts/auth.vue) — split-screen shell (form left, branded ink panel right, hidden below `lg`) with a floating back button (`router.back()` with `/` fallback).
- Shared form shell: [app/components/Layouts/AuthFormLayout.vue](app/components/Layouts/AuthFormLayout.vue) — `title`/`subtitle` props, default slot for fields, `#alt` slot rendered under an "OR" divider (used for the Google button), optional `footer-text` + `footer-link-text` + `footer-link-to` link.
- All auth pages use `definePageMeta({ layout: 'auth', guestOnly: true })`:
  - [signin.vue](app/pages/signin.vue) — username + password + forgot-password link + Google.
  - [sign-up.vue](app/pages/sign-up.vue) — full register + auto sign-in on success + Google.
  - [forgot-password.vue](app/pages/forgot-password.vue) — emails a 6-digit OTP; always succeeds (backend never reveals enumeration).
  - [verify-otp.vue](app/pages/verify-otp.vue) — collects the OTP; backend has no separate verify endpoint, so this is a UX step that passes the OTP to the next page.
  - [reset-password.vue](app/pages/reset-password.vue) — submits `{ email, otp, newPassword }` to `/auth/reset-password`; on success swaps in `<FormAllDone>` inline and auto-redirects to `/signin` after 3s. **No `/all-done` route** — the all-done state is rendered in place.
  - [google-username.vue](app/pages/google-username.vue) — handles `needsRegistration: true` from `/auth/google`. Entry requires `sessionStorage.googleIdToken` (set by `<FormGoogleButton>`).
- Cross-page state (email + OTP between forgot → verify → reset, idToken + profile for Google sign-up) is carried via `sessionStorage` (keys: `resetEmail`, `resetOtp`, `googleIdToken`, `googleProfile`) and cleared on success.

### Validation + error surfaces

- Schemas in [app/common/schemas/AuthSchema.ts](app/common/schemas/AuthSchema.ts): `signInSchema`, `signUpSchema`, `forgotPasswordSchema`, `verifyOtpSchema`, `resetPasswordSchema`, `setPasswordSchema`, `googleUsernameSchema`. Each exports its inferred type.
- Forms use `<Form :schema :form-data @submit>` from [app/components/Form/Form.vue](app/components/Form/Form.vue); it runs the zod schema on submit and exposes field errors via the default slot (`<template #default="{ errors }">`).
- **Inline field errors:** pass `:error="errors.fieldName"` to `<FormInput>` (it renders via `<FormError>` internally) or `<FormVerificationInput>`.
- **Server-error banners:** keep a local `serverError` ref, set it from the `useHttp`/store response, and render `<FormServerError :error="serverError" />` inside the form.
- **Toasts (`vue-sonner`):** success/info only. Never use toasts for validation — those go inline.

### Google Sign-In

- Package: `vue3-google-login`, registered in [app/plugins/google-login.ts](app/plugins/google-login.ts). Plugin skips registration if `runtimeConfig.public.googleClientId` is empty so local dev without a client ID doesn't crash.
- Reusable button: [app/components/Form/GoogleButton.vue](app/components/Form/GoogleButton.vue) — `<FormGoogleButton label="Continue with Google" />`. Handles the whole flow: triggers Google, calls `authStore.googleAuth(idToken)`, redirects to `/dashboard` on success, or to `/google-username` when the backend returns `needsRegistration: true`.
- Backend dev test page (NOT a frontend route): `http://localhost:8000/api/v1/auth/google/test` — serves a Google Sign-In button for copy-pasting an ID token into Swagger.

## Runtime Config

Defined in [nuxt.config.ts](nuxt.config.ts):
- `BASE_URL` — server-side base URL (from `NUXT_BASE_URL`).
- `public.googleClientId` — Google OAuth client ID (from `NUXT_PUBLIC_GOOGLE_CLIENT_ID`), consumed via `useRuntimeConfig().public.googleClientId`.

Add new public values under `runtimeConfig.public` and consume via `useRuntimeConfig().public.*`.

## Conventions

- **Imports:** `~/` → `app/`, `~~/` → workspace root. Prefer `~/` for anything inside `app/`.
- **Styling:** use `cn()` from [app/lib/utils.ts](app/lib/utils.ts) + `tailwind-merge` to merge classes. Use CVA (`class-variance-authority`) for variant-based components — see [app/common/types/button-types.ts](app/common/types/button-types.ts) for the pattern.
- **Icons:** prefer the `App/Iconsax.vue` wrapper; use `@iconify/vue` directly only when an icon isn't in the Iconsax set.
- **Toasts:** `vue-sonner` — `useHttp` already integrates it via `showToast: true`.
- **Naming:** components PascalCase, composables `useXxx`, types and Zod schemas go in `common/types/` and `common/schemas/` respectively (not co-located with components).

## Related Docs

- [docs/folder_structure_rules.md](docs/folder_structure_rules.md) — authoritative folder layout
- [../backend/CLAUDE.md](../backend/CLAUDE.md) — backend API contract, auth endpoints, tier limits
- [../CLAUDE.md](../CLAUDE.md) — monorepo overview + type-sharing flow
