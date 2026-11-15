/**
 * Dashboard "glance" maths. Pure functions over MonthlySummary + budgets only,
 * so every number shown is computed, never invented, and unit-testable.
 */
import { formatPaise } from "@/lib/money";
import type { MonthlySummaryDTO } from "@/types/dto";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";

export interface BudgetLike {
  categoryId: string;
  categoryName: string;
  amountPaise: number;
  spendPaise: number;
  status: "ok" | "warning" | "over";
}

export interface GlanceInput {
  /** Today in IST. */
  today: { year: number; month: number; day: number };
  daysInMonth: number;
  /** Days in the previous month. */
  previousDays: number;
  /** Short previous-month name, e.g. "Oct". */
  previousLabel: string;
  current: MonthlySummaryDTO;
  previous: MonthlySummaryDTO;
  budgets: BudgetLike[];
}

export type Pace = { pct: number; direction: "less" | "more"; vsLabel: string } | null;

export type SafeToSpend =
  | { kind: "no-budgets" }
  | { kind: "ok"; perDayPaise: number; remainingPaise: number; daysLeft: number }
  | { kind: "over"; overPaise: number };

/** Month-to-date vs the same point last month (fair: day 5 vs days 1–5, not vs all of October). */
export function spendingPace({ today, previousDays, previousLabel, current, previous }: GlanceInput): Pace {
  const upTo = Math.min(today.day, previousDays);
  const prevToDate = previous.dailyTotalsPaise.slice(0, upTo).reduce((s, v) => s + v, 0);
  if (prevToDate <= 0) return null;
  const change = (current.totalExpensePaise - prevToDate) / prevToDate;
  const pct = Math.round(Math.abs(change) * 100);
  if (pct === 0) return null;
  return { pct, direction: change < 0 ? "less" : "more", vsLabel: previousLabel };
}

/**
 * What's left across budgeted categories, spread over the remaining days
 * (today included). Whole rupees, rounded down, so it never overstates.
 */
export function safeToSpend({ today, daysInMonth, budgets }: GlanceInput): SafeToSpend {
  if (budgets.length === 0) return { kind: "no-budgets" };
  const limit = budgets.reduce((s, b) => s + b.amountPaise, 0);
  const spent = budgets.reduce((s, b) => s + b.spendPaise, 0);
  const remaining = limit - spent;
  if (remaining <= 0) return { kind: "over", overPaise: -remaining };
  const daysLeft = Math.max(1, daysInMonth - today.day + 1);
  const perDayPaise = Math.floor(remaining / daysLeft / 100) * 100;
  return { kind: "ok", perDayPaise, remainingPaise: remaining, daysLeft };
}

export type InsightTone = "neutral" | "good" | "warning" | "danger";
export type InsightIcon = "budget" | "trend-down" | "trend-up" | "biggest" | "check" | "piggy" | "upi" | "tax";

export interface Insight {
  id: string;
  text: string;
  href: string;
  tone: InsightTone;
  icon: InsightIcon;
  /** When the insight is about one category, so the UI can show its colour. */
  categoryId?: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** /expenses query for the whole current month (the filter's `to` is inclusive). */
export function monthQuery(today: GlanceInput["today"], daysInMonth: number, extra: Record<string, string> = {}): string {
  const sp = new URLSearchParams({
    from: `${today.year}-${pad(today.month)}-01`,
    to: `${today.year}-${pad(today.month)}-${pad(daysInMonth)}`,
    ...extra,
  });
  return `/expenses?${sp.toString()}`;
}

/** Up to 5 short, true insights, most actionable first. */
export function computeInsights(input: GlanceInput, max = 5): Insight[] {
  const { current, budgets, today, daysInMonth } = input;
  const out: Insight[] = [];

  const over = budgets.filter((b) => b.status === "over").length;
  const near = budgets.filter((b) => b.status === "warning").length;
  if (over > 0) out.push({ id: "budgets-over", text: `${over} ${over === 1 ? "budget" : "budgets"} over limit`, href: "/budgets", tone: "danger", icon: "budget" });
  if (near > 0) out.push({ id: "budgets-near", text: `${near} ${near === 1 ? "budget" : "budgets"} near limit`, href: "/budgets", tone: "warning", icon: "budget" });

  // (Spending pace is shown on the hero card, so it isn't repeated as a chip.)

  const biggest = [...current.byCategory].sort((a, b) => b.totalPaise - a.totalPaise)[0];
  if (biggest) {
    out.push({
      id: "biggest",
      text: `Biggest: ${formatPaise(biggest.totalPaise)} ${biggest.name}`,
      href: monthQuery(today, daysInMonth, { categoryId: biggest.categoryId }),
      tone: "neutral",
      icon: "biggest",
      categoryId: biggest.categoryId,
    });
  }

  const rent = current.byCategory.find((c) => c.name.toLowerCase() === "rent");
  if (rent) out.push({ id: "rent", text: "Rent paid", href: monthQuery(today, daysInMonth, { categoryId: rent.categoryId }), tone: "good", icon: "check", categoryId: rent.categoryId });

  if (current.totalIncomePaise > 0 && current.savingsRate !== null && current.savingsPaise > 0) {
    out.push({ id: "saved", text: `Saved ${Math.round(current.savingsRate * 100)}% of income`, href: "/income", tone: "good", icon: "piggy" });
  }

  const modes = [...current.byPaymentMethod].sort((a, b) => b.totalPaise - a.totalPaise);
  if (modes.length > 1 && current.totalExpensePaise > 0) {
    const top = modes[0]!;
    const share = Math.round((top.totalPaise / current.totalExpensePaise) * 100);
    out.push({
      id: "mode",
      text: `${PAYMENT_METHOD_LABELS[top.paymentMethod]}: ${share}% of spend`,
      href: monthQuery(today, daysInMonth, { paymentMethod: top.paymentMethod }),
      tone: "neutral",
      icon: "upi",
    });
  }

  const tax80c = current.byTaxSection.find((t) => t.taxSection === "80C");
  if (tax80c && tax80c.totalPaise > 0) {
    out.push({ id: "80c", text: `${formatPaise(tax80c.totalPaise)} tagged 80C`, href: monthQuery(today, daysInMonth, { taxSection: "80C" }), tone: "neutral", icon: "tax" });
  }

  return out.slice(0, max);
}
