"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange" | "size"> {
  label: string;
  /** Rupee string as typed (e.g. "1,250.50"). Parent converts with toPaise. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  size?: "md" | "xl";
}

/** Rupee entry with ₹ prefix; accepts digits, one dot, commas. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { label, value, onChange, error, size = "md", className, id: idProp, ...props },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const xl = size === "xl";
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={cn("block font-medium text-zinc-700 dark:text-zinc-300", xl ? "sr-only" : "text-sm")}>
        {label}
      </label>
      <div className="relative">
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-zinc-400",
            xl ? "text-3xl" : "text-sm"
          )}
        >
          ₹
        </span>
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={value}
          onChange={(e) => {
            const v = e.target.value.replace(/[^\d.,]/g, "");
            // one decimal point, max two decimals
            const [whole, ...rest] = v.split(".");
            onChange(rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole ?? "");
          }}
          aria-invalid={error ? true : undefined}
          className={cn(
            "block w-full rounded-lg border bg-zinc-50 py-2.5 text-zinc-900 tabular-nums outline-none transition-colors focus:bg-white focus:ring-2 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:bg-zinc-800",
            xl ? "h-16 pl-10 pr-4 text-4xl font-semibold tracking-tight" : "pl-8 pr-3.5 text-sm",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/15"
              : "border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900/10 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400/10",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
});
