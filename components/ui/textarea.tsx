import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id: idProp, ...props },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(
          "block min-h-20 w-full rounded-lg border bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:bg-white focus:ring-2 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:bg-zinc-800",
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
            : "border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900/10 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/10",
          className
        )}
        {...props}
      />
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});
