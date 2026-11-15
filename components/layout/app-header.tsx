import Link from "next/link";
import { redirect } from "next/navigation";
import { IndianRupee, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LogoutButton } from "./logout-button";
import { DesktopNav } from "./nav";

export async function AppHeader() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50">
            <span className="flex size-7 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
              <IndianRupee className="size-4" aria-hidden />
            </span>
            Paisa
          </Link>
          <DesktopNav />
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/add"
            className="hidden h-8 items-center gap-1.5 rounded-lg bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-700 sm:inline-flex dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus className="size-3.5" aria-hidden />
            Add expense
          </Link>
          <span className="hidden text-sm text-zinc-600 md:inline dark:text-zinc-400" data-testid="user-name">
            {user.name}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

export function AppHeaderSkeleton() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="h-6 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 w-20 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </header>
  );
}
