import type { Types } from "mongoose";
import { IST_TIMEZONE, monthRange, nextMonth, previousMonth, yearMonthOf, type YearMonth } from "@/lib/dates";
import { Expense } from "@/models/expense";
import { Income } from "@/models/income";
import { MonthlySummary } from "@/models/monthly-summary";
import type { IMonthlySummary, PaymentMethod, TaxSection } from "@/types/models";

interface Facets {
  totals: { totalPaise: number; count: number; largest: number }[];
  byCategory: { _id: Types.ObjectId; totalPaise: number; count: number; name: string }[];
  byPaymentMethod: { _id: PaymentMethod; totalPaise: number; count: number }[];
  byTaxSection: { _id: TaxSection; totalPaise: number; count: number }[];
  daily: { _id: number; totalPaise: number }[];
}

/**
 * Rebuild the cached summary for one (user, month) from scratch with a single
 * faceted aggregation, then refresh the *next* month's month-over-month delta
 * (it depends on this month's total).
 */
export async function recomputeMonthlySummary(userId: Types.ObjectId, ym: YearMonth): Promise<IMonthlySummary> {
  const { start, end } = monthRange(ym.year, ym.month);
  const match = { userId, deletedAt: null, date: { $gte: start, $lt: end } };

  const [facets] = await Expense.aggregate<Facets>([
    { $match: match },
    {
      $facet: {
        totals: [{ $group: { _id: null, totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 }, largest: { $max: "$amountPaise" } } }],
        byCategory: [
          { $group: { _id: "$categoryId", totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
          { $lookup: { from: "categories", localField: "_id", foreignField: "_id", as: "cat" } },
          { $addFields: { name: { $ifNull: [{ $first: "$cat.name" }, "Unknown"] } } },
          { $project: { cat: 0 } },
          { $sort: { totalPaise: -1 } },
        ],
        byPaymentMethod: [
          { $group: { _id: "$paymentMethod", totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
          { $sort: { totalPaise: -1 } },
        ],
        byTaxSection: [
          { $match: { taxSection: { $ne: "none" } } },
          { $group: { _id: "$taxSection", totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } },
        ],
        daily: [
          { $group: { _id: { $dayOfMonth: { date: "$date", timezone: IST_TIMEZONE } }, totalPaise: { $sum: "$amountPaise" } } },
        ],
      },
    },
  ]);

  const [incomeAgg] = await Income.aggregate<{ totalPaise: number }>([
    { $match: match },
    { $group: { _id: null, totalPaise: { $sum: "$amountPaise" } } },
  ]);

  const totals = facets.totals[0] ?? { totalPaise: 0, count: 0, largest: 0 };
  const totalIncomePaise = incomeAgg?.totalPaise ?? 0;
  const savingsPaise = totalIncomePaise - totals.totalPaise;

  const dailyTotalsPaise = new Array<number>(31).fill(0);
  for (const d of facets.daily) if (d._id >= 1 && d._id <= 31) dailyTotalsPaise[d._id - 1] = d.totalPaise;

  const prev = await MonthlySummary.findOne({ userId, ...previousMonth(ym) }, { totalExpensePaise: 1 }).lean();

  const doc = await MonthlySummary.findOneAndUpdate(
    { userId, year: ym.year, month: ym.month },
    {
      $set: {
        totalExpensePaise: totals.totalPaise,
        totalIncomePaise,
        savingsPaise,
        savingsRate: totalIncomePaise > 0 ? Math.round((savingsPaise / totalIncomePaise) * 10000) / 10000 : null,
        expenseCount: totals.count,
        largestExpensePaise: totals.largest ?? 0,
        averageExpensePaise: totals.count ? Math.round(totals.totalPaise / totals.count) : 0,
        byCategory: facets.byCategory.map((c) => ({ categoryId: c._id, name: c.name, totalPaise: c.totalPaise, count: c.count })),
        byPaymentMethod: facets.byPaymentMethod.map((p) => ({ paymentMethod: p._id, totalPaise: p.totalPaise, count: p.count })),
        byTaxSection: facets.byTaxSection.map((t) => ({ taxSection: t._id, totalPaise: t.totalPaise, count: t.count })),
        dailyTotalsPaise,
        changeFromPreviousMonth: deltaFraction(totals.totalPaise, prev?.totalExpensePaise),
        lastCalculatedAt: new Date(),
      },
    },
    { upsert: true, returnDocument: "after", lean: true }
  );

  // Keep the following month's delta consistent without a full rebuild.
  const next = nextMonth(ym);
  await MonthlySummary.updateOne(
    { userId, year: next.year, month: next.month },
    [{ $set: { changeFromPreviousMonth: deltaExpr(totals.totalPaise) } }],
    { updatePipeline: true }
  );

  return doc!;
}

/** Recompute every distinct month touched by the given dates. */
export async function recomputeForDates(userId: Types.ObjectId, dates: Date[]): Promise<void> {
  const seen = new Map<string, YearMonth>();
  for (const d of dates) {
    const ym = yearMonthOf(d);
    seen.set(`${ym.year}-${ym.month}`, ym);
  }
  for (const ym of seen.values()) await recomputeMonthlySummary(userId, ym);
}

/** Fetch the cached summary, computing it if it doesn't exist yet. */
export async function getOrComputeSummary(userId: Types.ObjectId, ym: YearMonth): Promise<IMonthlySummary> {
  const existing = await MonthlySummary.findOne({ userId, year: ym.year, month: ym.month }).lean();
  return existing ?? recomputeMonthlySummary(userId, ym);
}

function deltaFraction(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 10000) / 10000;
}

/** Aggregation-expression version of deltaFraction for the in-place update of the next month. */
function deltaExpr(previousTotal: number) {
  if (previousTotal === 0) return null;
  return {
    $round: [{ $divide: [{ $subtract: ["$totalExpensePaise", previousTotal] }, previousTotal] }, 4],
  };
}
