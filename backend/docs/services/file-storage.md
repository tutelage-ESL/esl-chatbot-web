# File Storage — Cloudflare R2

## Decision
**Cloudflare R2** for all user-uploaded and generated files.

---

## What Gets Stored

| File Type | When | Typical Size |
|-----------|------|-------------|
| User avatars | Phase 3 | 50–500 KB per file |
| Voice recordings (student audio) | Phase 4 | 100 KB – 5 MB per file |
| TTS output (AI-generated audio) | Phase 4 | 50 KB – 2 MB per file |
| Session transcripts / exports | Phase 6+ | Small |

---

## Why R2

- **Zero egress fees** — you pay only for storage, not for downloads. Critical for audio
  files that get streamed every time a student replays a message.
- S3-compatible API — works with `@aws-sdk/client-s3`, no extra package needed
- Pairs with Cloudflare CDN for fast global delivery (important for Kurdistan/Iraq users)
- Free tier: 10 GB storage + 1M Class A requests + 10M Class B requests per month

### Comparison
| Service | Egress Cost | Free Tier | Notes |
|---------|------------|-----------|-------|
| **Cloudflare R2** ⭐ | **$0** | 10 GB | Best for audio-heavy apps |
| AWS S3 | $0.09/GB | 5 GB (12mo) | Industry standard, adds up fast |
| Supabase Storage | Bundled | 1 GB | Fine if already on Supabase |
| DigitalOcean Spaces | $5/mo flat | None | Simple, S3-compatible |
| Backblaze B2 | $0.01/GB | 10 GB | Cheapest after R2 |

---

## Integration Path

Current flow (dev only):
```
Multer (parse multipart) → save to /uploads folder on disk
```

Production flow (replace with):
```
Multer (parse multipart, keep in memory) → upload buffer to R2 → store public URL in DB
```

Fields that will store URLs:
- `User.avatarUrl` — profile picture
- `Message` — add `audioUrl` field when implementing voice (Phase 4)

### SDK Setup
```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

R2 uses the same S3 client but with a custom endpoint:
```typescript
import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
```

### Required Env Vars
```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=tutelage-uploads
R2_PUBLIC_URL=https://your-custom-domain-or-r2-dev-url
```

---

## Recommended Bucket Structure

```
tutelage-uploads/
├── avatars/
│   └── {userId}.webp
├── audio/
│   ├── recordings/
│   │   └── {sessionId}/{messageId}.webp
│   └── tts/
│       └── {sessionId}/{messageId}.mp3
```

---

## Notes
- Convert avatars to WebP before uploading (smaller, faster)
- Set a max file size in Multer (e.g., 10 MB for audio, 2 MB for images)
- Use presigned URLs for private files; public URL for avatars
