import Link from "next/link";
import { redirect } from "next/navigation";
import { IndianRupee, Plus, Settings } from "lucide-react";
import { QuickAddLink } from "@/components/expenses/quick-add-link";
import { ThemeToggleButton } from "@/components/theme/theme-toggle";
import { buttonClassName } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LogoutButton } from "./logout-button";
import { DesktopNav } from "./nav";

const iconLink =
  "inline-flex size-9 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-raised hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:size-11";

export async function AppHeader() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    // pt-safe: with the black-translucent iOS status bar, content would otherwise sit under the notch.
    <header className="sticky top-0 z-10 border-b border-line bg-surface/85 pt-safe px-safe backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-ink">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary-solid text-on-primary">
              <IndianRupee className="size-4" aria-hidden />
            </span>
            Paisa
          </Link>
          <DesktopNav />
        </div>
        <div className="flex items-center gap-1">
          {/* Wrapper carries the visibility: cn() doesn't merge `hidden` with the button's own inline-flex. Phones use the FAB. */}
          <span className="mr-1 hidden sm:block">
            <QuickAddLink className={buttonClassName("primary", "sm")}>
              <Plus className="size-3.5" aria-hidden />
              Add expense
            </QuickAddLink>
          </span>
          <span className="mr-1 hidden text-sm text-ink-3 md:inline" data-testid="user-name">
            {user.name}
          </span>
          <ThemeToggleButton />
          <Link href="/preferences" aria-label="Preferences" title="Preferences" className={iconLink} data-testid="nav-preferences">
            <Settings className="size-5" aria-hidden />
          </Link>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

export function AppHeaderSkeleton() {
  return (
    <header className="border-b border-line bg-surface pt-safe">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="h-6 w-24 animate-pulse rounded bg-raised" />
        <div className="h-8 w-20 animate-pulse rounded bg-raised" />
      </div>
    </header>
  );
}
