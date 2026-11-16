import Link from "next/link";
import { Paperclip } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { PAYMENT_METHOD_LABELS, TAX_SECTION_SHORT, UPI_APP_LABELS } from "@/lib/labels";
import { formatPaise } from "@/lib/money";
import type { ExpenseDTO } from "@/types/dto";

export function expenseTitle(e: ExpenseDTO) {
  return e.description || e.merchant || e.category?.name || "Expense";
}

/** Icon · title/meta · tags · amount. Presentational; used by every expense list. */
export function ExpenseRowBody({ expense: e }: { expense: ExpenseDTO }) {
  const mode = e.paymentMethod === "upi" && e.upiApp ? UPI_APP_LABELS[e.upiApp] : PAYMENT_METHOD_LABELS[e.paymentMethod];
  return (
    <>
      <CategoryIcon icon={e.category?.icon} color={e.category?.color} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{expenseTitle(e)}</p>
        <p className="truncate text-xs text-ink-3">{[e.category?.name, e.merchant && e.description ? e.merchant : null, mode].filter(Boolean).join(" · ")}</p>
      </div>
      <div className="flex items-center gap-2">
        {e.receiptUrl && <Paperclip className="size-3.5 text-muted" aria-label="Has receipt" />}
        {e.taxSection !== "none" && <span className="rounded bg-success/10 px-1.5 py-0.5 text-micro font-semibold text-success-ink">{TAX_SECTION_SHORT[e.taxSection]}</span>}
        <span className="text-sm font-semibold tabular-nums text-ink">{formatPaise(e.amountPaise)}</span>
      </div>
    </>
  );
}

export const rowClassName = "flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-raised focus-visible:bg-raised focus-visible:outline-none";

/** Tap-to-open row (dashboard recent activity). */
export function ExpenseRowLink({ expense }: { expense: ExpenseDTO }) {
  return (
    <Link href={`/expenses/${expense.id}`} data-ripple className={rowClassName} data-testid="expense-row">
      <ExpenseRowBody expense={expense} />
    </Link>
  );
}
