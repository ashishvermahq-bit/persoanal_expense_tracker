import { withAuth, ok } from "@/lib/api";
import { parseCSV, importTransactions } from "@/lib/services/bank-import";

export const POST = withAuth(async (request, _ctx, { userId }) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const categoryId = formData.get("categoryId") as string;

  if (!file || !categoryId) {
    return new Response(
      JSON.stringify({ error: { code: "VALIDATION", message: "Missing file or categoryId" } }),
      { status: 400 }
    );
  }

  try {
    const csv = await file.text();
    const transactions = parseCSV(csv);

    if (transactions.length === 0) {
      return new Response(
        JSON.stringify({ error: { code: "VALIDATION", message: "No transactions found in CSV" } }),
        { status: 400 }
      );
    }

    const result = await importTransactions(userId, transactions, categoryId);
    return ok(result);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: { code: "INTERNAL", message: "Import failed" } }),
      { status: 500 }
    );
  }
});
