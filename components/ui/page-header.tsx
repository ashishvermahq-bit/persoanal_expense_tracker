import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Hue } from "@/lib/color";
import { HueIcon } from "./hue-icon";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Surface card: 12px radius, hairline border, soft shadow. Callers set padding (p-4 by convention). */
export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement> & { "data-testid"?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface shadow-card", className)} {...rest}>
      {children}
    </section>
  );
}

/**
 * H2 section label: 14px uppercase, tracked, secondary ink. An optional icon in
 * a series hue gives each section its own colour; the text stays ink.
 */
export function SectionLabel({ children, className, icon, hue }: { children: ReactNode; className?: string; icon?: LucideIcon; hue?: Hue }) {
  return (
    <h2 className={cn("flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.05em] text-ink-2", className)}>
      {icon && hue && <HueIcon icon={icon} hue={hue} size="xs" />}
      {children}
    </h2>
  );
}

/** Skeleton placeholder: pulses 0.6 → 1 opacity (1.5s). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-raised", className)} />;
}
