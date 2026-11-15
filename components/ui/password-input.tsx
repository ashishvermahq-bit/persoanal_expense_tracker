"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { AlertTriangle, Check, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { errorClassName, fieldClassName, hintClassName, labelClassName } from "./field-styles";

export interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  error?: string;
  hint?: string;
  labelAside?: ReactNode;
  /** Controlled visibility, so one toggle can reveal several fields (signup). */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Render the show/hide button on this field (default true). */
  toggle?: boolean;
  /** Show the live requirements checklist (signup). Mirrors passwordSchema. */
  showRequirements?: boolean;
}

const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "8+ characters", test: (v) => v.length >= 8 },
  { label: "a letter", test: (v) => /[a-zA-Z]/.test(v) },
  { label: "a number", test: (v) => /\d/.test(v) },
];

/**
 * Password field: show/hide toggle (aria-pressed), inline Caps Lock warning,
 * optional requirements checklist (icon + text, never colour alone).
 * Uncontrolled value: the parent form still reads it via FormData.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { label, error, hint, labelAside, visible: visibleProp, onVisibleChange, toggle = true, showRequirements, className, id: idProp, onKeyDown, onKeyUp, onInput, onBlur, ...props },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [visibleState, setVisibleState] = useState(false);
  const visible = visibleProp ?? visibleState;
  const [capsLock, setCapsLock] = useState(false);
  const [value, setValue] = useState("");

  const setVisible = (v: boolean) => {
    if (onVisibleChange) onVisibleChange(v);
    else setVisibleState(v);
  };
  const checkCaps = (e: KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false);

  const capsId = `${id}-caps`;
  const reqId = `${id}-req`;
  const describedBy = [error ? `${id}-error` : hint ? `${id}-hint` : null, capsLock ? capsId : null, showRequirements ? reqId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={labelClassName}>
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={fieldClassName(!!error, cn(toggle && "pr-12", className))}
          onKeyDown={(e) => {
            checkCaps(e);
            onKeyDown?.(e);
          }}
          onKeyUp={(e) => {
            checkCaps(e);
            onKeyUp?.(e);
          }}
          onInput={(e) => {
            if (showRequirements) setValue(e.currentTarget.value);
            onInput?.(e);
          }}
          onBlur={(e) => {
            setCapsLock(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {toggle && (
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-pressed={visible}
            aria-controls={id}
            aria-label="Show password"
            title={visible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          >
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        )}
      </div>

      {capsLock && (
        <p id={capsId} role="status" className="flex items-center gap-1 text-xs font-medium text-warning-ink">
          <AlertTriangle className="size-3.5 text-warning" aria-hidden />
          Caps Lock is on
        </p>
      )}

      {error ? (
        <p id={`${id}-error`} role="alert" className={errorClassName}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className={hintClassName}>
          {hint}
        </p>
      ) : null}

      {showRequirements && !error && (
        <ul id={reqId} aria-label="Password needs" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {RULES.map((r) => {
            const met = r.test(value);
            return (
              <li key={r.label} className={cn("flex items-center gap-1", met ? "text-success-ink" : "text-ink-3")}>
                {/* Unmet: a hollow ring drawn in CSS (no extra inline SVG); met: a tick. Text says which, too. */}
                {met ? <Check className="size-3.5" aria-hidden /> : <span aria-hidden className="mx-0.5 size-2.5 rounded-full border-[1.5px] border-current" />}
                <span>
                  {r.label}
                  <span className="sr-only">{met ? " (done)" : " (needed)"}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
