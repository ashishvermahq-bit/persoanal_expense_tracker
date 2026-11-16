import "server-only";
import { cache } from "react";
import { Types } from "mongoose";
import { currentYearMonthIST, daysInMonth, formatMonthLabel, fyLabel, fyMonths, fyRange, fyStartYear, istMidnight, istParts, monthRange, previousMonth, todayIST } from "@/lib/dates";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";
import type { MonthlySummaryDTO, TrendPeriodDTO, UpcomingDTO } from "@/types/dto";
import type { FyStart, PaymentMethod } from "@/types/models";
import { listBudgetsWithSpend } from "./budgets";
import { listCategories } from "./categories";
import { getPreferences } from "./preferences";
import { getUpcomingRecurring } from "./recurring";
import { toSummaryDTO } from "./serialize";
import { getOrComputeSummary } from "@/lib/summary/recompute";

const DAY_MS = 86_400_000;

/**
 * Everything the dashboard's glance sections share, loaded once per request.
 * React cache() dedupes across the separate <Suspense> sections; keyed by the
 * user id string because each requireUserId() returns a new ObjectId.
 */
export const loadGlance = cache(async (userIdHex: string) => {
  const userId = new Types.ObjectId(userIdHex);
  const ym = currentYearMonthIST();
  const prevYm = previousMonth(ym);
  const today = istParts(todayIST());
  const [current, previous, budgets, categories] = await Promise.all([
    getOrComputeSummary(userId, ym).then(toSummaryDTO),
    getOrComputeSummary(userId, prevYm).then(toSummaryDTO),
    listBudgetsWithSpend(userId, ym.year, ym.month),
    listCategories(userId, { includeArchived: true }),
  ]);
  return {
    today,
    ym,
    prevYm,
    daysInMonth: daysInMonth(ym.year, ym.month),
    previousDays: daysInMonth(prevYm.year, prevYm.month),
    monthLabel: formatMonthLabel(ym),
    previousLabel: formatMonthLabel(prevYm).split(" ")[0] ?? "last month",
    current,
    previous,
    budgets,
    /** id → icon/colour, for showing each category's colour wherever it appears. */
    categoryLook: Object.fromEntries(categories.map((c) => [c.id, { icon: c.icon, color: c.color }])) as Record<string, { icon: string | null; color: string | null }>,
  };
});

/** Active recurring payments due in the next `days` days, soonest first. */
export async function listUpcoming(userId: Types.ObjectId, limit = 3, days = 30): Promise<UpcomingDTO[]> {
  const rules = (await getUpcomingRecurring(userId, days)).slice(0, limit);
  const todayMs = todayIST().getTime();
  const catIds = rules.map((r) => r.categoryId).filter((id): id is Types.ObjectId => !!id);
  const cats = catIds.length ? await Category.find({ _id: { $in: catIds } }, { icon: 1, color: 1 }).lean() : [];
  const look = new Map(cats.map((c) => [c._id.toHexString(), c]));
  return rules.map((r) => {
    const cat = r.categoryId ? look.get(r.categoryId.toHexString()) : undefined;
    const { year, month, day } = istParts(r.nextRunAt);
    return {
      id: r._id.toHexString(),
      title: r.title,
      kind: r.kind,
      amountPaise: r.amountPaise,
      nextRunAt: r.nextRunAt.toISOString(),
      dueInDays: Math.max(0, Math.round((istMidnight(year, month, day).getTime() - todayMs) / DAY_MS)),
      categoryIcon: cat?.icon ?? null,
      categoryColor: cat?.color ?? null,
    };
  });
}

interface RangeAgg {
  series: { _id: string; totalPaise: number }[];
  byCategory: { _id: Types.ObjectId; totalPaise: number; count: number }[];
  byPaymentMethod: { _id: PaymentMethod; totalPaise: number; count: number }[];
}

