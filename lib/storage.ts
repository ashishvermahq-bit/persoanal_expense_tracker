import "server-only";
import { Types } from "mongoose";
import { Receipt } from "@/models/receipt";

/**
 * Receipt storage. Files live in MongoDB and are served by an authenticated route
 * (`/api/receipts/<id>.<ext>`), scoped to their owner. The interface stays small so
 * a bucket (S3/R2) can replace it later without touching the upload route.
 */
export interface StoredFile {
  url: string;
  key: string;
}

/** Vercel functions reject request bodies over 4.5 MB, so stay safely below. */
export const RECEIPT_MAX_BYTES = 4 * 1024 * 1024;
export const RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * The real type from the file's first bytes. The browser-sent Content-Type is
 * client-controlled, so an HTML/SVG file claiming to be a PNG is refused here.
 */
export function sniffReceiptType(bytes: Uint8Array): string | null {
  const b = (i: number) => bytes[i];
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 5) === "%PDF-") return "application/pdf";
  return null;
}

export async function putReceipt(userId: Types.ObjectId, file: { bytes: Uint8Array; contentType: string }): Promise<StoredFile> {
  const ext = RECEIPT_TYPES[file.contentType];
  if (!ext) throw new Error(`Unsupported content type ${file.contentType}`);
  const doc = await Receipt.create({ userId, contentType: file.contentType, size: file.bytes.byteLength, data: Buffer.from(file.bytes) });
  const key = doc._id.toHexString();
  return { url: `/api/receipts/${key}.${ext}`, key };
}

/** The owner's receipt, or null (never another user's). */
export async function getReceipt(userId: Types.ObjectId, file: string) {
  const m = /^([0-9a-f]{24})\.(jpg|png|webp|pdf)$/.exec(file);
  if (!m) return null;
  return Receipt.findOne({ _id: new Types.ObjectId(m[1]), userId }).lean();
}

/**
 * Exact bytes of a stored receipt as an ArrayBuffer for a Response body. `lean()`
 * can hand back a BSON Binary rather than a Buffer, and a small Buffer's `.buffer`
 * is Node's shared pool (other data!), so always copy just the receipt's bytes.
 */
export function receiptBytes(data: unknown): ArrayBuffer {
  const view =
    data instanceof Uint8Array
      ? data
      : data && typeof data === "object" && "buffer" in data && (data as { buffer: unknown }).buffer instanceof Uint8Array
        ? (data as { buffer: Uint8Array }).buffer
        : new Uint8Array();
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy.buffer;
}
