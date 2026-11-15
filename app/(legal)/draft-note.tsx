import { AlertTriangle } from "lucide-react";

/** Shown on legal pages until a lawyer has reviewed the wording. */
export function DraftNote() {
  return (
    <p role="note" className="flex items-start gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning-ink">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      Draft for legal review. This describes how Paisa works today; the wording is not yet final.
    </p>
  );
}
