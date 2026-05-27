# File Storage — Cloudflare R2

## Decision
**Cloudflare R2** for all user-uploaded and generated files.

- **Zero egress fees** — pay only for storage, not downloads. Critical for audio files replayed by students.
- S3-compatible API — works with `@aws-sdk/client-s3`, no extra package needed.
- Pairs with Cloudflare CDN for fast global delivery (important for Kurdistan/Iraq users).
- Free tier: 10 GB storage + 1M Class A ops + 10M Class B ops per month.

---

## What Gets Stored

| File Type | Path in Bucket | When |
|-----------|----------------|------|
| Voice recordings (student audio) | `audio/recordings/{sessionId}/{messageId}.webm` | Done ✅ |
| TTS output (AI-generated audio) | `audio/tts/{sessionId}/{messageId}.mp3` | Done ✅ |
| User avatars | `avatars/{userId}.webp` | Phase 3 |

---

## Step 1 — Create or Log In to Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Log in with your Cloudflare account (or create one for free — no credit card needed for R2 free tier)
3. You'll land on the Cloudflare dashboard

---

## Step 2 — Enable R2

1. In the left sidebar, click **R2 Object Storage**
2. If you see a "Get started" or "Enable R2" button, click it and follow the prompt
   - Cloudflare may ask for a payment method to enable R2 even on the free tier. Add a card; you won't be charged unless you exceed the free limits
3. Once enabled, you'll see the R2 overview page

---

## Step 3 — Create the Bucket

1. Click **+ Create bucket**
2. Fill in:

   | Setting | Value |
   |---------|-------|
   | Bucket name | `tutelage-uploads` |
   | Location | **Automatic** (Cloudflare picks the closest region — fine for now) |

3. Click **Create bucket**

---

## Step 4 — Enable Public Access for the Bucket

Audio files and avatars need to be publicly readable (students stream audio, avatars load in the UI).

1. Open your `tutelage-uploads` bucket → **Settings** tab
2. Scroll to **Public access** → click **Allow Access**
3. Cloudflare assigns a public URL in the format:
   ```
   https://pub-<hash>.r2.dev
   ```
   Copy this — it becomes `R2_PUBLIC_URL`.

> **Optional (recommended for production):** Connect a custom domain under **Settings → Custom Domains** (e.g. `uploads.tutelage.com`). This makes URLs cleaner and avoids the `r2.dev` domain. Skip for now and add it before launch.

---

## Step 5 — Create an R2 API Token

1. Go back to the **R2 Object Storage** overview page (not inside a bucket)
2. Click **Manage R2 API Tokens** (top right corner)
3. Click **+ Create API token**
4. Configure the token:

   | Setting | Value |
   |---------|-------|
   | Token name | `tutelage-backend` |
   | Permissions | **Object Read & Write** |
   | Specify bucket | Select `tutelage-uploads` (restrict to one bucket — least privilege) |
   | TTL | No expiry (or set a long expiry if you prefer) |

5. Click **Create API Token**
6. **Copy both values immediately — they are shown only once:**
   - `Access Key ID` → this is `R2_ACCESS_KEY_ID`
   - `Secret Access Key` → this is `R2_SECRET_ACCESS_KEY`

---

## Step 6 — Get Your Account ID

1. Go to any Cloudflare dashboard page
2. Look at the URL — it contains your Account ID:
   ```
   https://dash.cloudflare.com/<ACCOUNT_ID>/r2/...
   ```
3. Or: click your account name in the top-left → **Account Home** → the Account ID is shown on the right sidebar under **API**

This is `R2_ACCOUNT_ID`.

---

## Step 7 — Add All Vars to Infisical

1. Go to [infisical.com](https://infisical.com) → `esl-chatbot` project → `dev` environment
2. Add each secret (click **+ Add Secret** for each):

   | Secret name | Value |
   |-------------|-------|
   | `R2_ACCOUNT_ID` | Your Account ID from Step 6 |
   | `R2_ACCESS_KEY_ID` | Access Key ID from Step 5 |
   | `R2_SECRET_ACCESS_KEY` | Secret Access Key from Step 5 |
   | `R2_BUCKET_NAME` | `tutelage-uploads` |
   | `R2_PUBLIC_URL` | The `https://pub-<hash>.r2.dev` URL from Step 4 |

3. Click **Save** after each secret — Infisical does not auto-save

> These same 5 vars need to be set in the `prod` environment when you go live. Use a separate R2 API token for prod (same bucket is fine, or create a `tutelage-uploads-prod` bucket for isolation).

---

## Step 8 — Verify the Setup

Start the dev server:

```bash
bun dev
```

The server startup log validates env vars. If `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, or `R2_SECRET_ACCESS_KEY` are missing, the Zod env check will exit with a clear error listing which vars are absent.

Once the server starts cleanly, R2 is wired up. Voice message recording uploads and TTS audio uploads are active — both `Message.audioUrl` fields are populated on successful voice message calls.

---

## SDK Setup (already in the codebase)

The S3-compatible client is set up in `src/config/r2.ts` once the env vars are present:

```typescript
import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
```

Install the SDK (do this once in `backend/`):

```bash
bun add @aws-sdk/client-s3
```

---

## Bucket Structure

```
tutelage-uploads/
├── avatars/
│   └── {userId}.webp
└── audio/
    ├── recordings/
    │   └── {sessionId}/{messageId}.webm
    └── tts/
        └── {sessionId}/{messageId}.mp3
```

---

## File Size Limits

| File type | Max size | Enforcement |
|-----------|----------|-------------|
| Audio recordings | 10 MB | Multer `limits.fileSize` |
| TTS output | 5 MB | Set in TTS upload helper |
| Avatars | 2 MB | Multer `limits.fileSize` |

---

## Troubleshooting

### `NoSuchBucket` error
The bucket name in `R2_BUCKET_NAME` doesn't match the bucket you created in Cloudflare. Check for typos — bucket names are case-sensitive.

### `SignatureDoesNotMatch` or `InvalidAccessKeyId`
The `R2_ACCESS_KEY_ID` or `R2_SECRET_ACCESS_KEY` is wrong or was not saved in Infisical before running `bun dev`. Re-copy from the Cloudflare token page (if you lost the secret key, generate a new token — it cannot be retrieved).

### `Access Denied` on upload
The API token was created with **Read Only** permissions or was restricted to a different bucket. Delete the token and create a new one with **Object Read & Write** scoped to `tutelage-uploads`.

### Public URL returns 404 after upload
Public access may not be enabled on the bucket. Go to bucket → **Settings** → **Public access** → confirm it shows **Allowed**. Also verify the `R2_PUBLIC_URL` matches the URL Cloudflare shows (no trailing slash).

### Secret saved in Infisical but old value still injected
You edited a secret but navigated away before clicking **Save** — Infisical discards unsaved edits silently. Go back, re-enter the value, click Save, then restart `bun dev`.
