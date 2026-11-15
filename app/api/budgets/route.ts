import { withAuth, ok } from "@/lib/api";
import { parseBody } from "@/lib/api";
import { currentYearMonthIST } from "@/lib/dates";
import { createBudgetSchema } from "@/lib/validation/budget";
import { upsertBudget, listBudgetsWithSpend } from "@/lib/services/budgets";
import { searchParamsToObject } from "@/lib/query";

export const GET = withAuth(async (request, _context, { userId }) => {
  const url = new URL(request.url);
  const params = searchParamsToObject(url.searchParams);

  // Default to current month if not provided
  let { year, month } = currentYearMonthIST();
  if (params.year) year = parseInt(params.year as string);
  if (params.month) month = parseInt(params.month as string);

  const budgets = await listBudgetsWithSpend(userId, year, month);
  return ok(budgets);
});

export const POST = withAuth(async (request, _context, { userId }) => {
  const data = await parseBody(request, createBudgetSchema);

  const budget = await upsertBudget(userId, {
    ...data,
    amountPaise: typeof data.amountPaise === "string" ? parseInt(data.amountPaise) : data.amountPaise,
  });

  return ok(budget, { status: 201 });
});
