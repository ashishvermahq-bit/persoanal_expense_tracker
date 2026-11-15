import { cn } from "@/lib/cn";

/**
 * Shared look for Input / Select / Textarea / MoneyInput.
 * Focus = 2px primary edge (1px border + 1px ring, so nothing shifts).
 * Text is 16px on small screens: iOS Safari zooms the page on focus below 16px.
 * (`cn` does not merge conflicting classes, so size variants are chosen here.)
 */
export function fieldClassName(error: boolean | undefined, className?: string, size: "md" | "xl" = "md") {
  return cn(
    "block w-full rounded-lg border bg-surface text-ink outline-none pointer-coarse:min-h-11",
    size === "xl" ? "h-16 pl-10 pr-4 text-4xl font-semibold tracking-tight" : "px-3 py-2.5 text-base sm:text-sm",
    "placeholder:text-muted transition-[border-color,box-shadow] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-60",
    error ? "border-danger ring-1 ring-danger focus:border-danger" : "border-line focus:border-primary focus:ring-1 focus:ring-primary",
    className
  );
}

export const labelClassName = "block text-sm font-medium text-ink-2";
export const hintClassName = "text-xs text-ink-3";
export const errorClassName = "text-xs font-medium text-danger-ink";
