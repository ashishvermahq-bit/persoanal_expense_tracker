import { ok, parseBody, parseWith, withAuth } from "@/lib/api";
import { searchParamsToObject } from "@/lib/query";
import { createExpense, listExpenses } from "@/lib/services/expenses";
import { createExpenseSchema, expenseFiltersSchema } from "@/lib/validation/expense";

export const GET = withAuth(async (request, _ctx, { userId }) => {
  const filters = parseWith(expenseFiltersSchema, searchParamsToObject(new URL(request.url).searchParams));
  return ok(await listExpenses(userId, filters));
});

export const POST = withAuth(async (request, _ctx, { userId }) => {
  const input = await parseBody(request, createExpenseSchema);
  return ok(await createExpense(userId, input), { status: 201 });
});
