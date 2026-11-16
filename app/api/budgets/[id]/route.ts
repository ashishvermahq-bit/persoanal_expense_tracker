import { ApiError, idParam, ok, parseBody, withAuth } from "@/lib/api";
import { updateBudgetSchema } from "@/lib/validation/budget";
import { deleteBudget, upsertBudget } from "@/lib/services/budgets";
import { Budget } from "@/models/budget";

type Ctx = RouteContext<"/api/budgets/[id]">;

export const PATCH = withAuth<Ctx>(async (request, ctx, { userId }) => {
  const _id = idParam((await ctx.params).id, "Budget not found");
  const data = await parseBody(request, updateBudgetSchema);

  // Only the owner's budget.
  const budget = await Budget.findOne({ _id, userId }).lean();
  if (!budget) throw new ApiError("NOT_FOUND", "Budget not found");

  // Keep existing values not in the update. upsertBudget re-checks the category.
  const updated = await upsertBudget(userId, {
    categoryId: data.categoryId ?? budget.categoryId.toString(),
    amountPaise: data.amountPaise ?? budget.amountPaise,
    year: data.year !== undefined ? data.year : budget.year,
    month: data.month !== undefined ? data.month : budget.month,
  });

  return ok(updated);
});

export const DELETE = withAuth<Ctx>(async (_request, ctx, { userId }) => {
  const _id = idParam((await ctx.params).id, "Budget not found");
  const budget = await Budget.findOne({ _id, userId }).lean();
  if (!budget) throw new ApiError("NOT_FOUND", "Budget not found");
  await deleteBudget(userId, _id.toHexString());
  return ok({});
});
