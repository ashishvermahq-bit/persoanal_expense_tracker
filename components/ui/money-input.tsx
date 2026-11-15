"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { errorClassName, fieldClassName, labelClassName } from "./field-styles";

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
      <label htmlFor={id} className={cn(labelClassName, xl && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        <span aria-hidden className={cn("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted", xl ? "text-3xl" : "text-base sm:text-sm")}>
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
          aria-describedby={error ? `${id}-error` : undefined}
          // md: pl-8 overrides px-3's left side (longhand sorts after shorthand in Tailwind 4).
          className={fieldClassName(!!error, cn("tabular-nums", !xl && "pl-8", className), xl ? "xl" : "md")}
          {...props}
        />
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className={errorClassName}>
          {error}
        </p>
      )}
    </div>
  );
});
