import { ApiError, ok, withAuth } from "@/lib/api";
import { IMPORT_MAX_BYTES, importTransactions, parseCSV } from "@/lib/services/bank-import";
import { objectIdSchema } from "@/lib/validation/common";

/** multipart/form-data: `file` (CSV statement) + `categoryId`. */
export const POST = withAuth(async (request, _ctx, { userId }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError("VALIDATION", "Expected multipart form data");
  }
  const file = form.get("file");
  const categoryId = objectIdSchema.safeParse(form.get("categoryId"));
  if (!(file instanceof File)) throw new ApiError("VALIDATION", "Attach a CSV file", { file: "Attach a CSV file" });
  if (!categoryId.success) throw new ApiError("VALIDATION", "Choose a category", { categoryId: "Choose a category" });
  if (file.size > IMPORT_MAX_BYTES) throw new ApiError("VALIDATION", "Statement must be 1 MB or smaller", { file: "File is too large (max 1 MB)" });

  const transactions = parseCSV(await file.text());
  if (transactions.length === 0) throw new ApiError("VALIDATION", "No transactions found in CSV", { file: "No transactions found" });

  return ok(await importTransactions(userId, transactions, categoryId.data));
});
