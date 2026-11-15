import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, PiggyBank, Plus, ReceiptIndianRupee, Wallet, type LucideIcon } from "lucide-react";
import { BudgetMeter } from "@/components/budgets/budget-meter";
import { CategoryIcon } from "@/components/categories/category-icon";
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart";
import { DailyTrendChart } from "@/components/dashboard/daily-trend-chart";
import { PaymentMethodChart } from "@/components/dashboard/payment-method-chart";
import { ValuePop } from "@/components/dashboard/value-pop";
import { buttonClassName } from "@/components/ui/button";
import { Card, SectionLabel, Skeleton } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { currentYearMonthIST, daysInMonth, formatDateLong, formatMonthLabel, istParts, previousMonth, todayIST } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { listBudgetsWithSpend } from "@/lib/services/budgets";
import { listCategories } from "@/lib/services/categories";
import { requireUserId } from "@/lib/services/context";
import { toSummaryDTO } from "@/lib/services/serialize";
import { getOrComputeSummary } from "@/lib/summary/recompute";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <Suspense fallback={<Skeleton className="h-16" />}>
        <Greeting />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-36" />}>
        <StatCards />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <ChartSection />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-40" />}>
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
        <p className="text-sm text-ink-3">{formatDateLong(todayIST())}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink" data-testid="greeting">
          Namaste, {user?.name.split(" ")[0]}
        </h1>
      </div>
      <Link href="/add" className={buttonClassName("primary", "md")}>
        <Plus className="size-4" aria-hidden />
        Add expense
      </Link>
    </div>
  );
}

type Delta = { text: string; direction: "up" | "down"; good: boolean };

