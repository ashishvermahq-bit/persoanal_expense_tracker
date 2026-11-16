import Link from "next/link";
import { RupeeMedallion } from "@/components/auth/rupee-medallion";

/** Plain reading layout for the public legal pages (signed in or out). */
export default function LegalLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh flex-1 bg-plane px-4 pb-safe pt-safe">
      <div className="mx-auto max-w-2xl py-8 sm:py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <RupeeMedallion size="sm" />
          <span className="font-semibold text-ink">Paisa</span>
        </Link>
        <article className="space-y-4 text-sm leading-relaxed text-ink-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-ink [&_h2]:pt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
          {children}
        </article>
      </div>
    </div>
  );
}
