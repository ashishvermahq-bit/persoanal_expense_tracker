import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ExpenseList } from "@/components/expenses/expense-list";
import { QuickAddLink } from "@/components/expenses/quick-add-link";
import { todayIST } from "@/lib/dates";
import { FilterBar } from "@/components/expenses/filter-bar";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader, Skeleton } from "@/components/ui/page-header";
import { formatPaise } from "@/lib/money";
import { searchParamsToObject } from "@/lib/query";
import { listCategories } from "@/lib/services/categories";
import { requireUserId } from "@/lib/services/context";
import { listExpenses } from "@/lib/services/expenses";
import { expenseFiltersSchema } from "@/lib/validation/expense";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage(props: PageProps<"/expenses">) {
  return (
    <div>
      <PageHeader
        title="Expenses"
        actions={
          <QuickAddLink className={buttonClassName("primary", "sm")}>
            <Plus className="size-3.5" aria-hidden />
            Add
          </QuickAddLink>
        }
      />
      <Suspense fallback={<ListSkeleton />}>
        <Expenses searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Expenses({ searchParams }: { searchParams: PageProps<"/expenses">["searchParams"] }) {
  const sp = await searchParams;
  const raw = searchParamsToObject(sp);
  const parsed = expenseFiltersSchema.safeParse(raw);
  const filters = parsed.success ? parsed.data : expenseFiltersSchema.parse({});
  const userId = await requireUserId();
  const [result, categories] = await Promise.all([listExpenses(userId, filters), listCategories(userId, { includeArchived: true })]);

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) for (const item of Array.isArray(v) ? v : [v]) query.append(k, item);
  const hasFilters = Object.keys(raw).some((k) => k !== "page");

  return (
    <div className="space-y-5">
      <FilterBar categories={categories.filter((c) => !c.isArchived || filters.categoryId?.includes(c.id))} />
      {result.total > 0 && <SummaryStrip total={result.total} totalPaise={result.totalPaise} days={rangeDays(filters.from, filters.to)} filtered={hasFilters} />}
      <ExpenseList result={result} hasFilters={hasFilters} query={query} />
    </div>
  );
}

/** Inclusive IST days in the filtered range, or null when there's no start date. */
function rangeDays(from?: Date, to?: Date): number | null {
  if (!from) return null;
  const end = to ?? todayIST();
  return Math.max(1, Math.round((end.getTime() - from.getTime()) / 86_400_000) + 1);
}

/** count · total · avg/day (avg per expense when there's no date range). */
function SummaryStrip({ total, totalPaise, days, filtered }: { total: number; totalPaise: number; days: number | null; filtered: boolean }) {
  // Whole rupees: an average doesn't need paise, and the strip must fit 390px.
  const avg = formatPaise(Math.round(totalPaise / (days ?? total) / 100) * 100);
  const cell = "flex flex-col gap-0.5 px-3 py-2.5 first:pl-4 last:pr-4";
  return (
    <dl className="grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface shadow-card" data-testid="list-summary" aria-label={filtered ? "Totals for your filters" : "Totals"}>
      <div className={cell}>
        <dt className="text-xs text-ink-3">{total === 1 ? "Expense" : "Expenses"}</dt>
        <dd className="text-base font-semibold tabular-nums text-ink">{total}</dd>
      </div>
      <div className={cell}>
        <dt className="text-xs text-ink-3">Total</dt>
        <dd className="truncate text-base font-semibold tabular-nums text-ink">{formatPaise(totalPaise)}</dd>
      </div>
      <div className={cell}>
        <dt className="text-xs text-ink-3">{days ? "Avg / day" : "Avg / expense"}</dt>
        <dd className="truncate text-base font-semibold tabular-nums text-ink">{avg}</dd>
      </div>
    </dl>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10" />
      <Skeleton className="h-9" />
      <Skeleton className="h-[62px]" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}
