import type { ReactNode } from "react";
import { IndianRupee } from "lucide-react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
            <IndianRupee className="size-5" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">{children}</div>
        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">{footer}</p>
      </div>
    </div>
  );
}
