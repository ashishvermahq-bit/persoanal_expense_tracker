"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { BudgetMeter } from "@/components/budgets/budget-meter";
import { hueStyle, type Hue } from "@/lib/color";
import { formatPaise } from "@/lib/money";

/**
 * "Living ledger": an illustrative sample month for the auth brand panel.
 * Clearly labelled "Example" + "Sample data"; screen readers get one line
 * (role="img"), not fake numbers. Motion runs once (count-up, sparkline
 * draw-in, row stagger), never loops, and is static under reduced motion.
 */
const SPENT_PAISE = 24_350_00;
// Colours via series hues (contrast-safe tones); names and amounts stay ink.
const ROWS: { name: string; paise: number; hue: Hue }[] = [
  { name: "Rent", paise: 12_000_00, hue: 7 },
  { name: "Kirana", paise: 8_200_00, hue: 3 },
  { name: "UPI payments", paise: 4_150_00, hue: 1 },
];
// Cumulative spend across the month so far, as a 120×32 polyline.
const SPARK = "M0 30 L8 22 L16 21 L24 20 L32 18 L40 17 L48 17 L56 14 L64 13 L72 12 L80 10 L88 9 L96 8 L104 6 L112 5 L120 3";

/** ₹0 → value once (~900ms). Width reserved by a pseudo-element, so no shift and the value is read once. */
function CountUp({ paise }: { paise: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      const eased = 1 - (1 - t) ** 3;
      el.textContent = formatPaise(t < 1 ? Math.round((paise * eased) / 100) * 100 : paise);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paise]);

  const final = formatPaise(paise);
  return (
    <span className="inline-grid">
      <span aria-hidden data-final={final} className="invisible col-start-1 row-start-1 before:content-[attr(data-final)]" />
      <span ref={ref} className="col-start-1 row-start-1">
        {final}
      </span>
    </span>
  );
}

export function LedgerPreview({ className }: { className?: string }) {
  const max = Math.max(...ROWS.map((r) => r.paise));
  return (
    <figure
      role="img"
      aria-label="Example only, not your data: a sample month with ₹24,350 spent across rent, kirana and UPI payments, and a kirana budget 82% used."
      className={`rounded-xl border border-line bg-surface p-5 shadow-card ${className ?? ""}`}
    >
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-2">Example: your month at a glance</span>
        <span className="rounded-full bg-raised px-2 py-0.5 text-micro font-medium text-ink-3">Sample data</span>
      </figcaption>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-ink-3">Spent this month</p>
          <p className="text-stat font-semibold tracking-tight text-ink">
            <CountUp paise={SPENT_PAISE} />
          </p>
        </div>
        {/* 2px sparkline that draws itself once (stroke-dashoffset via animate-draw).
            Red (danger token) as a spend line; decorative, the figure's aria-label carries the meaning. */}
        <svg viewBox="0 0 120 32" className="h-10 w-32 overflow-visible" aria-hidden>
          <path d={SPARK} pathLength={1} fill="none" stroke="var(--danger)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" className="animate-draw" />
          <circle cx="120" cy="3" r="3" fill="var(--danger)" stroke="var(--surface)" strokeWidth="2" className="animate-fade-in [animation-delay:1.1s]" />
        </svg>
      </div>

      <ul className="mt-4 space-y-2.5">
        {ROWS.map((r, i) => (
          <li key={r.name} className="cat animate-list-in" style={{ "--i": i + 3, ...hueStyle(r.hue) } as React.CSSProperties}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 text-ink-2">
                <span aria-hidden className="size-2 rounded-full bg-[var(--cat)]" />
                {r.name}
              </span>
              <span className="tabular-nums text-ink">{formatPaise(r.paise)}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-raised">
              <div className="h-full rounded-full bg-[var(--cat)]" style={{ width: `${(r.paise / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 border-t border-line">
        <BudgetMeter categoryName="Kirana budget" status="warning" spendPaise={8_200_00} budgetPaise={10_000_00} />
      </div>
    </figure>
  );
}

/** Phones: a one-line mini version below the form, labelled as an example. */
export function LedgerStrip({ className }: { className?: string }) {
  return (
    <figure
      role="img"
      aria-label="Example only, not your data: ₹24,350 spent this month, kirana budget 82% used."
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-ink-2 ${className ?? ""}`}
    >
      <span className="rounded-full bg-raised px-2 py-0.5 text-micro font-medium text-ink-3">Example</span>
      <span className="animate-list-in" style={{ "--i": 4 } as React.CSSProperties}>
        <span className="font-semibold tabular-nums text-ink">{formatPaise(SPENT_PAISE)}</span> spent this month
      </span>
      <span className="flex animate-list-in items-center gap-1 font-medium text-warning-ink" style={{ "--i": 5 } as React.CSSProperties}>
        <AlertTriangle className="size-3.5 text-warning" aria-hidden />
        Kirana 82% used
      </span>
    </figure>
  );
}
