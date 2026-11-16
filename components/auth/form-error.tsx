import { OctagonAlert } from "lucide-react";

/** Form-level error (data-testid="form-error" is used by the e2e specs). */
export function FormError({ message }: { message: string }) {
  return (
    <p role="alert" data-testid="form-error" className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger-ink">
      <OctagonAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      {message}
    </p>
  );
}
