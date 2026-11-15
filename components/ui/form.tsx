"use client";

import { useSyncExternalStore, type FormHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const noopSubscribe = () => () => {};

/** false during SSR and the hydration pass, true once React owns the DOM. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * <form> whose controls stay disabled until hydration. Without this, a user on
 * a slow connection can type and press Enter/Save before our onSubmit handler
 * is attached, which triggers a native GET submit that reloads the page and
 * throws their input away.
 *
 * `className` is applied to the inner fieldset (the real layout box).
 */
export function Form({ className, children, ...props }: FormHTMLAttributes<HTMLFormElement>) {
  const hydrated = useHydrated();
  return (
    <form {...props} aria-busy={!hydrated || undefined}>
      <fieldset disabled={!hydrated} className={cn("min-w-0", className)}>
        {children}
      </fieldset>
    </form>
  );
}
