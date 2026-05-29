import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "./env.ts";
import { r2 } from "./r2.ts";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// Shared by upload.ts fileFilter — single source of truth for allowed image types
export const IMAGE_MIMES = Object.keys(MIME_TO_EXT);

// Strip trailing slash so URL construction is always consistent
function publicUrl(): string {
  return (env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
}

export async function uploadAvatar(
  buffer: Buffer,
  userId: string,
  mimeType: string,
): Promise<string> {
  const ext = MIME_TO_EXT[mimeType] ?? ".jpg";
  const filename = `${randomUUID()}${ext}`;
  const key = `avatars/${userId}/${filename}`;

  if (r2 && env.R2_PUBLIC_URL && env.R2_BUCKET_NAME) {
    await r2.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return `${publicUrl()}/${key}`;
  }

  // Local fallback — dev without R2 credentials
  if (env.NODE_ENV === "production") {
    throw new Error("R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL, and R2_BUCKET_NAME.");
  }

  const localDir = join("uploads", "avatars", userId);
  await mkdir(localDir, { recursive: true });
  await writeFile(join(localDir, filename), buffer);
  return `/uploads/avatars/${userId}/${filename}`;
}

export async function deleteAvatar(avatarUrl: string | null): Promise<void> {
  if (!avatarUrl) return;

  const base = publicUrl();
  if (r2 && base && env.R2_BUCKET_NAME && avatarUrl.startsWith(base + "/")) {
    const key = avatarUrl.slice(base.length + 1);
    await r2
      .send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }))
      .catch((err) => { console.warn("[storage] R2 delete failed — orphaned object:", key, err?.message); });
    return;
  }

  if (avatarUrl.startsWith("/uploads/avatars/")) {
    await unlink(avatarUrl.slice(1)).catch((err) => {
      if (err?.code !== "ENOENT") console.warn("[storage] local delete failed:", avatarUrl, err?.message);
    });
  }
  // External URLs (Google, CDN, etc.) — skip
}
