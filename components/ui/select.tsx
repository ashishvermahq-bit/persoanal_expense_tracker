import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { errorClassName, fieldClassName, hintClassName, labelClassName } from "./field-styles";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, className, id: idProp, children, ...props },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={fieldClassName(!!error, `appearance-none pr-9 ${className ?? ""}`)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className={errorClassName}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={hintClassName}>
          {hint}
        </p>
      ) : null}
    </div>
  );
});
