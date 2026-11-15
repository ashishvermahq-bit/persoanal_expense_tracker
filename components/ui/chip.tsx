import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
}

/**
 * Toggle pill for category / payment-mode pickers.
 * Selected = primary tint + 2px primary edge (shape change, not colour alone),
 * announced via aria-pressed. 44px tall on touch screens.
 */
export function Chip({ selected, icon, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-ripple
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium text-ink pointer-coarse:h-11",
        "transition-[background-color,border-color,box-shadow,scale] duration-150 active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-plane",
        selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-line bg-surface hover:bg-primary/5",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
