"use client";

import { useEffect, useRef } from "react";
import { BudgetMeter } from "@/components/budgets/budget-meter";
import { formatPaise } from "@/lib/money";

/**
 * Illustrative sample month for the auth brand panel. Clearly labelled as an
 * example; screen readers get a one-line summary instead of fake numbers.
 * Motion runs once (count-up, sparkline draw, row stagger), never loops, and
 * is skipped under reduced motion.
 */
const SPENT_PAISE = 24_350_00;
const ROWS = [
  { name: "Rent", paise: 12_000_00, color: "var(--series-7)" },
  { name: "Kirana", paise: 8_200_00, color: "var(--series-3)" },
  { name: "Food & dining", paise: 4_150_00, color: "var(--series-2)" },
];
// Cumulative spend across the month so far, as a 120×32 polyline.
const SPARK = "M0 30 L8 22 L16 21 L24 20 L32 18 L40 17 L48 17 L56 14 L64 13 L72 12 L80 10 L88 9 L96 8 L104 6 L112 5 L120 3";

function CountUp({ paise }: { paise: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    const duration = 900;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      // Whole rupees while counting; exact value on the last frame.
      el.textContent = formatPaise(t < 1 ? Math.round((paise * eased) / 100) * 100 : paise);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [paise]);

  const final = formatPaise(paise);
  // The invisible final value reserves the width, so counting never shifts layout.
  return (
    <span className="relative inline-block">
      <span className="invisible">{final}</span>
      <span ref={ref} className="absolute inset-0">
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
      aria-label="Example only, not your data: a sample month showing ₹24,350 spent, split across rent, kirana and food, with a kirana budget 82% used."
      className={`rounded-xl border border-line bg-surface p-5 shadow-card ${className ?? ""}`}
    >
      <figcaption className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-3">Example: your month at a glance</span>
        <span className="rounded-full bg-raised px-2 py-0.5 text-micro font-medium text-ink-3">Sample data</span>
      </figcaption>

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-ink-3">Spent this month</p>
          <p className="text-stat font-semibold tracking-tight text-ink">
            <CountUp paise={SPENT_PAISE} />
          </p>
        </div>
        <svg viewBox="0 0 120 32" className="h-10 w-32 overflow-visible" aria-hidden>
          <path d={SPARK} pathLength={1} fill="none" stroke="var(--primary)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" className="animate-draw" />
          <circle cx="120" cy="3" r="3" fill="var(--primary)" stroke="var(--surface)" strokeWidth="2" className="animate-fade-in [animation-delay:1.1s]" />
        </svg>
      </div>

      <ul className="mt-4 space-y-2.5">
        {ROWS.map((r, i) => (
          <li key={r.name} className="animate-list-in" style={{ "--i": i + 3 } as React.CSSProperties}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 text-ink-2">
                <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: r.color }} />
                {r.name}
              </span>
              <span className="tabular-nums text-ink">{formatPaise(r.paise)}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-raised">
              <div className="h-full rounded-full" style={{ width: `${(r.paise / max) * 100}%`, backgroundColor: r.color }} />
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
