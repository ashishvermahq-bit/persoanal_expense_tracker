import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Card } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import { currentYearMonthIST, formatDateLong, formatMonthLabel, todayIST } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { listCategories } from "@/lib/services/categories";
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
        <MonthAtAGlance />
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

async function MonthAtAGlance() {
  const userId = await requireUserId();
  const ym = currentYearMonthIST();
  const [summary, categories] = await Promise.all([getOrComputeSummary(userId, ym).then(toSummaryDTO), listCategories(userId, { includeArchived: true })]);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const top = summary.byCategory.slice(0, 4);

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
      <Card className="p-5 sm:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Top categories this month</h2>
          <Link href="/expenses" className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:underline dark:text-zinc-400">
            All expenses <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>
        {top.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing yet this month. Charts, budgets and trends arrive with your first few expenses.</p>
        ) : (
          <ul className="space-y-2.5">
            {top.map((c) => {
              const cat = catById.get(c.categoryId);
              const pct = summary.totalExpensePaise ? Math.round((c.totalPaise / summary.totalExpensePaise) * 100) : 0;
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
