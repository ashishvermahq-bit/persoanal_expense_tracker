import { Suspense } from "react";
import { PageHeader, Card } from "@/components/ui/page-header";
import { BudgetManager } from "@/components/budgets/budget-manager";
import { listCategories } from "@/lib/services/categories";
import { listBudgetsWithSpend } from "@/lib/services/budgets";
import { currentYearMonthIST } from "@/lib/dates";
import { requireUserId } from "@/lib/services/context";

async function BudgetContent() {
  const userId = await requireUserId();
  const { year, month } = currentYearMonthIST();
  const [categories, budgets] = await Promise.all([
    listCategories(userId),
    listBudgetsWithSpend(userId, year, month),
  ]);

  return (
    <Card>
      <BudgetManager categories={categories} budgets={budgets} />
    </Card>
  );
}

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Budgets" description="Set monthly limits for categories and track spending." />
      <Suspense fallback={<Card><div className="animate-pulse space-y-2"><div className="h-12 rounded bg-zinc-200 dark:bg-zinc-800" /></div></Card>}>
        <BudgetContent />
      </Suspense>
    </div>
  );
}
