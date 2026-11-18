import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writeFile, unlink, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
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

// Task files (tutor attachments + comment attachments). The extension always comes
// from this map, never from the uploaded name, so nothing executable (html, svg, js)
// can be stored or served from our origin.
export const TASK_FILE_EXT: Record<string, string> = {
  ...MIME_TO_EXT,
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "text/plain": ".txt",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/webm": ".webm",
  "audio/ogg": ".ogg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

// Strip trailing slash so URL construction is always consistent
function publicUrl(): string {
  return (env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
}

/** Stores `buffer` under `key` in R2, or under ./uploads in dev. Returns its public URL. */
async function storeFile(key: string, buffer: Buffer, mimeType: string, downloadName?: string): Promise<string> {
  if (r2 && env.R2_PUBLIC_URL && env.R2_BUCKET_NAME) {
    await r2.send(
      new PutObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // Opening the link keeps the original file name for "Save as".
        ...(downloadName ? { ContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(downloadName)}` } : {}),
      }),
    );
    return `${publicUrl()}/${key}`;
  }

  // Local fallback — dev without R2 credentials
  if (env.NODE_ENV === "production") {
    throw new Error("R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL, and R2_BUCKET_NAME.");
  }
  const localPath = join("uploads", key);
  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, buffer);
  return `/uploads/${key}`;
}

/** Best-effort delete of a file this server stored. External URLs are ignored. */
export async function deleteStoredFile(url: string | null): Promise<void> {
  if (!url) return;

  const base = publicUrl();
  if (r2 && base && env.R2_BUCKET_NAME && url.startsWith(base + "/")) {
    const key = url.slice(base.length + 1);
    await r2
      .send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }))
      .catch((err) => { console.warn("[storage] R2 delete failed — orphaned object:", key, err?.message); });
    return;
  }

  if (url.startsWith("/uploads/") && !url.includes("..")) {
    await unlink(url.slice(1)).catch((err) => {
      if (err?.code !== "ENOENT") console.warn("[storage] local delete failed:", url, err?.message);
    });
  }
  // External URLs (Google, CDN, etc.) — skip
}

export async function uploadAvatar(
  buffer: Buffer,
  userId: string,
  mimeType: string,
): Promise<string> {
  const ext = MIME_TO_EXT[mimeType] ?? ".jpg";
  return storeFile(`avatars/${userId}/${randomUUID()}${ext}`, buffer, mimeType);
}

export const deleteAvatar = deleteStoredFile;

/**
 * A 5-minute link that makes the browser save the file under `fileName`. Public R2 URLs
 * open inline, and `<a download>` is ignored across origins, so downloads need this.
 * Files not on R2 (local dev fallback) are returned as they are.
 */
export async function signedDownloadUrl(fileUrl: string, fileName: string): Promise<string> {
  const base = publicUrl();
  if (!r2 || !base || !env.R2_BUCKET_NAME || !fileUrl.startsWith(base + "/")) return fileUrl;
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: fileUrl.slice(base.length + 1),
    ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  });
  // The presigner ships its own @smithy/types copy, so the same client and command fail
  // the type check although they work at runtime.
  type Sign = Parameters<typeof getSignedUrl>;
  return getSignedUrl(r2 as unknown as Sign[0], command as unknown as Sign[1], { expiresIn: 300 });
}

export async function uploadTaskFile(
  buffer: Buffer,
  ownerId: string,
  mimeType: string,
  fileName: string,
  folder: "tasks" | "announcements" = "tasks",
): Promise<string> {
  const ext = TASK_FILE_EXT[mimeType] ?? ".bin";
  return storeFile(`${folder}/${ownerId}/${randomUUID()}${ext}`, buffer, mimeType, fileName);
}
