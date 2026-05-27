import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "../config/r2.ts";
import { env } from "../config/env.ts";

const MIME_TO_EXT: Record<string, string> = {
  "audio/webm": ".webm",
  "audio/mp4": ".mp4",
  "audio/ogg": ".ogg",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
};

export function audioExtFromMime(mimeType: string): string {
  const base = mimeType.split(";")[0] ?? mimeType;
  return MIME_TO_EXT[base.trim()] ?? ".bin";
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (!r2 || !env.R2_PUBLIC_URL) {
    throw new Error("R2 storage is not configured");
  }
  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `${env.R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!r2) return;
  await r2.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }),
  );
}
