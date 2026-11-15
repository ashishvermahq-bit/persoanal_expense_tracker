import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyIllustration, type EmptyArt } from "./empty-art";

/**
 * Empty state: an original line illustration (or icon bubble) that breathes,
 * a title, one line of help, and at most one action.
 */
export function EmptyState({ icon: Icon, art, title, description, action }: { icon?: LucideIcon; art?: EmptyArt; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex animate-fade-in flex-col items-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
      {art ? (
        <div className="mb-3 animate-breathe">
          <EmptyIllustration art={art} />
        </div>
      ) : Icon ? (
        <div className="mb-3 flex size-12 animate-breathe items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="size-6" aria-hidden />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-3">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
