import { ApiError, fail, withAuth } from "@/lib/api";
import { getReceipt, receiptBytes } from "@/lib/storage";

type Ctx = RouteContext<"/api/receipts/[file]">;

/** The signed-in owner's receipt file. Anyone else (or a bad id) gets a 404. */
export const GET = withAuth<Ctx>(async (_request, ctx, { userId }) => {
  const receipt = await getReceipt(userId, (await ctx.params).file);
  if (!receipt) return fail(new ApiError("NOT_FOUND", "Receipt not found"));
  return new Response(receiptBytes(receipt.data), {
    headers: {
      "Content-Type": receipt.contentType,
      "Content-Length": String(receipt.size),
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