/** One aggregation per period: series buckets (IST day or month), by category, by payment mode. */
async function aggregateRange(userId: Types.ObjectId, start: Date, end: Date, bucket: "day" | "month"): Promise<RangeAgg> {
  const [res] = await Expense.aggregate<RangeAgg>([
    { $match: { userId, deletedAt: null, date: { $gte: start, $lt: end } } },
    {
      $facet: {
        series: [
          { $group: { _id: { $dateToString: { date: "$date", format: bucket === "day" ? "%Y-%m-%d" : "%Y-%m", timezone: "Asia/Kolkata" } }, totalPaise: { $sum: "$amountPaise" } } },
        ],
        byCategory: [{ $group: { _id: "$categoryId", totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } }],
        byPaymentMethod: [{ $group: { _id: "$paymentMethod", totalPaise: { $sum: "$amountPaise" }, count: { $sum: 1 } } }],
      },
    },
  ]);
  return res ?? { series: [], byCategory: [], byPaymentMethod: [] };
}

const pad = (n: number) => String(n).padStart(2, "0");
const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
const MONTH_SHORT = new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "Asia/Kolkata" });

/** Week (last 7 days incl. today), this month (daily), this FY (monthly). */
export async function loadTrends(userId: Types.ObjectId): Promise<TrendPeriodDTO[]> {
  const prefs = await getPreferences(userId);
  const fyStart: FyStart = prefs.fyStart;
  const today = todayIST();
  const t = istParts(today);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const weekStart = new Date(today.getTime() - 6 * DAY_MS);
  const month = monthRange(t.year, t.month);
  const fyYear = fyStartYear(today, fyStart);
  const fy = fyRange(fyYear, fyStart);

  const [week, mon, year] = await Promise.all([
    aggregateRange(userId, weekStart, tomorrow, "day"),
    aggregateRange(userId, month.start, month.end, "day"),
    aggregateRange(userId, fy.start, fy.end, "month"),
  ]);

  const catIds = [...new Set([...week.byCategory, ...mon.byCategory, ...year.byCategory].map((c) => c._id.toHexString()))];
  const cats = await Category.find({ _id: { $in: catIds.map((id) => new Types.ObjectId(id)) } }, { name: 1, color: 1 }).lean();
  const catById = new Map(cats.map((c) => [c._id.toHexString(), c]));

  const finish = (key: TrendPeriodDTO["key"], label: string, agg: RangeAgg, buckets: { key: string; label: string }[]): TrendPeriodDTO => {
    const byKey = new Map(agg.series.map((s) => [s._id, s.totalPaise]));
    const series = buckets.map((b) => ({ ...b, totalPaise: byKey.get(b.key) ?? 0 }));
    return {
      key,
      label,
      totalPaise: series.reduce((s, b) => s + b.totalPaise, 0),
      series,
      byCategory: agg.byCategory.map((c) => {
        const cat = catById.get(c._id.toHexString());
        return { key: c._id.toHexString(), name: cat?.name ?? "Unknown", color: cat?.color ?? null, totalPaise: c.totalPaise, count: c.count };
      }),
      byPaymentMethod: agg.byPaymentMethod.map((m) => ({ key: m._id, name: PAYMENT_METHOD_LABELS[m._id] ?? m._id, totalPaise: m.totalPaise, count: m.count })),
    };
  };

  const weekBuckets = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * DAY_MS);
    const p = istParts(d);
    return { key: `${p.year}-${pad(p.month)}-${pad(p.day)}`, label: i === 6 ? "Today" : WEEKDAY.format(d) };
  });
  const monthBuckets = Array.from({ length: daysInMonth(t.year, t.month) }, (_, i) => ({ key: `${t.year}-${pad(t.month)}-${pad(i + 1)}`, label: String(i + 1) }));
  const fyBuckets = fyMonths(fyYear, fyStart).map((m) => ({ key: `${m.year}-${pad(m.month)}`, label: MONTH_SHORT.format(istMidnight(m.year, m.month, 15)) }));

  return [
    finish("week", "Last 7 days", week, weekBuckets),
    finish("month", formatMonthLabel({ year: t.year, month: t.month }), mon, monthBuckets),
    finish("fy", fyLabel(fyYear, fyStart), year, fyBuckets),
  ];
}

export type Glance = Awaited<ReturnType<typeof loadGlance>>;
export type { MonthlySummaryDTO };
