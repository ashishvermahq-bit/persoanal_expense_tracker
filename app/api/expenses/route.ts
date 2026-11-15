import { ok, parseBody, parseWith, withAuth } from "@/lib/api";
import { searchParamsToObject } from "@/lib/query";
import { createExpense, listExpenses } from "@/lib/services/expenses";
import { createExpenseSchema, expenseFiltersSchema } from "@/lib/validation/expense";
import { getBudgetForCategory } from "@/lib/services/budgets";
import { yearMonthOf } from "@/lib/dates";

export const GET = withAuth(async (request, _ctx, { userId }) => {
  const url = new URL(request.url);
  const filters = parseWith(expenseFiltersSchema, searchParamsToObject(url.searchParams));
  return ok(await listExpenses(userId, filters));
});

export const POST = withAuth(async (request, _ctx, { userId }) => {
  const input = await parseBody(request, createExpenseSchema);
  const expense = await createExpense(userId, input);

  // Check for budget warning
  // The month the expense is dated in (a backdated entry counts against that month's budget).
  const { year, month } = yearMonthOf(input.date);
  const budget = await getBudgetForCategory(userId.toString(), input.categoryId, year, month);

  type BudgetWarningType = { status: "warning" | "over"; categoryId: string; categoryName: string; budgetPaise: number; spendPaise: number; message: string };
  let budgetWarning: BudgetWarningType | undefined;
  if (budget && budget.status !== "ok") {
    const over = Math.max(0, budget.spendPaise - budget.amountPaise);
    budgetWarning = {
      status: budget.status,
      categoryId: budget.categoryId,
      categoryName: budget.categoryName,
      budgetPaise: budget.amountPaise,
      spendPaise: budget.spendPaise,
      message:
        budget.status === "over"
          ? `Exceeded by ₹${(over / 100).toLocaleString("en-IN")}`
          : `${Math.round((budget.spendPaise / budget.amountPaise) * 100)}% of budget used`,
    };
  }

  return ok({ ...expense, budgetWarning }, { status: 201 });
});
