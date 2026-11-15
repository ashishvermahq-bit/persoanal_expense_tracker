import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Tags } from "lucide-react";
import { PreferencesForm } from "@/components/preferences/preferences-form";
import { Card, PageHeader, Skeleton } from "@/components/ui/page-header";
import { getPreferences } from "@/lib/services/preferences";
import { requireUserId } from "@/lib/services/context";

export const metadata: Metadata = { title: "Preferences" };

async function PreferencesContent() {
  const userId = await requireUserId();
  const prefs = await getPreferences(userId);
  return (
    <Card className="p-4 sm:p-6">
      <PreferencesForm preferences={prefs} />
    </Card>
  );
}

export default function PreferencesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Preferences" description="Theme, financial year and defaults." />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <PreferencesContent />
      </Suspense>
      {/* Categories aren't in the mobile bottom bar, so they're reachable from here. */}
      <Link
        href="/categories"
        data-ripple
        className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Tags className="size-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-medium text-ink">Categories</span>
          <span className="block text-xs text-ink-3">Add your own, archive the ones you don&apos;t use</span>
        </span>
        <ChevronRight className="size-4 text-muted" aria-hidden />
      </Link>
    </div>
  );
}
