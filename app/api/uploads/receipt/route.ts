import { ApiError, ok, withAuth } from "@/lib/api";
import { RECEIPT_MAX_BYTES, RECEIPT_TYPES, storage } from "@/lib/storage";

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
  if (!RECEIPT_TYPES[file.type]) {
    throw new ApiError("VALIDATION", "Only JPG, PNG, WebP or PDF receipts are supported", { file: "Unsupported file type" });
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    throw new ApiError("VALIDATION", "Receipt must be 5 MB or smaller", { file: "File is too large (max 5 MB)" });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storage().put(userId.toHexString(), { bytes, contentType: file.type });
  return ok({ url: stored.url }, { status: 201 });
});
