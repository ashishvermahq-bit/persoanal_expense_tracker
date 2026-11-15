"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { CategoryDTO, PreferencesDTO } from "@/types/dto";
import { QuickAddForm } from "./quick-add-form";
import { quickAddSheet } from "./quick-add-sheet-store";

/**
 * Quick add as a bottom sheet over whatever page you're on (FAB, header and
 * dashboard "Add" open it). After a save it shows the success tick, closes,
 * and refreshes the page underneath, so the dashboard hero value-pops.
 * /add still exists for deep links, shortcuts and no-JS.
 */
export function QuickAddSheet(props: { categories: CategoryDTO[]; recentCategoryIds: string[]; preferences: PreferencesDTO }) {
  const router = useRouter();
  const open = useSyncExternalStore(quickAddSheet.subscribe, quickAddSheet.isOpen, () => false);

  useEffect(() => {
    quickAddSheet.setReady(true);
    return () => quickAddSheet.setReady(false);
  }, []);

  return (
    <Dialog open={open} onClose={quickAddSheet.close} title="Add expense">
      <div data-testid="quick-add-sheet">
        <QuickAddForm
          {...props}
          onDone={() => {
            quickAddSheet.close();
            router.refresh();
          }}
        />
      </div>
    </Dialog>
  );
}
