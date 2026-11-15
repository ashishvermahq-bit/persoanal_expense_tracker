"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, ReceiptIndianRupee, Tags, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ReceiptIndianRupee },
  { href: "/add", label: "Add", icon: Plus, primary: true },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/categories", label: "Categories", icon: Tags },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Desktop: inline links in the header. */
export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
      {ITEMS.filter((i) => !("primary" in i)).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            isActive(pathname, item.href)
              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobile: fixed bottom bar with a prominent Add button. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
    >
      <ul className="grid h-16 grid-cols-5">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          if ("primary" in item) {
            return (
              <li key={item.href} className="flex items-center justify-center">
                <Link
                  href={item.href}
                  aria-label="Add expense"
                  data-testid="nav-add"
                  className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform active:scale-95 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  <Icon className="size-6" aria-hidden />
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