/** Stat tile: icon + label, 28px proportional value, optional delta vs a named period. */
function Stat({
  label,
  value,
  rawValue,
  icon: Icon,
  sub,
  delta,
  tone = "default",
  testId,
}: {
  label: string;
  value: string;
  rawValue: number;
  icon: LucideIcon;
  sub?: string;
  delta?: Delta | null;
  tone?: "default" | "good" | "bad" | "muted";
  testId?: string;
}) {
  const color = tone === "good" ? "text-success-ink" : tone === "bad" ? "text-danger-ink" : tone === "muted" ? "text-ink-3" : "text-ink";
  const DeltaIcon = delta?.direction === "up" ? ArrowUpRight : ArrowDownRight;
  return (
    <Card className="bg-primary/5 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-surface text-primary shadow-card">
          <Icon className="size-4" aria-hidden />
        </span>
        <p className="text-sm font-medium text-ink-2">{label}</p>
      </div>
      {/* Proportional figures: tabular-nums looks loose at display sizes. */}
      <p className={`mt-3 text-stat font-semibold tracking-tight ${color}`} data-testid={testId}>
        <ValuePop value={rawValue}>{value}</ValuePop>
      </p>
      <div className="mt-1 flex min-h-4 flex-wrap items-center justify-between gap-x-2 text-xs">
        <span className="text-ink-3">{sub}</span>
        {delta && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${delta.good ? "text-success-ink" : "text-danger-ink"}`}>
            <DeltaIcon className="size-3.5" aria-hidden />
            {delta.text}
          </span>
        )}
      </div>
    </Card>
  );
}

/** Spending delta: more spend is bad, less is good. */
function spendDelta(change: number | null, prevLabel: string): Delta | null {
  if (change === null || !Number.isFinite(change)) return null;
  const pct = Math.round(Math.abs(change) * 100);
  if (pct === 0) return null;
  return { text: `${pct}% vs ${prevLabel}`, direction: change > 0 ? "up" : "down", good: change < 0 };
}

async function StatCards() {
  const userId = await requireUserId();
  const ym = currentYearMonthIST();
  const summary = await getOrComputeSummary(userId, ym).then(toSummaryDTO);
  const prevLabel = formatMonthLabel(previousMonth(ym)).split(" ")[0] ?? "last month";

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat
        label={`Spent in ${formatMonthLabel(ym)}`}
        icon={ReceiptIndianRupee}
        value={formatPaise(summary.totalExpensePaise)}
        rawValue={summary.totalExpensePaise}
        sub={`${summary.expenseCount} ${summary.expenseCount === 1 ? "expense" : "expenses"}`}
        delta={spendDelta(summary.changeFromPreviousMonth, prevLabel)}
        testId="month-spent"
      />
      <Stat
        label="Income"
        icon={Wallet}
        value={formatPaise(summary.totalIncomePaise)}
        rawValue={summary.totalIncomePaise}
        sub={summary.totalIncomePaise ? undefined : "Add income to see savings"}
      />
      <Stat
        label="Saved"
        icon={PiggyBank}
        value={formatPaise(summary.savingsPaise)}
        rawValue={summary.savingsPaise}
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
  const empty = <p className="text-sm text-ink-3">Nothing yet this month.</p>;

  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        <SectionLabel className="mb-4">Daily spend</SectionLabel>
        <DailyTrendChart
          currentMonth={current}
          previousMonth={prev}
          throughDay={istParts(todayIST()).day}
          currentDays={daysInMonth(ym.year, ym.month)}
          previousDays={daysInMonth(prevYm.year, prevYm.month)}
          currentLabel={formatMonthLabel(ym)}
          previousLabel={formatMonthLabel(prevYm)}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <SectionLabel className="mb-4">By category</SectionLabel>
          {current.byCategory.length === 0 ? empty : <CategoryBreakdownChart summary={current} />}
        </Card>
        <Card className="p-4 sm:p-6">
          <SectionLabel className="mb-4">By payment mode</SectionLabel>
          {current.byPaymentMethod.length === 0 ? empty : <PaymentMethodChart summary={current} />}
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>Top categories</SectionLabel>
          <Link href="/expenses" className="inline-flex items-center gap-1 text-xs font-medium text-primary-ink hover:underline">
            All expenses <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
        {topByCategory.length === 0 ? (
          empty
        ) : (
          <ul className="space-y-2.5">
            {topByCategory.map((c, i) => {
              const cat = catById.get(c.categoryId);
              const pct = current.totalExpensePaise ? Math.round((c.totalPaise / current.totalExpensePaise) * 100) : 0;
              return (
                <li key={c.categoryId} className="flex animate-list-in items-center gap-3" style={{ "--i": i } as React.CSSProperties}>
                  <CategoryIcon icon={cat?.icon} color={cat?.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate font-medium text-ink">{c.name}</span>
                      <span className="tabular-nums text-ink-2">{formatPaise(c.totalPaise)}</span>
                    </div>
                    {/* Thin bar in the category's own colour: colour follows the entity. */}
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat?.color ?? "var(--muted)" }} />
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

const STATUS_ORDER = { over: 0, warning: 1, ok: 2 } as const;

async function BudgetOverview() {
  const userId = await requireUserId();
  const ym = currentYearMonthIST();
  const budgets = await listBudgetsWithSpend(userId, ym.year, ym.month);

  if (budgets.length === 0) {
    return (
      <Card className="p-4 text-center">
        <SectionLabel>Budgets</SectionLabel>
        <p className="mt-2 text-sm text-ink-3">
          <Link href="/budgets" className="font-medium text-primary-ink underline-offset-4 hover:underline">
            Set a monthly limit
          </Link>{" "}
          to get a heads-up at 80% and when you go over.
        </p>
      </Card>
    );
  }

  // Needs-attention first.
  const sorted = [...budgets].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Budgets</SectionLabel>
        <Link href="/budgets" className="inline-flex items-center gap-1 text-xs font-medium text-primary-ink hover:underline">
          {sorted.length > 5 ? `All ${sorted.length}` : "Manage"} <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
      <div className="divide-y divide-line">
        {sorted.slice(0, 5).map((b) => (
          <BudgetMeter key={b.id} categoryName={b.categoryName} status={b.status} spendPaise={b.spendPaise} budgetPaise={b.amountPaise} />
        ))}
      </div>
    </Card>
  );
}
