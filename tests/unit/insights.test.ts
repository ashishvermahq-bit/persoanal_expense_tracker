import { describe, expect, it } from "vitest";
import { computeInsights, monthQuery, safeToSpend, spendingPace, type GlanceInput } from "@/lib/insights";
import type { MonthlySummaryDTO } from "@/types/dto";

const RENT = "a".repeat(24);
const FOOD = "b".repeat(24);

function summary(over: Partial<MonthlySummaryDTO> = {}): MonthlySummaryDTO {
  return {
    year: 2026,
    month: 11,
    totalExpensePaise: 0,
    totalIncomePaise: 0,
    savingsPaise: 0,
    savingsRate: null,
    expenseCount: 0,
    largestExpensePaise: 0,
    averageExpensePaise: 0,
    byCategory: [],
    byPaymentMethod: [],
    byTaxSection: [],
    dailyTotalsPaise: Array(31).fill(0),
    changeFromPreviousMonth: null,
    lastCalculatedAt: new Date(0).toISOString(),
    ...over,
  };
}

function input(over: Partial<GlanceInput> = {}): GlanceInput {
  return {
    today: { year: 2026, month: 11, day: 15 },
    daysInMonth: 30,
    previousDays: 31,
    previousLabel: "Oct",
    current: summary(),
    previous: summary({ month: 10 }),
    budgets: [],
    ...over,
  };
}

describe("spendingPace", () => {
  it("compares month-to-date with the same days of last month, not the whole month", () => {
    const prevDaily = Array(31).fill(0);
    prevDaily[0] = 10_000_00; // day 1
    prevDaily[20] = 90_000_00; // day 21: after "today", must be ignored
    const pace = spendingPace(input({ current: summary({ totalExpensePaise: 8_000_00 }), previous: summary({ dailyTotalsPaise: prevDaily }) }));
    expect(pace).toEqual({ pct: 20, direction: "less", vsLabel: "Oct" });
  });

  it("is null without last-month data", () => {
    expect(spendingPace(input({ current: summary({ totalExpensePaise: 500_00 }) }))).toBeNull();
  });
});

describe("safeToSpend", () => {
  it("spreads what's left of the budgets over the days left (today included), whole rupees", () => {
    const s = safeToSpend(input({ budgets: [{ categoryId: FOOD, categoryName: "Food", amountPaise: 10_000_00, spendPaise: 2_500_00, status: "ok" }] }));
    // ₹7,500 left over 16 days (15th..30th) = ₹468.75 → ₹468
    expect(s).toEqual({ kind: "ok", perDayPaise: 468_00, remainingPaise: 7_500_00, daysLeft: 16 });
  });

  it("reports the overspend when budgets are exhausted", () => {
    expect(safeToSpend(input({ budgets: [{ categoryId: FOOD, categoryName: "Food", amountPaise: 1_000_00, spendPaise: 1_200_00, status: "over" }] }))).toEqual({ kind: "over", overPaise: 200_00 });
  });

  it("says so when there are no budgets", () => {
    expect(safeToSpend(input())).toEqual({ kind: "no-budgets" });
  });
});

describe("computeInsights", () => {
  it("orders the actionable ones first and deep-links each", () => {
    const current = summary({
      totalExpensePaise: 20_000_00,
      byCategory: [
        { categoryId: FOOD, name: "Food & Dining", totalPaise: 2_000_00, count: 4 },
        { categoryId: RENT, name: "Rent", totalPaise: 18_000_00, count: 1 },
      ],
      byPaymentMethod: [
        { paymentMethod: "net_banking", totalPaise: 18_000_00, count: 1 },
        { paymentMethod: "upi", totalPaise: 2_000_00, count: 4 },
      ],
    });
    const budgets = [
      { categoryId: FOOD, categoryName: "Food", amountPaise: 2_400_00, spendPaise: 2_000_00, status: "warning" as const },
      { categoryId: RENT, categoryName: "Rent", amountPaise: 15_000_00, spendPaise: 18_000_00, status: "over" as const },
    ];
    const list = computeInsights(input({ current, budgets }));
    expect(list.map((i) => i.id)).toEqual(["budgets-over", "budgets-near", "biggest", "rent", "mode"]);
    expect(list.find((i) => i.id === "biggest")?.text).toBe("Biggest: ₹18,000 Rent");
    expect(list.find((i) => i.id === "biggest")?.href).toBe(`/expenses?from=2026-11-01&to=2026-11-30&categoryId=${RENT}`);
    expect(list.find((i) => i.id === "mode")?.text).toBe("Net banking: 90% of spend");
  });

  it("returns nothing for an empty month", () => {
    expect(computeInsights(input())).toEqual([]);
  });

  it("monthQuery covers the whole month inclusively", () => {
    expect(monthQuery({ year: 2026, month: 2, day: 3 }, 28)).toBe("/expenses?from=2026-02-01&to=2026-02-28");
  });
});
