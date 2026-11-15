"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, LayoutDashboard, Plus, ReceiptIndianRupee, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

const DESKTOP_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/expenses", label: "Expenses" },
  { href: "/income", label: "Income" },
  { href: "/budgets", label: "Budgets" },
  { href: "/categories", label: "Categories" },
] as const;

/** Mobile bottom bar: four destinations around the Add FAB. Categories & preferences live behind the header's settings icon. */
const MOBILE_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ReceiptIndianRupee },
  { href: "/add", label: "Add", icon: Plus, primary: true },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/budgets", label: "Budgets", icon: Gauge },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

/** Desktop: inline links in the header. */
export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
      {DESKTOP_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active ? "bg-primary/10 text-primary-ink" : "text-ink-3 hover:bg-ink/5 hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile: fixed bottom bar (64px + home-bar inset) with a floating Add button. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-safe px-safe backdrop-blur sm:hidden">
      <ul className="grid h-16 grid-cols-5">
        {MOBILE_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          if ("primary" in item) {
            return (
              <li key={item.href} className="flex items-center justify-center">
                <Link
                  href={item.href}
                  aria-label="Add expense"
                  data-testid="nav-add"
                  className="flex size-14 -translate-y-4 animate-bounce-in items-center justify-center rounded-full bg-primary-solid text-on-primary shadow-lg ring-4 ring-plane transition-[scale] duration-100 focus-visible:outline-none focus-visible:ring-primary active:scale-95"
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
                data-ripple
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-micro font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                  active ? "text-primary-ink" : "text-ink-3"
                )}
              >
                <Icon className={cn("size-6", active ? "text-primary" : "text-muted")} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

