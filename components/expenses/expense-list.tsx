import Link from "next/link";
import { ChevronLeft, ChevronRight, Paperclip, ReceiptIndianRupee } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateLong, istParts } from "@/lib/dates";
import { PAYMENT_METHOD_LABELS, TAX_SECTION_SHORT, UPI_APP_LABELS } from "@/lib/labels";
import { formatPaise } from "@/lib/money";
import type { ExpenseDTO, Paged } from "@/types/dto";
import { buttonClassName } from "@/components/ui/button";

function dayKey(iso: string) {
  const { year, month, day } = istParts(new Date(iso));
  return `${year}-${month}-${day}`;
}

export function ExpenseList({ result, hasFilters, query }: { result: Paged<ExpenseDTO>; hasFilters: boolean; query: URLSearchParams }) {
  if (result.items.length === 0) {
    return (
      <EmptyState
        icon={ReceiptIndianRupee}
        title={hasFilters ? "No expenses match" : "No expenses yet"}
        description={hasFilters ? "Try widening the date range or clearing filters." : "Add your first expense — it takes three taps."}
        action={
          !hasFilters && (
            <Link href="/add" className={buttonClassName("primary", "md")}>
              Add an expense
            </Link>
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
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key} aria-label={g.label}>
          <header className="mb-2 flex items-baseline justify-between px-1 text-xs font-medium uppercase tracking-[0.05em] text-ink-3">
            <span>{g.label}</span>
            <span className="tabular-nums">{formatPaise(g.totalPaise)}</span>
          </header>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            {g.items.map((e) => (
              <li key={e.id} className="animate-list-in" style={{ "--i": idx++ } as React.CSSProperties}>
                <Link href={`/expenses/${e.id}`} data-ripple className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:outline-none" data-testid="expense-row">
                  <CategoryIcon icon={e.category?.icon} color={e.category?.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {e.description || e.merchant || e.category?.name || "Expense"}
                    </p>
                    <p className="truncate text-xs text-ink-3">
                      {[e.category?.name, e.merchant && e.description ? e.merchant : null, e.paymentMethod === "upi" && e.upiApp ? UPI_APP_LABELS[e.upiApp] : PAYMENT_METHOD_LABELS[e.paymentMethod]]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.receiptUrl && <Paperclip className="size-3.5 text-muted" aria-label="Has receipt" />}
                    {e.taxSection !== "none" && (
                      <span className="rounded bg-success/10 px-1.5 py-0.5 text-micro font-semibold text-success-ink">
                        {TAX_SECTION_SHORT[e.taxSection]}
                      </span>
                    )}
                    <span className="text-sm font-semibold tabular-nums text-ink">{formatPaise(e.amountPaise)}</span>
                  </div>
                </Link>
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
