import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { errorClassName, fieldClassName, labelClassName } from "./field-styles";

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
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={fieldClassName(!!error, `min-h-20 ${className ?? ""}`)}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className={errorClassName}>
          {error}
        </p>
      )}
    </div>
  );
});
