import type { Metadata } from "next";
import { Suspense } from "react";
import { Wallet } from "lucide-react";
import { IncomeForm } from "@/components/income/income-form";
import { IncomeRow } from "@/components/income/income-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, PageHeader, Skeleton } from "@/components/ui/page-header";
import { formatPaise } from "@/lib/money";
import { requireUserId } from "@/lib/services/context";
import { listIncome } from "@/lib/services/income";
import { incomeFiltersSchema } from "@/lib/validation/income";

export const metadata: Metadata = { title: "Income" };

export default function IncomePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Income" description="Salary, freelance, interest — so we can show what you actually save." />
      <Card className="mb-6 p-5">
        {/* Default date is "today in IST" — request-time data, so it renders under Suspense. */}
        <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />}>
          <IncomeForm />
        </Suspense>
      </Card>
      <Suspense fallback={<Skeleton className="h-48" />}>
        <IncomeList />
      </Suspense>
    </div>
  );
}

async function IncomeList() {
  const userId = await requireUserId();
  const result = await listIncome(userId, incomeFiltersSchema.parse({ pageSize: 50 }));
  if (result.items.length === 0) {
    return <EmptyState icon={Wallet} title="No income recorded" description="Add your salary above and the dashboard will start showing your savings rate." />;
  }
  return (
    <section>
      <p className="mb-2 px-1 text-sm text-zinc-500 dark:text-zinc-400">
        <span className="font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">{formatPaise(result.totalPaise)}</span> across {result.total} {result.total === 1 ? "entry" : "entries"}
      </p>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
        {result.items.map((i) => (
          <IncomeRow key={i.id} income={i} />
        ))}
      </ul>
    </section>
  );
}
