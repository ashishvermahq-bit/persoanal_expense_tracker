import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Card } from "@/components/ui/page-header";
import { DailyTrendChart } from "@/components/dashboard/daily-trend-chart";
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart";
import { PaymentMethodChart } from "@/components/dashboard/payment-method-chart";
import { BudgetMeter } from "@/components/budgets/budget-meter";
import { getCurrentUser } from "@/lib/auth/current-user";
import { currentYearMonthIST, formatDateLong, formatMonthLabel, previousMonth, todayIST } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { listCategories } from "@/lib/services/categories";
import { listBudgetsWithSpend } from "@/lib/services/budgets";
import { requireUserId } from "@/lib/services/context";
import { toSummaryDTO } from "@/lib/services/serialize";
import { getOrComputeSummary } from "@/lib/summary/recompute";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
        <Greeting />
      </Suspense>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
        <StatCards />
      </Suspense>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
        <ChartSection />
      </Suspense>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
        <BudgetOverview />
      </Suspense>
    </div>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{formatDateLong(todayIST())}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50" data-testid="greeting">
          Namaste, {user?.name.split(" ")[0]}
        </h1>
      </div>
      <Link href="/add" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
        <Plus className="size-4" aria-hidden />
        Add expense
      </Link>
    </div>
  );
}

function Stat({ label, value, sub, tone = "default", testId }: { label: string; value: string; sub?: string; tone?: "default" | "good" | "bad" | "muted"; testId?: string }) {
  const color =
    tone === "good" ? "text-emerald-700 dark:text-emerald-400" : tone === "bad" ? "text-red-600 dark:text-red-400" : tone === "muted" ? "text-zinc-400" : "text-zinc-900 dark:text-zinc-50";
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums tracking-tight ${color}`} data-testid={testId}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{sub}</p>}
    </Card>
  );
}

async function StatCards() {
  const userId = await requireUserId();
  const ym = currentYearMonthIST();
  const summary = await getOrComputeSummary(userId, ym).then(toSummaryDTO);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat label={`Spent in ${formatMonthLabel(ym)}`} value={formatPaise(summary.totalExpensePaise)} sub={`${summary.expenseCount} ${summary.expenseCount === 1 ? "expense" : "expenses"}`} testId="month-spent" />
      <Stat label="Income" value={formatPaise(summary.totalIncomePaise)} sub={summary.totalIncomePaise ? undefined : "Add income to see savings"} />
      <Stat
        label="Saved"
        value={formatPaise(summary.savingsPaise)}
        sub={summary.savingsRate !== null ? `${Math.round(summary.savingsRate * 100)}% of income` : undefined}
        tone={summary.totalIncomePaise === 0 ? "muted" : summary.savingsPaise >= 0 ? "good" : "bad"}
      />
    </div>
  );
}

async function ChartSection() {
  const userId = await requireUserId();
  const ym = currentYearMonthIST();
  const prevYm = previousMonth(ym);
  const [current, prev, categories] = await Promise.all([
    getOrComputeSummary(userId, ym).then(toSummaryDTO),
    getOrComputeSummary(userId, prevYm).then(toSummaryDTO),
    listCategories(userId, { includeArchived: true }),
  ]);

  const catById = new Map(categories.map((c) => [c.id, c]));
  const topByCategory = current.byCategory.slice(0, 4);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Daily trend</h2>
        <DailyTrendChart currentMonth={current} previousMonth={prev} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Spending by category</h2>
          {current.byCategory.length === 0 ? (
            <p className="text-sm text-zinc-500">No expenses yet</p>
          ) : (
            <CategoryBreakdownChart summary={current} />
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Payment methods</h2>
          {current.byPaymentMethod.length === 0 ? (
            <p className="text-sm text-zinc-500">No expenses yet</p>
          ) : (
            <PaymentMethodChart summary={current} />
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Top categories this month</h2>
          <Link href="/expenses" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400">
            All expenses <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
        {topByCategory.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing yet this month.</p>
        ) : (
          <ul className="space-y-2.5">
            {topByCategory.map((c) => {
              const cat = catById.get(c.categoryId);
              const pct = current.totalExpensePaise ? Math.round((c.totalPaise / current.totalExpensePaise) * 100) : 0;
              return (
                <li key={c.categoryId} className="flex items-center gap-3">
                  <CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium text-zinc-900 dark:text-zinc-50">{c.name}</span>
                      <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{formatPaise(c.totalPaise)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat?.color ?? "#64748b" }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

async function BudgetOverview() {
  const userId = await requireUserId();
  const ym = currentYearMonthIST();
  const budgets = await listBudgetsWithSpend(userId, ym.year, ym.month);

  if (budgets.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Budget overview</h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/budgets" className="font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50">
              Set budgets
            </Link>
            {" "}to track your spending against limits.
          </p>
        </div>
      </Card>
    );
  }

  // Show budgets with warning/over status first
  const sorted = [...budgets].sort((a, b) => {
    const statusOrder = { over: 0, warning: 1, ok: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Budget overview</h2>
      <div className="space-y-2">
        {sorted.slice(0, 5).map((b) => (
          <BudgetMeter key={b.id} categoryName={b.categoryName} status={b.status} spendPaise={b.spendPaise} budgetPaise={b.amountPaise} />
        ))}
        {sorted.length > 5 && (
          <Link href="/budgets" className="mt-3 inline-flex text-xs font-medium text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            View all budgets →
          </Link>
        )}
      </div>
    </Card>
  );
}
