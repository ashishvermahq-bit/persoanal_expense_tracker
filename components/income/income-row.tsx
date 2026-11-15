"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Briefcase, Gift, Home, Laptop, Percent, Store, Trash2, TrendingUp, Undo2, Wallet, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HueIcon } from "@/components/ui/hue-icon";
import type { Hue } from "@/lib/color";
import { ConfirmDialog } from "@/components/ui/dialog";
import { api } from "@/lib/client";
import { formatDateLong } from "@/lib/dates";
import { INCOME_SOURCE_LABELS } from "@/lib/labels";
import { formatPaise } from "@/lib/money";
import type { IncomeDTO } from "@/types/dto";
import type { IncomeSource } from "@/types/models";

/** Each income source keeps one icon + hue everywhere (colour follows the entity). */
const SOURCE_LOOK: Record<IncomeSource, { icon: LucideIcon; hue: Hue }> = {
  salary: { icon: Briefcase, hue: 6 },
  freelance: { icon: Laptop, hue: 1 },
  business: { icon: Store, hue: 7 },
  interest: { icon: Percent, hue: 3 },
  dividend: { icon: TrendingUp, hue: 3 },
  rental: { icon: Home, hue: 2 },
  gift: { icon: Gift, hue: 5 },
  refund: { icon: Undo2, hue: 4 },
  other: { icon: Wallet, hue: 8 },
};

export function IncomeRow({ income }: { income: IncomeDTO }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    setDeleting(true);
    try {
      await api(`/api/income/${income.id}`, { method: "DELETE" });
      toast.success("Income entry deleted");
      setConfirm(false);
      router.refresh();
    } catch {
      toast.error("Could not delete. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3" data-testid="income-row">
      <HueIcon icon={SOURCE_LOOK[income.source].icon} hue={SOURCE_LOOK[income.source].hue} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{income.description || INCOME_SOURCE_LABELS[income.source]}</p>
        <p className="text-xs text-ink-3">
          {INCOME_SOURCE_LABELS[income.source]} · {formatDateLong(new Date(income.date))}
        </p>
      </div>
      <span className="text-sm font-semibold tabular-nums text-success-ink">{formatPaise(income.amountPaise, { signed: true })}</span>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} aria-label="Delete income entry" className="-mr-2 px-2 text-ink-3 hover:text-danger-ink">
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={onDelete}
        loading={deleting}
        destructive
        title="Delete this income entry?"
        confirmLabel="Delete"
      />
    </li>
  );
}
