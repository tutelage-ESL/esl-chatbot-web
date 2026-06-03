# Frontend Tasks

This file is the source of truth for pending frontend work.
Backend is maintained by **Aland**. Frontend is maintained by **Rekar**.

When a task is done, move it to the **Done** section with the commit hash.
When Aland adds a new backend API, he notes it here so Rekar knows what to wire up.

---

## Pending


### ✅ 5. Notifications — done
`useNotifications.ts` + `NotificationBell.vue` + `NotificationPanel.vue`. Socket.io `/notifications` namespace for real-time push. Bell shows live unread badge, "Mark all read" button in panel header.

---

### 6. Admin dashboard — missing entirely
**Status:** No page exists for ADMIN role users.

Create `app/pages/dashboard/admin.vue` (guard with `v-can` or `requiresRole: 'ADMIN'` in `definePageMeta`).

Wire up:
- `GET /admin/dashboard` → platform stats: total users by role, active subscriptions by plan (FREE/GOLD/PREMIUM counts), daily/weekly active users, total sessions today, revenue by payment method
- `GET /users?role=&search=&subscriptionStatus=` → paginated user table with search/filter
- `PATCH /admin/users/:id` → toggle `isActive` (ban/unban) and change `role`
- `PUT /admin/users/:id/subscription` → assign plan manually (`{ plan, durationMonths }`)
- `DELETE /admin/users/:id/subscription` → cancel subscription

Add an "Admin" link in the sidebar visible only when `user.role === 'ADMIN'`.

---

### 7. Voice Lab — connect to real Socket.io pipeline
**File:** `app/pages/dashboard/voice.vue`  
**Status:** Hardcoded phoneme scores and prompt. Real backend pipeline exists but is not wired.

The backend has a full Socket.io voice pipeline on the `/chat` namespace:
- `voice:start` → begins a voice session
- `voice:chunk` → stream base64 audio chunks during recording
- `voice:end` → finalizes: STT → LLM → TTS response + pronunciation assessment
- Server emits `message:new` with the AI response + pronunciation scores

This page should use the Socket.io composable (or create `useVoice.ts`) to stream mic audio and display real pronunciation scores per word returned from the backend.

---

### 8. Notification items — make clickable with redirect
**File:** `app/components/Layouts/Dashboard/NotificationPanel.vue`  
**Status:** Items are static — clicking does nothing.

Each notification type should navigate to the relevant page when clicked:
- `STREAK_MILESTONE` → `/dashboard` (overview)
- `GOAL_COMPLETED` → `/dashboard/goals`
- `GOAL_ASSIGNED` → `/dashboard/goals`
- `CLASS_ANNOUNCEMENT` → `/dashboard/classes`

On click: close the dropdown, navigate to the route. Mark the individual item as read if it isn't already (backend doesn't have a single-read endpoint yet — use the existing mark-all or skip for now).

---

## Backend Notes for Frontend

### Email verification flow — NEW endpoints (2026-05-31)
Email verification now **activates the FREE plan** (unlocks the AI tutor). Previously only linking Google did this — now verifying the registration email does too. `AuthUser` (returned by login / register / `GET /auth/me` / Google / verify-email) gained an **`emailVerified: boolean`** field.

Flow to wire up:
1. **After register**, the user is logged in but `emailVerified=false` / `subscription.status=INACTIVE`. The backend has emailed them a 6-digit code. Show a "verify your email to unlock the AI tutor" screen/banner.
2. **`POST /auth/verify-email`** — body `{ email, otp }` (6 digits). Returns the updated `AuthUser` (now `emailVerified=true`, `subscription.status=ACTIVE`). Update the auth store with this response. Unauthenticated endpoint — works even if the session expired. Idempotent (re-submitting an already-verified email returns 200).
   - `400` = invalid/expired/used code; `422` = bad format; `429` = rate limited (10 / 15 min).
3. **`POST /auth/resend-verification`** — body `{ email }`. Always returns 200 ("if registered and unverified, a code was sent" — anti-enumeration). Add a "resend code" button with a cooldown (limit is 5 / hour).
4. **Persistent banner**: anywhere AI is gated, if `emailVerified=false`, show "Verify your email or link Google to start chatting." Google link (`POST /auth/link-google`) is the alternative activation path and also sets `emailVerified=true`.

Codes expire in 24h. Types are already in `frontend/types/api.ts` (`paths['/auth/verify-email']`, `paths['/auth/resend-verification']`).

### Dashboard overview types — use the generated `api.ts` (2026-05-30)
Heads up Rekar: `GET /dashboard/overview` was missing from `frontend/types/api.ts` because `bun run generate:types` wasn't run after the backend route was added. I've regenerated it — the route + full response shape now live in the canonical `types/api.ts` (the `paths["/dashboard/overview"]` entry).

The hand-written `app/common/types/dashboard-overview-types.ts` duplicates those types manually, which the project convention specifically warns against (types must flow from Swagger → `api.ts`, never maintained by hand). When you get a chance, retire that file and point `useDashboardOverview.ts` at the generated types instead, e.g.:

```ts
import type { components } from '~/types/api'
type DashboardOverviewData = NonNullable<
  components['schemas'] // or pull from paths['/dashboard/overview']['get']['responses'][200]...['data']
>
```

Not urgent (the duplicate currently mirrors the backend correctly), but it will silently drift the next time the backend shape changes. **Reminder for future endpoints:** after any backend route lands, run `bun run generate:types` from `backend/` and commit `frontend/types/api.ts` — no hand-written mirror files.

### Rate limiting (2026-05-29)
Rate limiting is now live in production on all auth and AI endpoints. The backend returns **HTTP 429** with `{ success: false, message: "Too many requests. Please wait and try again.", data: null }`.

Response headers include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` (seconds until window resets) — these can be used to show a countdown.

**Action needed:** Auth forms (login, register, forgot-password) should display a user-friendly message when the API returns 429, e.g. _"Too many attempts. Please wait a few minutes and try again."_ The existing `useHttp` error handling should catch 429 like any other error — just make sure the UI surfaces the message rather than showing a generic error.
