import { ok, parseBody, withAuth } from "@/lib/api";
import { deleteIncome, updateIncome } from "@/lib/services/income";
import { updateIncomeSchema } from "@/lib/validation/income";

type Ctx = RouteContext<"/api/income/[id]">;

export const PATCH = withAuth<Ctx>(async (request, ctx, { userId }) => {
  const { id } = await ctx.params;
  const input = await parseBody(request, updateIncomeSchema);
  return ok(await updateIncome(userId, id, input));
});

export const DELETE = withAuth<Ctx>(async (_request, ctx, { userId }) => {
  const { id } = await ctx.params;
  await deleteIncome(userId, id);
  return ok({ deleted: true });
});
