# Frontend Plan — Terms of Service signing (wire to backend Task 8)

**Author:** Opus (planning only — do NOT implement here)
**Implementer:** Sonnet
**Backend status:** DONE (commit 507cf48). Endpoints, types, and the re-accept guard all exist.
**Scope:** Make the existing auth flows satisfy the new backend contract. No backend changes.

---

## 0. Backend contract we are wiring (already shipped)

All shapes are in `frontend/types/api.ts` (auto-generated — never hand-edit).

1. **`GET /auth/agreement`** — public, no auth. Returns `{ version, effectiveDate, text }`. `text` is markdown-ish (`#` headers, numbered sections).
2. **`POST /auth/register`** — now **requires** `acceptAgreement: true`. Missing/false → **422** with `errors.acceptAgreement`.
3. **`POST /auth/google`** with a `username` (new-account branch) — now **requires** `acceptAgreement: true`, else **400**.
4. **Re-accept guard** — **both** `POST /auth/login` **and** `POST /auth/google` (existing-user / merge paths) can return **403** with body `{ success:false, message, needsAgreement:true, agreementVersion:"<v>" }` when the user hasn't accepted the *current* version.
5. **`POST /auth/accept-agreement`** — re-proves identity and records acceptance, returns the normal `LoginResponse` (`{ user, accessToken, refreshToken }`). Two body variants:
   - LOCAL: `{ username, password }` (the same credentials the user just typed)
   - Google: `{ idToken }` (the same Google credential — backend re-verifies it)

There is **no migration backfill** for existing users — they hit `needsAgreement` on first login post-deploy and re-accept. This is intended; the frontend must handle it gracefully.

---

## 1. The one architectural blocker — `useHttp` swallows the error body

**Problem.** `app/composables/useHttp.ts` discards the response JSON on any non-2xx:
on `!res.ok` it returns `{ success:false, message, data: null }`. The `needsAgreement`
and `agreementVersion` fields live at the **top level** of the 403 body, so today the
frontend literally cannot see them. The existing unverified-email 403 only works because
it sniffs the `message` text with a regex — fragile, and we should not add a second regex.

**Fix (do this first — everything else depends on it).** On the error paths, parse the body
and put the **full parsed payload** in `data`, mirroring the success path (where `response.data`
is already the entire `{ success, message, data }` envelope). Concretely, in the three places
that currently set `data: null` on a non-ok response (the `!retryRes.ok` branch, the main
`!res.ok` branch — **not** the 429 early-return, which has no body), change:

```ts
const data = await res.json()          // already parsed for message
const response: HttpResponse<T> = {
  success: false,
  message: data.error?.message || data.message || `Request failed: ${res.status}`,
  data,                                 // ← was `null`; now the full parsed body
  status: res.status,
}
```

Then callers read `response.data?.needsAgreement` / `response.data?.agreementVersion`.
This is consistent with the success path (`response.data.data.user`).

**Safety audit (required).** Before shipping, grep for callers that treat `response.data`
as a success proxy on a failed request — i.e. `if (response.data)` **without** first checking
`response.success`. Convention here is to gate on `response.success` (see the store), so this
should be safe, but verify. If any caller is unsafe, prefer fixing that caller over reverting
this change; the consistent envelope is the right altitude. If a fully non-breaking change is
required, fall back to adding a dedicated `payload?: any` field instead of reusing `data` — but
the `data` approach is preferred for consistency.

---

## 2. New + changed files

### 2.1 `app/common/schemas/AuthSchema.ts` — MODIFY
- Add to `signUpSchema`:
  ```ts
  acceptAgreement: zod.literal(true, { message: 'You must accept the Terms of Service to create an account' }),
  ```
  (`z.literal(true)` mirrors the backend and makes an unchecked box a validation error, not a server round-trip.)
- Add the same `acceptAgreement: zod.literal(true, {...})` to `googleUsernameSchema`.
- The inferred `SignUpSchema` / `GoogleUsernameSchema` types update automatically.

