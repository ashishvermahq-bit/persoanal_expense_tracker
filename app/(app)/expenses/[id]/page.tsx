import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Card, PageHeader, Skeleton } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api";
import { formatDateLong } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { listCategories } from "@/lib/services/categories";
import { requireUserId } from "@/lib/services/context";
import { getExpense } from "@/lib/services/expenses";
import { getPreferences } from "@/lib/services/preferences";

export const metadata: Metadata = { title: "Edit expense" };

export default function EditExpensePage(props: PageProps<"/expenses/[id]">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Editor params={props.params} />
      </Suspense>
    </div>
  );
}

async function Editor({ params }: { params: PageProps<"/expenses/[id]">["params"] }) {
  const { id } = await params;
  const userId = await requireUserId();
  let expense;
  try {
    expense = await getExpense(userId, id);
  } catch (err) {
    if (err instanceof ApiError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  const [categories, preferences] = await Promise.all([listCategories(userId, { includeArchived: true, kind: "expense" }), getPreferences(userId)]);
  // Archived categories stay selectable only if this expense already uses one.
  const usable = categories.filter((c) => !c.isArchived || c.id === expense.categoryId);

  return (
    <>
      <PageHeader title={formatPaise(expense.amountPaise)} description={`${expense.category?.name ?? "Expense"} · ${formatDateLong(new Date(expense.date))}`} />
      <Card className="p-5 sm:p-6">
        <ExpenseForm categories={usable} preferences={preferences} expense={expense} />
      </Card>
    </>
  );
}
