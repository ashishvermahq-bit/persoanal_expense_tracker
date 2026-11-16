import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateLong, istParts } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import type { ExpenseDTO, Paged } from "@/types/dto";
import { buttonClassName } from "@/components/ui/button";
import { ExpenseRowBody } from "./expense-row";
import { QuickAddLink } from "./quick-add-link";
import { SwipeExpenseRow } from "./swipe-row";

function dayKey(iso: string) {
  const { year, month, day } = istParts(new Date(iso));
  return `${year}-${month}-${day}`;
}

export function ExpenseList({ result, hasFilters, query }: { result: Paged<ExpenseDTO>; hasFilters: boolean; query: URLSearchParams }) {
  if (result.items.length === 0) {
    return (
      <EmptyState
        art="receipt"
        title={hasFilters ? "No expenses match" : "No expenses yet"}
        description={hasFilters ? "Try widening the date range or clearing filters." : "Add your first expense — it takes three taps."}
        action={
          !hasFilters && (
            <QuickAddLink className={buttonClassName("primary", "md")}>Add an expense</QuickAddLink>
          )
        }
      />
    );
  }

  // Group by IST day for scannability.
  const groups: { key: string; label: string; items: ExpenseDTO[]; totalPaise: number }[] = [];
  for (const e of result.items) {
    const key = dayKey(e.date);
    let g = groups.at(-1);
    if (!g || g.key !== key) {
      g = { key, label: formatDateLong(new Date(e.date)), items: [], totalPaise: 0 };
      groups.push(g);
    }
    g.items.push(e);
    g.totalPaise += e.amountPaise;
  }

  const pageLink = (p: number) => {
    const sp = new URLSearchParams(query);
    if (p <= 1) sp.delete("page");
    else sp.set("page", String(p));
    const s = sp.toString();
    return `/expenses${s ? `?${s}` : ""}`;
  };

  let idx = 0;
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          {/* Sticky under the app header (56px + notch). */}
          <header className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-[5] -mx-1 mb-2 flex items-baseline justify-between bg-plane/90 px-2 py-1.5 text-xs font-medium uppercase tracking-[0.05em] text-ink-3 backdrop-blur">
            <span>{g.label}</span>
            <span className="tabular-nums">{formatPaise(g.totalPaise)}</span>
          </header>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {g.items.map((e) => (
              <li key={e.id} className="animate-list-in" style={{ "--i": idx++ } as React.CSSProperties}>
                <SwipeExpenseRow expense={e}>
                  <ExpenseRowBody expense={e} />
                </SwipeExpenseRow>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {result.totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          <span className="text-ink-3">
            Page {result.page} of {result.totalPages} · {result.total} expenses
          </span>
          <div className="flex gap-2">
            <PageButton href={pageLink(result.page - 1)} disabled={result.page <= 1} label="Previous page">
              <ChevronLeft className="size-4" aria-hidden />
            </PageButton>
            <PageButton href={pageLink(result.page + 1)} disabled={result.page >= result.totalPages} label="Next page">
              <ChevronRight className="size-4" aria-hidden />
            </PageButton>
          </div>
        </nav>
      )}
    </div>
  );
}

function PageButton({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  const cls = "inline-flex size-9 items-center justify-center rounded-lg border border-line bg-surface text-ink-2 pointer-coarse:size-11";
  if (disabled) return <span aria-disabled className={`${cls} opacity-40`}>{children}</span>;
  return (
    <Link href={href} aria-label={label} className={`${cls} hover:bg-raised`}>
      {children}
    </Link>
  );
}
