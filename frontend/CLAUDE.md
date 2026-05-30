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
- **Google Sign-In:** Google Identity Services JS SDK loaded directly (no wrapper library)
- **Images:** `@nuxt/image`
- **Marquee:** `nuxt-marquee`

## Commands

```bash
bun install
bun run dev        # Dev server on port 3001 — requires Infisical CLI (infisical login + infisical init)
bun run dev:env    # Fallback when Infisical isn't set up; needs a local .env file
bun run build      # Production build (via Infisical)
bun run build:env  # Production build without Infisical (needs .env)
bun run preview    # Serve the built output locally (no secrets needed)
bun run generate   # Static generation (via Infisical)
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
│  ├─ model/        # one file per backend DB table — plain type mirroring the Prisma schema
│  │                #   user.ts · class.ts (Class, ClassUser, Announcement) · ...
│  ├─ types/        # API response shapes, UI types, composable types — one file per domain
│  │                #   class-types.ts · dashboard-types.ts · button-types.ts · ...
│  └─ schemas/      # Zod validation schemas
│
├─ components/      # Subfolders are PascalCase, EXCEPT package folders (e.g. `ui` for shadcn — never rename)
│  ├─ App/          # main UI primitives: Button, Iconsax, Link, Text, Image, ...
│  ├─ Block/        # self-contained feature blocks reused across multiple pages (e.g. UserAvatar.vue)
│  ├─ Form/         # form-related components: Form, Input, Label, Error, ServerError, VerificationInput, CopyButton, CountryCode, GoogleButton, AllDone, ...
│  ├─ Layouts/      # layout shell components (Navbar, Footer, auth shell, dashboard sidebar/header)
│  │  ├─ Dashboard/ # DashboardSidebar.vue, DashboardHeader.vue — layout chrome only, not page sections
│  │  └─ Navbar/
│  ├─ Pages/        # ALL page-specific components, grouped by page/section
│  │  ├─ Home/      # Hero.vue, Features.vue, Pricing.vue, ...
│  │  └─ Dashboard/ # dashboard page sections, grouped by route
│  │     ├─ Overview/   # GreetingHero, StatCard, VocabChart, NextUp, ActivityHeatmap, DueWords
│  │     ├─ Chat/       # SessionsSidebar, ThreadHeader, MessageThread, MessageBubble, Composer, CoachPane, SessionItem, ThinkingIndicator
│  │     ├─ Voice/      # PromptCard, ScorePanel, PhonemeGrid
│  │     ├─ Vocab/      # Flashcard, DeckList
│  │     ├─ Goals/      # GoalCard, AchievementGrid
│  │     └─ Lessons/    # CategoryFilter, LessonCard
│  ├─ Skeletons/    # loading skeletons, mirroring the page/component they load for
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
- Component folders use **PascalCase** (`App/`, `Block/`, `Form/`, `Pages/`). Package-owned folders (`ui/` for shadcn) stay as the package expects.
- `Block/` is for self-contained feature blocks reused across multiple pages that don't belong in `App/` (primitives) or `Form/`. Example: `<BlockUserAvatar />` from `components/Block/UserAvatar.vue`.
- **All page-specific sections live under `components/Pages/<PageName>/`** — never under `pages/` itself. For dashboard pages this means `components/Pages/Dashboard/<Section>/`.
- **Never create a top-level `components/Dashboard/` folder.** Dashboard sub-components belong under `components/Pages/Dashboard/<Section>/`. Layout chrome (sidebar, topbar) stays in `components/Layouts/Dashboard/`.
- Skeleton components are grouped under `components/Skeletons/` mirroring the page/component they load for.
- `common/model/` holds **one file per backend DB table**, each exporting plain `type` aliases that mirror the Prisma schema exactly (no extra fields). Current files: [user.ts](app/common/model/user.ts), [class.ts](app/common/model/class.ts) (`Class`, `ClassUser`, `Announcement`). When adding a new domain, create a new model file first.
- `common/types/` holds **API response shapes and UI-specific types** — one file per domain. These types may extend or `Pick`/`Omit` from model types, and add fields that only exist on API responses (e.g. `memberCount`, nested `author`). Current files: [class-types.ts](app/common/types/class-types.ts), [dashboard-types.ts](app/common/types/dashboard-types.ts), [button-types.ts](app/common/types/button-types.ts), etc. **Never define domain types inline inside a composable** — put them in the relevant `common/types/` file and import from there. Generated API types live separately in [types/api.ts](types/api.ts).
- Composables are named `useXxx()` and may export multiple related functions from one file.
- **Auto-import prefix rule:** Nuxt prefixes components with their full folder path in PascalCase. Examples:
  - `components/App/Button.vue` → `<AppButton />`
  - `components/Pages/Home/Hero.vue` → `<PagesHomeHero />`
  - `components/Pages/Dashboard/Chat/Composer.vue` → `<PagesDashboardChatComposer />`
  - `components/Layouts/Dashboard/DashboardSidebar.vue` → `<LayoutsDashboardDashboardSidebar />`
- Always derive the correct tag name from the file path — never guess.
- Styling: use Tailwind utilities. Put reusable/global styles in [app/assets/css/main.css](app/assets/css/main.css) as utility classes. Use `<style scoped>` inside a component only for things Tailwind can't express (e.g. `@keyframes`).
- Always use the latest Tailwind CSS utilities — `size-*`, `gap-*`, `opacity-*` etc. all accept arbitrary integers (e.g. `size-18`). Use shorthand opacity syntax: `white/6`, `white/50` instead of `white/[0.06]`.
- On the primary brand color (orange/`brand-primary`), always use **white** text AND white icons. This applies to buttons, badges, hover states, dropdown items, and any element with a `brand-primary` background.
- **Icons on `variant="primary"` buttons must always use `color: 'white'`** in their `:icon-config`. Secondary-variant button icons use `'currentColor'` or a specific hex. Never use a dark/colored icon on a primary button.
- Always check `components/App/`, `components/ui/`, and `components/Form/` before creating a new primitive — use what exists.

### Color system — dashboard UI tokens

The dashboard UI colour system lives in **[app/assets/css/main.css](app/assets/css/main.css)**. All surface, border, text, and status colours are defined there as CSS custom properties and are the **single source of truth**. To change how the dashboard looks in light or dark mode, edit those values once — do not scatter raw hex/zinc/white/black utility classes across components.

**Token reference:**

| Token | Purpose |
|---|---|
| `--surface-page` | Outermost page / layout background |
| `--surface-card` | Card / panel background (`dash-card`, drawers) |
| `--surface-raised` | Slightly elevated surfaces inside a card (table header, code block bg, inner stat tile) |
| `--surface-well` | Deepest inset — icon wells, avatar fallback bg |
| `--border-card` | Card outer border |
| `--border-inner` | Dividers and inner borders inside a card |
| `--text-heading` | Primary headings and bold labels |
| `--text-body` | Normal body text |
| `--text-muted` | Secondary / helper text |
| `--text-subtle` | Tertiary / placeholder / icon tint |
| `--status-active-bg / -text` | Active/success badge background + text |
| `--status-inactive-bg / -text` | Inactive/neutral badge |
| `--status-blocked-bg / -text` | Blocked/warning badge |
| `--status-expired-bg / -text` | Expired/error badge |

Tailwind exposes them as `bg-surface-card`, `border-border-inner`, `text-text-heading`, etc. (because `@theme inline` maps them). You can also use inline `style` attributes for one-off cases: `style="background:var(--surface-raised)"`.

**Rules:**
- **Never use `bg-white`, `bg-zinc-*`, `border-black/*`, `border-zinc-*`, `text-zinc-*`, `text-gray-*` in dashboard components.** Use the tokens above instead.
- Status badges (Active/Inactive/Blocked/Expired) must always use the `--status-*` tokens, not hardcoded emerald/orange/red classes.
- `dash-card` already applies `var(--surface-card)` and `var(--border-card)` — do not override its background inline.
- For icon colors that track text tokens, pass `color="var(--color-text-muted)"` etc. to `<AppIconsax>`.

- **NEVER use raw HTML elements or custom modal/overlay/drawer implementations when a shadcn or custom component exists.** Always prefer the component library. Mandatory substitutions:
  - Text/headings (`p`, `h1`–`h6`, `span` for content) → `<AppText>` with `size`, `weight`, `color`, `font-family` props. Valid sizes: `10 11 12 13 14 15 16 17 18 20 22 24 30 32 36 40 48`. Valid colors: `black neutral-600 neutral-400 brand-primary brand-ink brand-sub white error` etc. (see `common/types/text-types.ts`).
  - Buttons → `<AppButton>` with `variant` (`primary` | `secondary`), `size` (`24 28 32 36 38 48`), `radius` (`4 8 12 16`), `icon`, `text`, `loading`, `disabled`. Icon-only buttons omit `text`. Never use `<button>`. **Primary variant: always pass `color: 'white'` in `:icon-config`.**
  - Links / navigation → `<AppLink to="...">` or `<AppButton :to="...">`. Never use `<a>` or `<RouterLink>` directly.
  - Images → `<AppImage src="..." width height>`. Never use `<img>`.
  - Icons → `<AppIconsax name="..." color="..." :size="N">`. Never use raw SVG inline or other icon libraries unless the icon isn't in the Iconsax set.
  - Text inputs / textareas → `<FormInput id v-model label placeholder icon error ...>`. Never use `<input>` or `<textarea>` directly.
  - Copy-to-clipboard → `useCopyToClipboard(value)` composable (direct call, no destructuring). Never use `navigator.clipboard` directly.
  - Modals / dialogs → `<UiDialog>` + `<UiDialogContent/Header/Title/Description/Footer/Close>`. Never build a custom fixed-overlay div.
  - Side drawers / panels → `<UiSheet side="right">` + `<UiSheetContent/Header/Title>`. Never build a custom fixed side panel.
  - Empty states → `<UiEmpty>` + `<UiEmptyMedia/Content/Title/Description>`. Never write a one-off centered div with an icon and text.
  - Avatars → `<UiAvatar>` + `<UiAvatarImage>` + `<UiAvatarFallback>`. Never use a raw `<div>` as an avatar.
  - Skeletons → `<UiSkeleton>`. Never use a raw `animate-pulse` div.
  - Textareas → `<UiTextarea v-model ...>`. Never use `<textarea>` directly.
  - Selects / dropdowns → `<UiSelect>` + `<UiSelectTrigger>` + `<UiSelectValue>` + `<UiSelectContent>` + `<UiSelectItem>`. **Never pass an empty string as a `UiSelectItem` value** — Reka UI forbids it. Use a sentinel like `'ALL'` and convert back with a computed `get/set`.
  - **Card / row action menus → always use `<UiDropdownMenu>` triggered by a 3-dot `<AppButton aspect="square" icon="More">`.** Never show action buttons on hover (opacity-0 → opacity-100). Actions that are destructive (delete) must be separated with `<UiDropdownMenuSeparator>` and coloured red.
  - Delete confirmations → `<UiAlertDialog>` with Cancel + destructive Action. Never use `window.confirm()`.
- Fetch data only via the `useHttp` composable ([app/composables/useHttp.ts](app/composables/useHttp.ts)) — never call `fetch` directly.
- **Keep Vue files short.** If a template exceeds ~150 lines, extract sections into sub-components. Page files (`pages/`) hold state and layout glue only — no large inline template blocks. A 300+ line SFC template is always wrong.

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
  - [sign-up.vue](app/pages/signup.vue) — full register + auto sign-in on success + Google.
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

- Uses Google Identity Services (GIS) JS SDK directly — no `vue3-google-login` wrapper. The SDK is lazy-loaded by each component that needs it (`<script src="https://accounts.google.com/gsi/client">`). This avoids "initialize called multiple times" warnings and localhost FedCM edge cases.
- Reusable button: [app/components/Form/GoogleButton.vue](app/components/Form/GoogleButton.vue) — `<FormGoogleButton label="Continue with Google" />`. Renders as a custom pill-shaped white button visually, with Google's official `renderButton` output layered underneath at `opacity-0` to actually receive the click. This gives full control over the look while keeping Google's native flow (stable, always works). On sign-in, calls `authStore.googleAuth(idToken)`, redirects to `/dashboard` on success, or to `/google-username` when the backend returns `needsRegistration: true`.
- Client ID is read from `runtimeConfig.public.googleClientId` (set via `NUXT_PUBLIC_GOOGLE_CLIENT_ID`). It must match the `GOOGLE_CLIENT_ID` the backend verifies against, and `http://localhost:3001` must be listed as an Authorized JavaScript origin in Google Cloud Console.
- Dev-only token generator (NOT a production route): [app/pages/google-test.vue](app/pages/google-test.vue) — programmatically renders Google's sign-in button and displays the raw ID token, for pasting into Swagger. Mirrors the backend's `/api/v1/auth/google/test` page.

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

## Dashboard Layout & Structure

The authenticated dashboard uses a **fixed sidebar + scrollable body** pattern:

- **Layout:** [app/layouts/dashboard.vue](app/layouts/dashboard.vue) — `flex h-dvh overflow-hidden`. Manages `collapsed` (desktop collapse) and `mobileOpen` (mobile overlay) state and passes them to the sidebar.
- **Sidebar:** [app/components/Layouts/Dashboard/DashboardSidebar.vue](app/components/Layouts/Dashboard/DashboardSidebar.vue) — on desktop: inline collapsible (`w-58` ↔ `w-17`) via `collapsed` prop + `@toggle` emit. On mobile (`< md`): fixed full-height overlay (`z-50`, `translate-x-full` when closed) driven by `mobileOpen` prop + `@close-mobile` emit. A dark backdrop is rendered behind it. Closes automatically on route change. No Account section — profile/settings are accessed via the user avatar popup.
- **Header:** [app/components/Layouts/Dashboard/DashboardHeader.vue](app/components/Layouts/Dashboard/DashboardHeader.vue) — sticky breadcrumb + search bar + notifications + CTA. On mobile shows a burger icon that emits `open-sidebar`. User avatar is `<BlockUserAvatar />`.
- **User Avatar:** [app/components/Block/UserAvatar.vue](app/components/Block/UserAvatar.vue) — shadcn `DropdownMenu` showing user name, email, plan badge, then Profile / Settings links and a destructive Sign out item. Reads from `useAuthStore().getUser`.

### Dashboard Pages (file-based routing under `pages/dashboard/`)

All pages use `definePageMeta({ layout: 'dashboard', requiresAuth: true })`.

| Route | File | Status |
|---|---|---|
| `/dashboard` | `pages/dashboard/index.vue` | Overview (fully built) |
| `/dashboard/chat` | `pages/dashboard/chat.vue` | Built |
| `/dashboard/voice` | `pages/dashboard/voice.vue` | Stub |
| `/dashboard/vocab` | `pages/dashboard/vocab.vue` | Stub |
| `/dashboard/goals` | `pages/dashboard/goals.vue` | Stub |
| `/dashboard/lessons` | `pages/dashboard/lessons.vue` | Stub |
| `/dashboard/profile` | `pages/dashboard/profile.vue` | Built |
| `/dashboard/settings` | `pages/dashboard/settings.vue` | Built — account info + FIB subscription panel |
| `/dashboard/classes` | `pages/dashboard/classes/index.vue` | Built |
| `/dashboard/classes/create` | `pages/dashboard/classes/create.vue` | Built (tutor/admin) |
| `/dashboard/classes/manage` | `pages/dashboard/classes/manage.vue` | Built (admin) |
| `/dashboard/classes/[id]` | `pages/dashboard/classes/[id].vue` | Built — full class detail page |

### Dashboard Component Folder (`components/Pages/Dashboard/`)

All dashboard page sub-components live here. **Never use `components/Dashboard/`** — that path is banned.

```
components/Pages/Dashboard/
├─ Overview/
│  ├─ StatCard.vue           # Single stat tile (label / value / delta / icon)
│  ├─ GreetingHero.vue       # Welcome banner + goal ring + streak
│  ├─ VocabChart.vue         # SVG sparkline for vocabulary growth
│  ├─ NextUp.vue             # Recommended lesson + upcoming list
│  ├─ ActivityHeatmap.vue    # 12-week heatmap + recent sessions list
│  └─ DueWords.vue           # SRS due words + level progress bar
├─ Chat/
│  ├─ SessionsSidebar.vue    # Left sessions list panel
│  ├─ ThreadHeader.vue       # Chat top bar (topic, cefr, actions)
│  ├─ MessageThread.vue      # Scrollable messages area + empty state
│  ├─ MessageBubble.vue      # Single message bubble (user or AI)
│  ├─ ThinkingIndicator.vue  # Animated "Tutelage AI is thinking…" row
│  ├─ Composer.vue           # Fixed bottom input bar
│  ├─ SessionItem.vue        # Single row in the sessions list
│  └─ CoachPane.vue          # Right live-coaching panel
├─ Classes/
│  ├─ ClassCard.vue          # Card for a single class in the list
│  ├─ ClassDetailDrawer.vue  # Right-side sheet — Members + Announcements tabs
│  ├─ ClassMembersTab.vue    # Members list with remove/leave actions
│  ├─ ClassStudentsTab.vue   # Student progress list + detail sheet
│  ├─ ClassAnalyticsTab.vue  # Class-wide skill averages + grammar errors
│  ├─ AnnouncementsFeed.vue  # Paginated announcement feed + compose box (tutor/admin)
│  ├─ ClassesEmptyState.vue  # Empty state for the classes list
│  ├─ JoinClassModal.vue     # Dialog to join a class by code
│  └─ Admin/
│     ├─ ClassGridCard.vue   # Grid card for admin manage page
│     └─ ClassTableRow.vue   # Table row for admin manage page
├─ Voice/
│  ├─ PromptCard.vue
│  ├─ ScorePanel.vue
│  └─ PhonemeGrid.vue
├─ Vocab/
│  ├─ Flashcard.vue
│  └─ DeckList.vue
├─ Goals/
│  ├─ GoalCard.vue
│  └─ AchievementGrid.vue
└─ Lessons/
   ├─ CategoryFilter.vue
   └─ LessonCard.vue
```

Auto-import prefix: `<PagesDashboard{Section}{Component} />`. Examples:
- `<PagesDashboardOverviewStatCard />`
- `<PagesDashboardChatComposer />`
- `<PagesDashboardVoiceScorePanel />`

### Dashboard Types

Types are split by domain — never define them inline in a composable:

| File | Contents |
|---|---|
| [common/model/user.ts](app/common/model/user.ts) | `User` — mirrors the `users` DB table |
| [common/model/class.ts](app/common/model/class.ts) | `Class`, `ClassUser`, `Announcement` — mirrors the DB tables |
| [common/model/subscription.ts](app/common/model/subscription.ts) | `Subscription`, `FibSubscription` — mirrors the DB tables |
| [common/types/class-types.ts](app/common/types/class-types.ts) | API shapes: `ClassItem`, `ClassDetail`, `ClassMember`, `AdminClassItem`, `ClassStudentSummary`, `ClassStudentDetail`, `ClassAnalytics`, `AnnouncementItem`, `ClassPaginationMeta` |
| [common/types/subscription-types.ts](app/common/types/subscription-types.ts) | `PlanMeta`, `PLAN_META`, `PLAN_PRICES_IQD`, `INTERVAL_LABELS`, `InitiateFibResult`, `FibStatusResult`, `UserSubscriptionDetail` |
| [common/types/dashboard-types.ts](app/common/types/dashboard-types.ts) | Navigation, stat cards, chart points, sessions, vocabulary, goals, lessons |

**Rule:** model files (`common/model/`) = exact DB table shape. Type files (`common/types/`) = API response shapes that may extend/pick from model types. Import from `~/common/model/...` or `~/common/types/...` as appropriate.

## Composables Reference

| Composable | File | Exports |
|---|---|---|
| `useHttp` | [app/composables/useHttp.ts](app/composables/useHttp.ts) | Single `useHttp(options)` function — all API calls must go through this |
| `useClasses` | [app/composables/useClasses.ts](app/composables/useClasses.ts) | `listMyClasses`, `listAllClasses`, `getClass`, `joinClass`, `createClass`, `updateClass`, `refreshCode`, `updateCodeSettings`, `toggleBlock`, `getClassStudents`, `getClassStudentDetail`, `getClassAnalytics`, `removeMember`, `listAnnouncements`, `createAnnouncement` |
| `useSubscription` | [app/composables/useSubscription.ts](app/composables/useSubscription.ts) | `getMySubscription`, `initiateFib`, `getFibStatus`, `cancelFib` |
| `useChatPage` | [app/composables/useChatPage.ts](app/composables/useChatPage.ts) | All state and actions for the chat page — sessions, messages, send, newSession, openSession, endCurrent, refreshCurrent, fillSuggestion |
| `useSessions` | [app/composables/useSessions.ts](app/composables/useSessions.ts) | Raw session API calls used by `useChatPage` |
| `useCopyToClipboard` | auto-imported | `useCopyToClipboard(value)` — direct call, no destructuring |

## Related Docs

- [docs/folder_structure_rules.md](docs/folder_structure_rules.md) — authoritative folder layout
- [../backend/CLAUDE.md](../backend/CLAUDE.md) — backend API contract, auth endpoints, tier limits
- [../CLAUDE.md](../CLAUDE.md) — monorepo overview + type-sharing flow
