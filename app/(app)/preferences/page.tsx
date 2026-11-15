import { Suspense } from "react";
import { PageHeader, Card } from "@/components/ui/page-header";
import { PreferencesForm } from "@/components/preferences/preferences-form";
import { getPreferences } from "@/lib/services/preferences";
import { requireUserId } from "@/lib/services/context";

async function PreferencesContent() {
  const userId = await requireUserId();
  const prefs = await getPreferences(userId);

  return (
    <Card>
      <PreferencesForm preferences={prefs} />
    </Card>
  );
}

export default function PreferencesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Preferences" description="Customize your settings." />
      <Suspense fallback={<Card><div className="animate-pulse space-y-4"><div className="h-12 rounded bg-zinc-200 dark:bg-zinc-800" /></div></Card>}>
        <PreferencesContent />
      </Suspense>
    </div>
  );
}
