import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered to the right of the label (e.g. "Forgot password?"). */
  labelAside?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, labelAside, className, id: idProp, ...props },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
        {labelAside}
      </div>
      <input
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "block w-full rounded-lg border bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:bg-white focus:ring-2 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:bg-zinc-800",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
            : "border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900/10 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/10",
          className
        )}
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
