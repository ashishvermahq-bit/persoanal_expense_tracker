"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/money";
import type { ExpenseDTO } from "@/types/dto";
import { expenseTitle, rowClassName } from "./expense-row";

const ACTIONS_W = 144; // two 72px actions

/**
 * Expense row with swipe-left actions (Edit, Delete).
 * - Touch/pen: drag left; past halfway it snaps open. Vertical scroll is untouched.
 * - Keyboard: Tab past the row to Edit/Delete; focusing them slides the row open.
 * - Tap still opens the expense (unless the gesture was a swipe).
 * Delete is immediate with a 5s Undo toast (soft delete + restore), no confirm.
 */
export function SwipeExpenseRow({ expense, children }: { expense: ExpenseDTO; children: ReactNode }) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hidden, setHidden] = useState(false);
  const gesture = useRef<{ x: number; y: number; base: number; axis: "x" | "y" | null; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const open = offset <= -ACTIONS_W / 2;

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === "mouse") return;
    gesture.current = { x: e.clientX, y: e.clientY, base: offset, axis: null, moved: false };
  }
  function onPointerMove(e: PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.axis) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        g.axis = "x";
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setDragging(true);
      } else if (Math.abs(dy) > 8) {
        g.axis = "y";
      }
    }
    if (g.axis === "x") {
      g.moved = true;
      setOffset(Math.max(-ACTIONS_W, Math.min(0, g.base + dx)));
    }
  }
  function onPointerEnd() {
    const g = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (!g || g.axis !== "x") return;
    suppressClick.current = g.moved;
    setOffset((o) => (o <= -ACTIONS_W / 2 ? -ACTIONS_W : 0));
  }

  async function remove() {
    setHidden(true);
    try {
      await api(`/api/expenses/${expense.id}`, { method: "DELETE" });
    } catch {
      setHidden(false);
      setOffset(0);
      toast.error("Could not delete. Try again.");
      return;
    }
    router.refresh();
    toast(`Deleted ${expenseTitle(expense)} · ${formatPaise(expense.amountPaise)}`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            await api(`/api/expenses/${expense.id}/restore`, { method: "POST" });
            setHidden(false);
            setOffset(0);
            router.refresh();
            toast.success("Expense restored");
          } catch {
            toast.error("Could not undo. Check your connection and add it again.");
          }
        },
      },
    });
  }

  if (hidden) return null;

  return (
    <div
      className="relative overflow-hidden"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOffset(0);
      }}
    >
      {/* Actions sit underneath; the row slides left to reveal them. */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS_W }}>
        <Link
          href={`/expenses/${expense.id}`}
          onFocus={() => setOffset(-ACTIONS_W)}
          className="flex w-[72px] flex-col items-center justify-center gap-0.5 bg-raised text-xs font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          aria-label={`Edit ${expenseTitle(expense)}`}
          tabIndex={0}
        >
          <Pencil className="size-4" aria-hidden />
          Edit
        </Link>
        <button
          type="button"
          onClick={remove}
          onFocus={() => setOffset(-ACTIONS_W)}
          className="flex w-[72px] flex-col items-center justify-center gap-0.5 bg-danger-solid text-xs font-medium text-on-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink"
          aria-label={`Delete ${expenseTitle(expense)}`}
          data-testid="swipe-delete"
        >
          <Trash2 className="size-4" aria-hidden />
          Delete
        </button>
      </div>

      <Link
        href={`/expenses/${expense.id}`}
        data-testid="expense-row"
        data-ripple
        onClick={(e) => {
          if (suppressClick.current || open) {
            e.preventDefault();
            suppressClick.current = false;
            if (open) setOffset(0);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ transform: `translateX(${offset}px)`, touchAction: "pan-y" }}
        className={cn(rowClassName, "relative bg-surface", !dragging && "transition-transform duration-200 ease-out-soft")}
      >
        {children}
      </Link>
    </div>
  );
}
