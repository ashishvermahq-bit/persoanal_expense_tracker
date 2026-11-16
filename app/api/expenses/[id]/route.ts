import { ok, parseBody, withAuth } from "@/lib/api";
import { deleteExpense, getExpense, updateExpense } from "@/lib/services/expenses";
import { updateExpenseSchema } from "@/lib/validation/expense";

type Ctx = RouteContext<"/api/expenses/[id]">;

export const GET = withAuth<Ctx>(async (_request, ctx, { userId }) => {
  const { id } = await ctx.params;
  return ok(await getExpense(userId, id));
});

export const PATCH = withAuth<Ctx>(async (request, ctx, { userId }) => {
  const { id } = await ctx.params;
  const input = await parseBody(request, updateExpenseSchema);
  return ok(await updateExpense(userId, id, input));
});

export const DELETE = withAuth<Ctx>(async (_request, ctx, { userId }) => {
  const { id } = await ctx.params;
  await deleteExpense(userId, id);
  return ok({ deleted: true });
});