### 2.2 `app/composables/useAgreement.ts` — NEW
Fetch-and-cache the agreement text (it's the same for everyone; fetch once per app load).
```ts
// module-scoped cache so the dialog + both pages share one fetch
const cached = ref<{ version: string; effectiveDate: string; text: string } | null>(null)
const loading = ref(false)

export function useAgreement() {
  async function load() {
    if (cached.value || loading.value) return cached.value
    loading.value = true
    const res = await useHttp({ method: 'GET', url: '/auth/agreement', requireAuth: false })
    if (res.success) cached.value = res.data?.data ?? null
    loading.value = false
    return cached.value
  }
  return { agreement: cached, loading, load }
}
```
Do **not** put `acceptAgreement` (the mutation) here — it persists tokens, so it belongs in the auth store (2.4).

### 2.3 `app/components/Form/AgreementDialog.vue` — NEW
One component, two modes, reused everywhere (signup checkbox link, Google checkbox link, and the re-accept prompt). Built on the existing shadcn `UiDialog` + `UiDialogScrollContent` (see `JoinClassModal.vue` for the house pattern).

Props / emits:
```ts
const props = defineProps<{
  open: boolean
  mode?: 'view' | 'accept'      // 'view' = read-only (close only); 'accept' = shows Accept button
  loading?: boolean             // bind to authStore.isLoading during accept
}>()
const emit = defineEmits<{ 'update:open': [boolean]; accept: [] }>()
```
Behavior:
- On open, call `useAgreement().load()` and render `agreement.text`.
- **Rendering:** no markdown dependency exists in the project. Render `text` in a scrollable
  container with `whitespace-pre-wrap` and prose styling. Optionally do a *minimal* transform
  (lines starting `# `/`## ` → headings) — but keep it dependency-free. A faithful pre-wrap
  render is acceptable for v1; note it as a possible polish item.
- Show `version` + `effectiveDate` in the header/footer (small, muted).
- `mode === 'accept'`: footer has a primary **"I Accept"** button (`@click="emit('accept')"`,
  `:loading="loading"`) and a secondary Cancel. `mode === 'view'`: just a Close button.
- `UiDialogScrollContent` because the text is long.

### 2.4 `stores/auth.ts` — MODIFY
- **`signUp`** — add `acceptAgreement: true` to the POST body. (The schema already guarantees the box was checked before we get here; sending the literal keeps backend + client honest.)
- **`googleAuth`** — add a third param and forward it on the new-account path:
  ```ts
  async googleAuth(idToken: string, username?: string, acceptAgreement?: boolean) {
    const body = username ? { idToken, username, acceptAgreement } : { idToken }
    // ...unchanged: persist tokens on success
  }
  ```
- **NEW action `acceptAgreement`** — mirrors `signIn` (persists tokens on success):
  ```ts
  async acceptAgreement(creds: { username: string; password: string } | { idToken: string }) {
    this.isLoading = true
    const response = await useHttp({ method: 'POST', url: '/auth/accept-agreement', body: creds, showToast: false })
    if (response.success && response.data?.data?.accessToken) {
      await this._persistTokens(response.data.data.accessToken, response.data.data.refreshToken)
      this.setUserFromResponse(response.data.data.user)
    }
    this.isLoading = false
    return response
  }
  ```

### 2.5 `app/pages/signup.vue` — MODIFY
- Add `acceptAgreement: false` to `formData` (typed by the updated `SignUpSchema`).
- Replace the static Terms/Privacy `<p>` (current lines 117–122) with a real **`UiCheckbox`** row:
  - Checkbox bound to `formData.acceptAgreement`.
  - Label: `I accept the Terms of Service` where **Terms of Service** is a button that opens
    `<AgreementDialog mode="view">` (local `showTerms` ref).
  - Show `errors.acceptAgreement` beneath it (the `Form` slot already exposes `errors`).
- No change to `handleSubmit` logic beyond the schema now blocking submit until checked; the
  store sends `acceptAgreement: true`. Keep the existing 422 fallback for safety.

### 2.6 `app/pages/google-username.vue` — MODIFY
- Add `acceptAgreement: false` to `formData` (typed by updated `GoogleUsernameSchema`).
- Add the same `UiCheckbox` + `AgreementDialog(view)` row as signup.
- Pass it through: `authStore.googleAuth(idToken.value, formData.username, formData.acceptAgreement)`.
- Keep the existing 400 fallback message.

### 2.7 `app/pages/signin.vue` — MODIFY (re-accept on password login)
After `const response = await authStore.signIn(formData)`, **before** the existing
unverified-email branch, add a needsAgreement branch:
```ts
if (response.status === 403 && response.data?.needsAgreement) {
  reacceptOpen.value = true     // opens <AgreementDialog mode="accept">
  return
}
```
- Local state: `const reacceptOpen = ref(false)`.
- The dialog's `@accept` handler calls
  `authStore.acceptAgreement({ username: formData.username, password: formData.password })`
  (the credentials are still in `formData` — they were correct, the only thing missing was acceptance).
  On `response.success` → `router.push('/dashboard')`. On failure → show `serverError`, close dialog.
- Keep the existing unverified-email 403 branch **after** this one. Disambiguation is now clean:
  `needsAgreement` true → re-accept; otherwise the message-regex path for unverified email.

### 2.8 `app/components/Form/GoogleButton.vue` — MODIFY (re-accept on Google login)
`handleCredential` currently handles `needsRegistration`. Add a needsAgreement branch for the
**existing-user** case (the user already has an account but the terms changed):
```ts
if (!response.success && response.status === 403 && response.data?.needsAgreement) {
  pendingIdToken.value = idToken      // Google ID tokens stay valid ~1h; backend re-verifies
  reacceptOpen.value = true
  isLoading.value = false
  return
}
```
- The component owns its own `<AgreementDialog mode="accept">` (it already renders standalone
  on both signin and signup pages, so self-containing the modal avoids prop drilling).
- `@accept` → `authStore.acceptAgreement({ idToken: pendingIdToken.value })`; on success
  `router.push('/dashboard')`.
- Note: new Google accounts (`needsRegistration`) go through `google-username.vue` and accept via
  the checkbox there — so the GoogleButton re-accept path only ever fires for **existing** accounts
  whose version went stale. Keep the two paths separate.

---

## 3. Flow summary (what the user sees)

| Scenario | Path | Acceptance mechanism |
|---|---|---|
| New local account | signup.vue | checkbox → `register { acceptAgreement:true }` |
| New Google account | GoogleButton → google-username.vue | checkbox → `google { username, acceptAgreement:true }` |
| Existing local user, version bumped | signin.vue → 403 | re-accept modal → `accept-agreement { username, password }` |
| Existing Google user, version bumped | GoogleButton → 403 | re-accept modal → `accept-agreement { idToken }` |
| View terms before signing | any checkbox label | `AgreementDialog mode="view"` (GET /auth/agreement) |

---

## 4. Edge cases to get right
- **Don't store the password** anywhere for the re-accept flow — it's already in the reactive
  `formData` on signin and used in-place. Never persist it to sessionStorage.
- **403 disambiguation:** always check `response.data?.needsAgreement` first; the unverified-email
  403 has no such field. Do not rely on message text for the agreement case.
- **Cancelling the re-accept modal** must leave the user logged out (no tokens were issued) and
  show a neutral message ("You must accept the updated Terms to continue").
- **`acceptAgreement` reset:** the signup/google-username checkbox state resets on navigation
  (fresh `reactive`), so no stale-true carryover. Verify the box starts unchecked.
- **429 on `/auth/accept-agreement`:** the route is behind `loginLimiter`. `useHttp` already maps
  429 to a friendly message — surface it in the dialog, keep the dialog open.
- **Google idToken reuse:** valid for ~1h and the backend re-verifies on accept-agreement, so
  reusing the same token after a 403 is fine. If it has expired by accept time, the call returns
  401/503 — show the error and ask the user to click Continue with Google again.

---

## 5. QA checklist (manual, against local dev)
Pre-req: backend `bun run db:push` + `bun run db:seed` (creates table + seed acceptance rows).

- [ ] Register with box unchecked → blocked client-side (schema error, no request sent).
- [ ] Register with box checked → 201 → verify-email flow as before.
- [ ] "Terms of Service" link in signup opens the dialog and shows real text from the API.
- [ ] Google new account → username screen shows the checkbox; unchecked blocks; checked completes.
- [ ] Bump `CURRENT_AGREEMENT.version` in backend, restart API → existing seed user login →
      re-accept modal appears → accept → lands on /dashboard → second login does NOT prompt again.
- [ ] Same version-bump test via Google sign-in (existing Google user) → re-accept → /dashboard.
- [ ] Cancel the re-accept modal → user stays logged out, neutral message shown.
- [ ] Unverified-email 403 still routes to /verify-email (no regression).
- [ ] `bunx nuxi typecheck` clean.

---

## 6. Out of scope
- Real legal copy (backend bumps version when the owner provides it — no FE change).
- A standalone `/terms` public page. The current static `/terms` link in signup is replaced by
  the live dialog; if a standalone page is still wanted, it can reuse `useAgreement` + the same
  renderer, but it is not required for this task.

---

## 7. Update `frontend/TASKS.md` when done
Move the "Terms of Service / agreement signing" note to the Done section with the commit hash,
listing the files touched (same convention as the other completed tasks).
