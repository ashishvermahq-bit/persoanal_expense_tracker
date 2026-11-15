import { Types } from "mongoose";
import { ApiError, ok, parseBody, withAuth } from "@/lib/api";
import { updateBudgetSchema } from "@/lib/validation/budget";
import { deleteBudget, upsertBudget } from "@/lib/services/budgets";
import { Budget } from "@/models/budget";

type Ctx = RouteContext<"/api/budgets/[id]">;

export const PATCH = withAuth<Ctx>(async (request, ctx, { userId }) => {
  const { id } = await ctx.params;
  const data = await parseBody(request, updateBudgetSchema);

  // Verify budget belongs to user
  const budgetObjectId = new Types.ObjectId(id as string);
  const budget = await Budget.findOne({ _id: budgetObjectId, userId }).lean();
  if (!budget) {
    throw new ApiError("NOT_FOUND", "Budget not found");
  }

  // Update with new values (keep existing values not in update)
  const updated = await upsertBudget(userId, {
    categoryId: data.categoryId ?? budget.categoryId.toString(),
    amountPaise: data.amountPaise ?? budget.amountPaise,
    year: data.year !== undefined ? data.year : budget.year,
    month: data.month !== undefined ? data.month : budget.month,
  });

  return ok(updated);
});

export const DELETE = withAuth<Ctx>(async (_request, ctx, { userId }) => {
  const { id } = await ctx.params;

  // Verify budget belongs to user
  const budgetObjectId = new Types.ObjectId(id as string);
  const budget = await Budget.findOne({ _id: budgetObjectId, userId }).lean();
  if (!budget) {
    throw new ApiError("NOT_FOUND", "Budget not found");
  }

  await deleteBudget(userId, id as string);
  return ok({});
});
