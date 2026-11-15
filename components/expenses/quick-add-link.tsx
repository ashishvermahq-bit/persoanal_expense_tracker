"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ComponentProps } from "react";
import { quickAddSheet } from "./quick-add-sheet-store";

/**
 * A link to /add that opens the quick-add bottom sheet instead when it can
 * (hydrated, sheet data loaded, plain left click, not already on /add).
 * Deep links, new-tab clicks and no-JS all still reach the /add page.
 * `data-sheet="ready"` marks when a tap will open the sheet.
 */
export function QuickAddLink({ onClick, ...props }: Omit<ComponentProps<typeof Link>, "href">) {
  const pathname = usePathname();
  const ready = useSyncExternalStore(quickAddSheet.subscribe, quickAddSheet.isReady, () => false);
  return (
    <Link
      href="/add"
      data-sheet={ready && pathname !== "/add" ? "ready" : undefined}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (pathname === "/add") return;
        if (quickAddSheet.open()) e.preventDefault();
      }}
      {...props}
    />
  );
}
