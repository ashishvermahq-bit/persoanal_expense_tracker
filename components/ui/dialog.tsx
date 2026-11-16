"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Native <dialog> modal (focus trapping, Esc, backdrop click).
 * Mobile: bottom sheet sliding up, clear of the home bar. ≥sm: centred card.
 * Header stays put while the body scrolls.
 */
export function Dialog({ open, onClose, title, description, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby={titleId}
      className={[
        "max-h-[90dvh] w-full max-w-none overflow-hidden border border-line bg-surface p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-[4px]",
        // bottom sheet
        "mb-0 mt-auto rounded-t-2xl shadow-sheet open:animate-slide-up",
        // centred card from sm up
        "sm:m-auto sm:w-[calc(100vw-2rem)] sm:max-w-md sm:rounded-2xl sm:shadow-xl",
      ].join(" ")}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-surface px-6 pb-3 pt-5">
          <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-zinc-300 sm:hidden dark:bg-zinc-700" />
          <div>
            <h2 id={titleId} className="text-2xl font-semibold tracking-tight">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1 px-2">
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-1">{open && children}</div>
      </div>
    </dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  destructive?: boolean;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", loading, destructive }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      {/* Stacked on mobile with the primary action on top (nearest the thumb). */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading} data-testid="confirm">
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
