import type { Metadata } from "next";
import { Suspense } from "react";
import { QuickAddForm } from "@/components/expenses/quick-add-form";
import { Card, PageHeader } from "@/components/ui/page-header";
import { listCategories } from "@/lib/services/categories";
import { requireUserId } from "@/lib/services/context";
import { recentCategoryIds } from "@/lib/services/expenses";
import { getPreferences } from "@/lib/services/preferences";

export const metadata: Metadata = { title: "Add expense" };

export default function AddPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Add expense" description="Amount, category, save. That's it." />
      <Card className="p-5 sm:p-6">
        <Suspense fallback={<FormSkeleton />}>
          <QuickAdd />
        </Suspense>
      </Card>
    </div>
  );
}

async function QuickAdd() {
  const userId = await requireUserId();
  const [categories, recent, preferences] = await Promise.all([
    listCategories(userId, { kind: "expense" }),
    recentCategoryIds(userId),
    getPreferences(userId),
  ]);
  return <QuickAddForm categories={categories} recentCategoryIds={recent} preferences={preferences} />;
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-16 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="h-10 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
