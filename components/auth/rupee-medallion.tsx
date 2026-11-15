import { cn } from "@/lib/cn";

/**
 * The ₹ in a soft, primary-tinted coin with a milled (dotted) edge.
 * Bounces in once, then breathes. Both are static under reduced motion.
 * Decorative: the brand name next to it carries the meaning.
 */
export function RupeeMedallion({ size = "lg", className }: { size?: "sm" | "lg"; className?: string }) {
  const lg = size === "lg";
  return (
    <span aria-hidden className={cn("inline-flex shrink-0 animate-bounce-in", className)}>
      <span
        className={cn(
          "relative flex animate-breathe items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/25",
          lg ? "size-24 shadow-card" : "size-10"
        )}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full text-primary">
          <circle cx="50" cy="50" r={lg ? 44 : 42} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth={lg ? 1.2 : 2} strokeDasharray={lg ? "1.5 3.5" : "2 4"} />
        </svg>
        <span className={cn("relative font-semibold leading-none text-primary-ink", lg ? "text-5xl" : "text-xl")}>₹</span>
      </span>
    </span>
  );
}
