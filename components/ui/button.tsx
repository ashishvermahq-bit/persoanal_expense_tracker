import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary-solid text-on-primary hover:bg-primary-solid-hover hover:-translate-y-px hover:shadow-card active:translate-y-0 active:bg-primary-solid-active active:shadow-none",
  secondary: "border border-line bg-transparent text-ink hover:bg-ink/5 active:bg-ink/10",
  ghost: "text-ink-2 hover:bg-ink/5 hover:text-ink active:bg-ink/10",
  // Darkens on hover (lightening the red would drop white text below 4.5:1).
  danger: "bg-danger-solid text-on-danger hover:-translate-y-px hover:shadow-card hover:brightness-90 active:translate-y-0 active:brightness-[0.85]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

/** Button styling for non-button elements (e.g. a Next <Link> that looks like a button). */
export function buttonClassName(variant: Variant = "primary", size: Size = "md", className?: string): string {
  return cn(
    // 44px minimum target on touch screens; desktop keeps the compact sizes.
    "inline-flex select-none items-center justify-center gap-2 rounded-lg font-semibold pointer-coarse:min-h-11",
    // Tailwind 4 scale-*/translate-* use the individual `scale`/`translate` properties.
    "transition-[background-color,color,box-shadow,translate,scale,filter] duration-100 ease-out active:scale-[0.96]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-plane",
    "disabled:pointer-events-none disabled:opacity-60 aria-busy:cursor-wait",
    variants[variant],
    sizes[size],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading = false, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName(variant, size, className)}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />}
      {children}
    </button>
  );
});
