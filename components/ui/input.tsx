import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { errorClassName, fieldClassName, hintClassName, labelClassName } from "./field-styles";

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
        <label htmlFor={id} className={labelClassName}>
          {label}
        </label>
        {labelAside}
      </div>
      <input ref={ref} id={id} aria-invalid={error ? true : undefined} aria-describedby={describedBy} className={fieldClassName(!!error, className)} {...props} />
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
