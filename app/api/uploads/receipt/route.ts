import { ApiError, ok, withAuth } from "@/lib/api";
import { putReceipt, RECEIPT_MAX_BYTES, RECEIPT_TYPES, sniffReceiptType } from "@/lib/storage";

/** multipart/form-data with a single `file` field → `{ url }`. */
export const POST = withAuth(async (request, _ctx, { userId }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError("VALIDATION", "Expected multipart form data");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError("VALIDATION", "Attach a file", { file: "Attach a file" });
  if (file.size > RECEIPT_MAX_BYTES) {
    throw new ApiError("VALIDATION", "Receipt must be 4 MB or smaller", { file: "File is too large (max 4 MB)" });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Trust the bytes, not the client's Content-Type.
  const type = sniffReceiptType(bytes);
  if (!type || !RECEIPT_TYPES[type]) {
    throw new ApiError("VALIDATION", "Only JPG, PNG, WebP or PDF receipts are supported", { file: "Unsupported file type" });
  }
  const stored = await putReceipt(userId, { bytes, contentType: type });
  return ok({ url: stored.url }, { status: 201 });
});
