# Google OAuth — Sign In With Google

## Why Google OAuth?

Users can register and sign in using their Google account instead of creating a
username/password. This is faster, more convenient, and means one less password to manage.

### Account merging
If a user has an existing email/password account and later signs in with Google using
the same email, the accounts are **merged automatically** — the Google ID is linked to
their existing account. After that, they can sign in with either method.

---

## How It Works in This Project

The frontend handles the Google OAuth dance using Google's own JS SDK. The backend
never redirects to Google — it only **verifies** the token Google gives the frontend.

```
Frontend
  ↓  User clicks "Sign in with Google"
  ↓  Google's Sign-In button / SDK handles the OAuth flow
  ↓  Google returns a credential (ID token — a signed JWT)
  ↓
Backend  POST /api/v1/auth/google  { idToken: "eyJ..." }
  ↓  Calls https://oauth2.googleapis.com/tokeninfo to verify the token
  ↓  Checks the `aud` field matches GOOGLE_CLIENT_ID (prevents token theft attacks)
  ↓  Checks `email_verified: true` on the Google account
  ↓  Finds or creates the user
  ↓
Response: { accessToken, refreshToken, user } — same shape as /auth/login
```

### The four cases the backend handles automatically

| Scenario | What happens |
|----------|-------------|
| Existing Google user | Logged in immediately, tokens returned |
| Existing email/password user with same email | Google ID linked to account (merge), tokens returned |
| Brand new Google user, `username` provided | Account created, tokens returned |
| Brand new Google user, no `username` | Returns `{ needsRegistration: true, profile: { email, displayName, avatarUrl } }` — frontend shows username input, then calls the endpoint again with `username` |

---

## Step 1 — Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Fill in:
   - **Project name:** `tutelage` (or any name)
   - **Organization:** leave as-is (no organization for personal projects)
4. Click **Create**
5. Make sure the new project is selected in the top dropdown

---

## Step 2 — Enable the Google Identity API

1. In the left sidebar → **APIs & Services** → **Library**
2. Search for: `Google Identity`
3. Click **Google Identity Toolkit API** → **Enable**

> If you don't see it, search for `Identity Platform` instead — it's the same service.

---

## Step 3 — Configure the OAuth Consent Screen

Before creating credentials, Google requires you to configure the consent screen
(the popup users see when they click "Sign in with Google").

1. **APIs & Services** → **OAuth consent screen**
2. Choose **External** (for any Google account to sign in) → **Create**
3. Fill in:
   - **App name:** `Tutelage`
   - **User support email:** your email
   - **Developer contact email:** your email
4. Click **Save and Continue** through the remaining steps (Scopes, Test users)
   - For Scopes: no extra scopes needed — the default (`openid`, `email`, `profile`) is enough
   - For Test users: add your own Gmail for testing in development
5. Click **Back to Dashboard**

> **Publishing status:** leave it as **Testing** for development. You can publish it later
> when the app is ready for real users.

---

## Step 4 — Create OAuth 2.0 Credentials

1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
2. Choose **Application type: Web application**
3. Fill in:
   - **Name:** `Tutelage Web Client`
   - **Authorized JavaScript origins:** `http://localhost:3000` (your Nuxt dev server)
   - **Authorized redirect URIs:** leave empty — this project uses the token-based flow,
     not redirect-based. The frontend gets the ID token and posts it to the backend.
4. Click **Create**
5. A dialog shows your **Client ID** and **Client Secret**
   - **Copy the Client ID** — it looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`
   - You do NOT need the Client Secret for this backend (the backend only verifies tokens,
     it doesn't exchange authorization codes)

---

## Step 5 — Add GOOGLE_CLIENT_ID to Infisical

**Do not paste the Client ID into a `.env` file.** Infisical is the source of truth.

1. Go to [infisical.com](https://infisical.com) → your `esl-chatbot` project → `dev` environment
2. Click **+ Add Secret**
3. Key: `GOOGLE_CLIENT_ID`
4. Value: paste your Client ID (e.g. `123456789-abc.apps.googleusercontent.com`)
5. Click **Save**

For production, add the same key to the `prod` environment with the same value
(or a separate Google project/client if you want dev/prod isolation).

---

## Step 6 — Set Up the Frontend (Nuxt.js)

The frontend needs to show the "Sign in with Google" button and send the ID token to
the backend. The easiest way for Nuxt is the `vue3-google-login` package.

### Install in the frontend

```bash
# inside esl-chatbot-web/frontend/
bun add vue3-google-login
```

### Register the plugin (Nuxt)

```ts
// plugins/google-login.ts
import { defineNuxtPlugin } from '#app'
import vue3GoogleLogin from 'vue3-google-login'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(vue3GoogleLogin, {
    clientId: useRuntimeConfig().public.googleClientId,
  })
})
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      googleClientId: process.env.GOOGLE_CLIENT_ID,
    }
  }
})
```

### Use in a component

```vue
<script setup lang="ts">
import { GoogleLogin } from 'vue3-google-login'

