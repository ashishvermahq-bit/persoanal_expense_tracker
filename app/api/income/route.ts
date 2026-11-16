import { ok, parseBody, parseWith, withAuth } from "@/lib/api";
import { searchParamsToObject } from "@/lib/query";
import { createIncome, listIncome } from "@/lib/services/income";
import { createIncomeSchema, incomeFiltersSchema } from "@/lib/validation/income";

export const GET = withAuth(async (request, _ctx, { userId }) => {
  const filters = parseWith(incomeFiltersSchema, searchParamsToObject(new URL(request.url).searchParams));
  return ok(await listIncome(userId, filters));
});

export const POST = withAuth(async (request, _ctx, { userId }) => {
  const input = await parseBody(request, createIncomeSchema);
  return ok(await createIncome(userId, input), { status: 201 });
});
