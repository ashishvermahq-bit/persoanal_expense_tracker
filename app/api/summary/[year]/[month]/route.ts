import { ApiError, ok, withAuth } from "@/lib/api";
import { toSummaryDTO } from "@/lib/services/serialize";
import { getOrComputeSummary, recomputeMonthlySummary } from "@/lib/summary/recompute";

type Ctx = RouteContext<"/api/summary/[year]/[month]">;

export const GET = withAuth<Ctx>(async (request, ctx, { userId }) => {
  const p = await ctx.params;
  const year = Number(p.year);
  const month = Number(p.month);
  if (!Number.isInteger(year) || year < 2000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new ApiError("NOT_FOUND", "Invalid month");
  }
  const force = new URL(request.url).searchParams.get("recompute") === "1";
  const summary = force ? await recomputeMonthlySummary(userId, { year, month }) : await getOrComputeSummary(userId, { year, month });
  return ok(toSummaryDTO(summary));
});
