import { ok, withAuth } from "@/lib/api";
import { restoreExpense } from "@/lib/services/expenses";

type Ctx = RouteContext<"/api/expenses/[id]/restore">;

/** POST: undo a soft delete. */
export const POST = withAuth<Ctx>(async (_request, ctx, { userId }) => {
  const { id } = await ctx.params;
  return ok(await restoreExpense(userId, id));
});
