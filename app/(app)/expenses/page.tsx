import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { ExpenseList } from "@/components/expenses/expense-list";
import { FilterBar } from "@/components/expenses/filter-bar";
import { buttonClassName } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
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
          <Link href="/add" className={buttonClassName("primary", "sm")}>
            <Plus className="size-3.5" aria-hidden />
            Add
          </Link>
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
      {result.total > 0 && (
        <p className="px-1 text-sm text-zinc-500 dark:text-zinc-400" data-testid="list-summary">
          <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">{formatPaise(result.totalPaise)}</span> across {result.total}{" "}
          {result.total === 1 ? "expense" : "expenses"}
          {hasFilters ? " matching your filters" : ""}
        </p>
      )}
      <ExpenseList result={result} hasFilters={hasFilters} query={query} />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-10 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      ))}
    </div>
  );
}
