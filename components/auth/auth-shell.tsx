import type { ReactNode } from "react";
import { FileText, IndianRupee, Lock, Zap } from "lucide-react";
import { HueIcon } from "@/components/ui/hue-icon";
import type { Hue } from "@/lib/color";
import { Guilloche } from "./guilloche";
import { PassbookPreview, PassbookStrip } from "./passbook-preview";
import { RupeeMedallion } from "./rupee-medallion";

// Only claims the product actually backs today.
// Each in its own series hue (contrast-safe tones via HueIcon); the text stays ink.
const PROOF_POINTS: { Icon: typeof IndianRupee; hue: Hue; text: string }[] = [
  { Icon: IndianRupee, hue: 1, text: "₹ formatted the Indian way (₹1,23,456)" },
  { Icon: FileText, hue: 7, text: "FY reports & 80C/80D tags" },
  { Icon: Zap, hue: 2, text: "Quick add in 3 taps" },
];

/**
 * Auth layout. Phones: compact brand header, then the form card (above the fold
 * at 390×844). ≥1024px: split screen, brand panel 55% (guilloche, ₹ medallion,
 * tagline, sample ledger, proof points), form 45%, vertically centred.
 */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh flex-1 bg-plane lg:grid-cols-[55fr_45fr]">
      {/* One guilloche for both layouts (keeps inline SVG small): a faded strip behind
          the phone header; the full brand-panel background from lg up. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 animate-fade-in overflow-hidden [mask-image:linear-gradient(to_bottom,black,transparent)] lg:inset-y-0 lg:right-auto lg:h-auto lg:w-[55%] lg:[mask-image:none]"
      >
        <Guilloche idPrefix="pz" className="animate-drift" />
      </div>
      <aside className="relative hidden animate-fade-in overflow-hidden border-r border-line lg:flex">
        <div className="relative flex w-full flex-col justify-between gap-10 px-12 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] xl:px-16">
          <p className="text-lg font-semibold tracking-tight text-ink">Paisa</p>

          <div className="max-w-md">
            <RupeeMedallion size="lg" />
            <p className="mt-6 text-4xl font-semibold tracking-tight text-ink xl:text-5xl">
              Har rupaye ka <span className="text-primary-ink">hisaab.</span>
            </p>
            <p className="mt-2 text-lg text-ink-2">Every rupee, accounted for.</p>
            <PassbookPreview className="mt-8 max-w-sm" />
          </div>

          <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-ink-2">
            {PROOF_POINTS.map(({ Icon, hue, text }, i) => (
              <li key={text} className="flex animate-list-in items-center gap-2" style={{ "--i": i + 6 } as React.CSSProperties}>
                <HueIcon icon={Icon} hue={hue} size="sm" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="relative flex flex-col pb-safe pt-safe">
        {/* Phones: top-aligned so the brand header sits over the linework strip. Desktop: centred. */}
        <div className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col px-4 pb-6 pt-10 sm:px-0 lg:justify-center lg:py-12">
          <div className="mb-5 flex animate-fade-in items-center gap-3 lg:hidden">
            <RupeeMedallion size="sm" />
            <div>
              <p className="font-semibold leading-tight text-ink">Paisa</p>
              <p className="text-xs text-ink-3">
                Har rupaye ka <span className="font-medium text-primary-ink">hisaab</span> · Every rupee, accounted for.
              </p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 text-sm text-ink-3">{subtitle}</p>

          <div className="mt-5 animate-slide-up rounded-xl border border-line bg-surface p-5 shadow-card [animation-delay:60ms] sm:p-6">
            {children}
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-3">
              <Lock className="size-3.5" aria-hidden />
              Your data is private to your account.
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-ink-3">{footer}</p>
          {/* Phones: a one-line taste of the passbook, below the form (never pushes it down). */}
          <PassbookStrip className="mt-6 lg:hidden" />
        </div>
      </main>
    </div>
  );
}

/** Footer link style shared by the login/signup pages. */
export const authLinkClassName =
  "rounded font-semibold text-primary-ink underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
