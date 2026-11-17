import { deleteStoredFile, uploadTaskFile } from "../../config/storage.ts";

export type UploadedFile = { buffer: Buffer; mimetype: string; originalname: string; size: number };
export type StoredFile = { fileName: string; fileUrl: string; mimeType: string; size: number };

/** Keeps the visible name readable but safe: no paths, no control chars, max 150 chars. */
function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim();
  return (cleaned || "file").slice(-150);
}

/** Uploads every file; if one fails, the ones already stored are removed again. */
export async function storeTaskFiles(taskId: string, files: UploadedFile[]): Promise<StoredFile[]> {
  const stored: StoredFile[] = [];
  try {
    for (const f of files) {
      const fileName = cleanFileName(f.originalname);
      const fileUrl = await uploadTaskFile(f.buffer, taskId, f.mimetype, fileName);
      stored.push({ fileName, fileUrl, mimeType: f.mimetype, size: f.size });
    }
    return stored;
  } catch (err) {
    await removeTaskFiles(stored.map((s) => s.fileUrl));
    throw err;
  }
}

export async function removeTaskFiles(urls: string[]): Promise<void> {
  await Promise.all(urls.map((u) => deleteStoredFile(u)));
}
