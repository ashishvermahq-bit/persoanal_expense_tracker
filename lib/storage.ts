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

/** Receipts are stored in MongoDB; nginx (deploy/nginx/paisa.conf) allows 6 MB bodies, comfortably above this. */
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

/** Per-user cap on stored receipt bytes (one database disk is shared by every user). */
export const RECEIPT_QUOTA_BYTES = 50 * 1024 * 1024;

export async function receiptBytesUsed(userId: Types.ObjectId): Promise<number> {
  const [row] = await Receipt.aggregate<{ total: number }>([{ $match: { userId } }, { $group: { _id: null, total: { $sum: "$size" } } }]);
  return row?.total ?? 0;
}

/**
 * Delete receipts that no expense points at (uploaded then abandoned, or removed from
 * an expense), once they're older than `graceMs` so an in-progress form isn't robbed.
 * Receipts of soft-deleted expenses are kept so "Undo" restores them.
 */
export async function pruneOrphanReceipts(now: Date = new Date(), graceMs = 24 * 60 * 60 * 1000, batch = 500): Promise<number> {
  const { Expense } = await import("@/models/expense");
  const candidates = await Receipt.find({ createdAt: { $lt: new Date(now.getTime() - graceMs) } }, { _id: 1, contentType: 1 }).limit(batch).lean();
  if (candidates.length === 0) return 0;
  const urlOf = (r: { _id: Types.ObjectId; contentType: string }) => `/api/receipts/${r._id.toHexString()}.${RECEIPT_TYPES[r.contentType] ?? "bin"}`;
  const referenced = new Set<string>(await Expense.distinct("receiptUrl", { receiptUrl: { $in: candidates.map(urlOf) } }));
  const orphans = candidates.filter((r) => !referenced.has(urlOf(r))).map((r) => r._id);
  if (orphans.length) await Receipt.deleteMany({ _id: { $in: orphans } });
  return orphans.length;
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
