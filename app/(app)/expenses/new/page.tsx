import type { Metadata } from "next";
import { Suspense } from "react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Card, PageHeader } from "@/components/ui/page-header";
import { listCategories } from "@/lib/services/categories";
import { requireUserId } from "@/lib/services/context";
import { getPreferences } from "@/lib/services/preferences";

export const metadata: Metadata = { title: "New expense" };

export default function NewExpensePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New expense" description="All the details: tags, receipt, tax section." />
      <Card className="p-5 sm:p-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />}>
          <Form />
        </Suspense>
      </Card>
    </div>
  );
}

async function Form() {
  const userId = await requireUserId();
  const [categories, preferences] = await Promise.all([listCategories(userId, { kind: "expense" }), getPreferences(userId)]);
  return <ExpenseForm categories={categories} preferences={preferences} />;
}
