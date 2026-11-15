import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

/**
 * Receipt storage behind a tiny interface so production can swap in S3/R2
 * without touching the upload route. The local adapter writes under
 * `public/uploads/<userId>/` — fine for dev and single-server deploys; files
 * there are publicly readable by anyone who knows the (unguessable) URL.
 */
export interface StoredFile {
  url: string;
  key: string;
}

export interface StorageAdapter {
  put(userId: string, file: { bytes: Uint8Array; contentType: string }): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;
export const RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

class LocalStorageAdapter implements StorageAdapter {
  private root = path.join(process.cwd(), "public", "uploads");

  async put(userId: string, file: { bytes: Uint8Array; contentType: string }): Promise<StoredFile> {
    const ext = RECEIPT_TYPES[file.contentType];
    if (!ext) throw new Error(`Unsupported content type ${file.contentType}`);
    const key = `${userId}/${randomUUID()}.${ext}`;
    const abs = path.join(this.root, key);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, file.bytes);
    return { url: `/uploads/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    // Reject anything that could escape the uploads root.
    if (key.includes("..") || path.isAbsolute(key)) return;
    await unlink(path.join(this.root, key)).catch(() => undefined);
  }
}

let adapter: StorageAdapter | null = null;
export function storage(): StorageAdapter {
  adapter ??= new LocalStorageAdapter();
  return adapter;
}
