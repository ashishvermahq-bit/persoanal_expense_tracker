"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, LayoutDashboard, Plus, ReceiptIndianRupee, Wallet } from "lucide-react";
import { QuickAddLink } from "@/components/expenses/quick-add-link";
import { cn } from "@/lib/cn";

const DESKTOP_ITEMS = [
  { href: "/dashboard", label: "Home" },
  { href: "/expenses", label: "Expenses" },
  { href: "/income", label: "Income" },
  { href: "/budgets", label: "Budgets" },
  { href: "/categories", label: "Categories" },
] as const;

/** Mobile bottom bar: four tabs around the Add FAB (slot 2). Categories & preferences live behind the header's settings icon. */
const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, slot: 0 },
  { href: "/expenses", label: "Expenses", icon: ReceiptIndianRupee, slot: 1 },
  { href: "/income", label: "Income", icon: Wallet, slot: 3 },
  { href: "/budgets", label: "Budgets", icon: Gauge, slot: 4 },
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

/**
 * Mobile: fixed bottom bar (64px + home-bar inset). The active tab's pill is
 * one element that slides between slots (transform only, ≤300ms; static under
 * reduced motion). The FAB opens the quick-add sheet (falls back to /add).
 */
export function MobileNav() {
  const pathname = usePathname();
  const active = TABS.find((t) => isActive(pathname, t.href));

  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-safe px-safe backdrop-blur sm:hidden">
      <ul className="relative grid h-16 grid-cols-5">
        {/* Sliding active pill: 20% wide, translated by whole slots. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 flex w-1/5 items-start justify-center pt-1.5 transition-[transform,opacity] duration-300 ease-out-soft",
            active ? "opacity-100" : "opacity-0"
          )}
          style={{ transform: `translateX(${(active?.slot ?? 0) * 100}%)` }}
        >
          <span className="h-8 w-14 rounded-full bg-primary/12" />
        </span>

        {[0, 1, 2, 3, 4].map((slot) => {
          if (slot === 2) {
            return (
              <li key="add" className="flex items-center justify-center">
                <QuickAddLink
                  aria-label="Add expense"
                  data-testid="nav-add"
                  className="flex size-14 -translate-y-4 animate-bounce-in items-center justify-center rounded-full bg-primary-solid text-on-primary shadow-lg ring-4 ring-plane transition-[scale] duration-100 focus-visible:outline-none focus-visible:ring-primary active:scale-95"
                >
                  <Plus className="size-6" aria-hidden />
                </QuickAddLink>
              </li>
            );
          }
          const item = TABS.find((t) => t.slot === slot)!;
          const isOn = active?.href === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                aria-current={isOn ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-start gap-0.5 pt-2.5 text-micro font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                  isOn ? "text-primary-ink" : "text-ink-3"
                )}
              >
                <Icon className={cn("size-6 transition-colors", isOn ? "text-primary" : "text-muted")} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
