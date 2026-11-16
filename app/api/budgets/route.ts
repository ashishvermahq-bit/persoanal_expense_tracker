import { z } from "zod";
import { ok, parseBody, parseWith, withAuth } from "@/lib/api";
import { currentYearMonthIST } from "@/lib/dates";
import { createBudgetSchema } from "@/lib/validation/budget";
import { upsertBudget, listBudgetsWithSpend } from "@/lib/services/budgets";
import { searchParamsToObject } from "@/lib/query";

const monthQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

export const GET = withAuth(async (request, _context, { userId }) => {
  const q = parseWith(monthQuery, searchParamsToObject(new URL(request.url).searchParams));
  const now = currentYearMonthIST();
  return ok(await listBudgetsWithSpend(userId, q.year ?? now.year, q.month ?? now.month));
});

export const POST = withAuth(async (request, _context, { userId }) => {
  const data = await parseBody(request, createBudgetSchema);
  return ok(await upsertBudget(userId, data), { status: 201 });
});
