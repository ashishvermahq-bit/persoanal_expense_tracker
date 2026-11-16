import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryManager } from "@/components/categories/category-manager";
import { PageHeader, Skeleton } from "@/components/ui/page-header";
import { listCategories } from "@/lib/services/categories";
import { requireUserId } from "@/lib/services/context";

export const metadata: Metadata = { title: "Categories" };

export default function CategoriesPage() {
  return (
    <div>
      <PageHeader title="Categories" description="Organise spending your way. Defaults cover the usual Indian household; add your own on top." />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Manager />
      </Suspense>
    </div>
  );
}

async function Manager() {
  const userId = await requireUserId();
  const categories = await listCategories(userId, { includeArchived: true });
  return <CategoryManager categories={categories} />;
}
