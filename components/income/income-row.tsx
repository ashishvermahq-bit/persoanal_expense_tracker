"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { api } from "@/lib/client";
import { formatDateLong } from "@/lib/dates";
import { INCOME_SOURCE_LABELS } from "@/lib/labels";
import { formatPaise } from "@/lib/money";
import type { IncomeDTO } from "@/types/dto";

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
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{income.description || INCOME_SOURCE_LABELS[income.source]}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {INCOME_SOURCE_LABELS[income.source]} · {formatDateLong(new Date(income.date))}
        </p>
      </div>
      <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatPaise(income.amountPaise, { signed: true })}</span>
      <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} aria-label="Delete income entry" className="-mr-2 px-2 text-zinc-400 hover:text-red-600">
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