const handleGoogleResponse = async (response: { credential: string }) => {
  // Step 1: send the idToken to the backend
  const { data } = await api.POST('/auth/google', {
    body: { idToken: response.credential }
  })

  if (data?.needsRegistration) {
    // Step 2: show username input, then call again
    const username = await promptUsernameModal(data.profile)
    await api.POST('/auth/google', {
      body: { idToken: response.credential, username }
    })
  }
  // Store accessToken + refreshToken, redirect to dashboard
}
</script>

<template>
  <GoogleLogin :callback="handleGoogleResponse" />
</template>
```

---

## Step 7 — Test the Flow (No Frontend Needed)

The backend has a built-in test page for generating Google ID tokens without a frontend.
It serves the Google Sign-In button and displays the token so you can copy it into Swagger.

### One-time setup — add localhost:8000 to Google

The test page is served from `http://localhost:8000`, so Google must allow that origin:

1. Go to **Google Cloud Console** → **APIs & Services** → **Credentials**
2. Click your OAuth 2.0 client → **Edit**
3. Under **Authorized JavaScript origins**, click **+ Add URI**
4. Add: `http://localhost:8000`
5. Click **Save** (takes ~1 minute to propagate)

### Get a token and test in Swagger

1. Start the backend: `bun dev`
2. Open **`http://localhost:8000/api/v1/auth/google/test`** in your browser
3. Click **Sign in with Google** and complete the sign-in
4. Your ID token appears in the text box — click **Copy token**
5. Open **`http://localhost:8000/api-docs`** → find **POST /auth/google**
6. Paste the token into the `idToken` field and execute

> The test page is only available in `development` mode (`NODE_ENV !== production`).
> It is automatically disabled in production — no action needed.

### Using curl (with a real token)

```bash
curl -X POST http://localhost:8000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."}'
```

### Expected responses

**New user (no username yet):**
```json
{
  "success": true,
  "message": "Username required to complete registration",
  "data": {
    "needsRegistration": true,
    "profile": {
      "googleId": "1234567890",
      "email": "user@gmail.com",
      "displayName": "John Doe",
      "avatarUrl": "https://lh3.googleusercontent.com/..."
    }
  }
}
```

**Call again with username:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "eyJ...", "username": "john_doe"}'
```

**Success (existing or newly created user):**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "needsRegistration": false,
    "user": { "id": "...", "username": "john_doe", "subscription": { "plan": "FREE", "status": "INACTIVE" }, ... },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

---

## Troubleshooting

### `Google OAuth is not configured on this server` (503)
`GOOGLE_CLIENT_ID` is not set in your environment. Add it to Infisical and restart the server.

### `Google token was not issued for this application` (401)
The `GOOGLE_CLIENT_ID` in Infisical doesn't match the one you used to get the token.
Copy the exact Client ID from Google Cloud Console → Credentials.

### `Invalid Google ID token` (401)
- The token has expired (Google ID tokens expire after 1 hour)
- The token was malformed or truncated
- Get a fresh token by re-running the sign-in flow

### `Google account email is not verified` (401)
The Google account's email is not verified. This is rare — almost all Google accounts
have verified emails. The user should verify their email in their Google account settings.

### Test users only (consent screen in Testing mode)
If users get "App not verified" or can't sign in, your OAuth consent screen is in
**Testing** mode and only allows added test users. Either add their email as a test user
in Google Cloud Console, or publish the consent screen.

### `/auth/google/test` popup goes white and no token is returned
The Google Sign-In popup opens, you pick an account, but then the popup turns blank and
the ID token never appears in the text box. This is almost always caused by a strict
`Cross-Origin-Opener-Policy` header on the parent page. Google Sign-In (popup mode) needs
to `postMessage` the credential back to the opener window, and `COOP: same-origin` blocks
that. The `/auth/google/test` route already overrides this to `same-origin-allow-popups`;
if you ever copy the page elsewhere or mount it under a different route, you must set
the same header there too. **This has nothing to do with your Authorized JavaScript
origins or Client ID** — do not create a second OAuth client to try to "fix" it.

---

## Security Notes

- The backend uses Google's `tokeninfo` endpoint to verify tokens — it validates the
  JWT signature using Google's public keys and checks the `aud` field matches your
  `GOOGLE_CLIENT_ID`. This prevents token reuse from other apps.
- The `GOOGLE_CLIENT_SECRET` is **not needed** for this flow (it's only needed for
  server-side authorization code exchange — not used here).
- Google ID tokens expire after 1 hour. The backend rejects expired tokens automatically.
- Email verification (`email_verified: true`) is enforced — unverified Google emails
  cannot be used to register or sign in.
