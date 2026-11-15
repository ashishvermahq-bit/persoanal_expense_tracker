"use client";

import { Form } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionLabel } from "@/components/ui/page-header";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { ApiClientError, api } from "@/lib/client";
import { toPaise } from "@/lib/money";
import type { BudgetDTO, CategoryDTO } from "@/types/dto";
import { BudgetMeter } from "./budget-meter";

interface BudgetWithSpend {
  id: string;
  categoryId: string;
  categoryName: string;
  amountPaise: number;
  spendPaise: number;
  status: "ok" | "warning" | "over";
}

export function BudgetManager({
  categories,
  budgets,
}: {
  categories: CategoryDTO[];
  budgets: BudgetWithSpend[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<BudgetDTO | "new" | null>(null);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<BudgetWithSpend | null>(null);
  const [deleting, setDeleting] = useState(false);

  const budgetedCategories = new Set(budgets.map((b) => b.categoryId));
  const unbudgetedCategories = categories.filter((c) => !budgetedCategories.has(c.id));

  function openNew() {
    setAmount("");
    setCategoryId("");
    setErrors({});
    setEditing("new");
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    let paise = 0;
    try {
      paise = toPaise(amount);
      if (paise < 1) next.amount = "Enter an amount";
    } catch {
      next.amount = "Enter a valid amount";
    }
    if (!categoryId) next.categoryId = "Choose a category";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      if (editing === "new") {
        await api<BudgetDTO>("/api/budgets", {
          method: "POST",
          json: { categoryId, amountPaise: paise, year: null, month: null },
        });
        toast.success("Budget added");
      } else if (editing) {
        await api<BudgetDTO>(`/api/budgets/${editing.id}`, {
          method: "PATCH",
          json: { amountPaise: paise },
        });
        toast.success("Budget updated");
      }
      setEditing(null);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast.error(err.message);
      } else toast.error("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/budgets/${toDelete.id}`, { method: "DELETE" });
      toast.success("Budget deleted");
      setToDelete(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SectionLabel>Monthly limits</SectionLabel>
        <Button size="sm" onClick={openNew} disabled={unbudgetedCategories.length === 0} data-testid="new-budget">
          <Plus className="size-3.5" aria-hidden />
          Add budget
        </Button>
      </div>

      {budgets.length === 0 ? (
        <EmptyState art="gauge" title="No budgets yet" description="Set a monthly limit for a category. You'll get a heads-up at 80% and when you go over." />
      ) : (
        <ul className="divide-y divide-line">
          {budgets.map((b, i) => (
            <li key={b.id} className="flex animate-list-in items-center gap-2" style={{ "--i": i } as React.CSSProperties}>
              <div className="min-w-0 flex-1">
                <BudgetMeter layout="adaptive" categoryName={b.categoryName} status={b.status} spendPaise={b.spendPaise} budgetPaise={b.amountPaise} />
              </div>
              {/* Always visible: hover-only controls are unreachable on touch screens. */}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setToDelete(b)}
                aria-label={`Delete ${b.categoryName} budget`}
                className="px-2 text-ink-3 hover:text-danger-ink"
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Set budget" : "Edit budget"}>
        <Form onSubmit={save} noValidate className="space-y-4">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            error={errors.categoryId}
            disabled={editing !== "new"}
          >
            <option value="">Choose…</option>
            {(editing === "new" ? unbudgetedCategories : categories).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>

          <MoneyInput label="Monthly limit" value={amount} onChange={setAmount} error={errors.amount} autoFocus data-testid="budget-amount" />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} data-testid="save-budget">
              {editing === "new" ? "Set budget" : "Update"}
            </Button>
          </div>
        </Form>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        destructive
        title="Delete this budget?"
        description="You won't see warnings for this category anymore."
        confirmLabel="Delete"
      />
    </div>
  );
}
