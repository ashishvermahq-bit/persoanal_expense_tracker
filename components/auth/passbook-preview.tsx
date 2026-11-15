"use client";

import { useEffect, useRef } from "react";
import { Check } from "lucide-react";

/**
 * "Paisa passbook": an illustrative, passbook-style ruled stub. Brought-forward
 * balance, three debits that type in one after another with a running balance,
 * then a "Hisaab complete" seal that presses into place. Clearly labelled as
 * sample data; screen readers get a one-line summary (role="img").
 *
 * Almost all HTML text (no SVG beyond one icon). Motion runs once and is
 * static under reduced motion. The closing balance's width is reserved, so
 * nothing shifts.
 */
const OPENING = 85_000_00;
const ROWS = [
  { date: "02/11", particulars: "UPI · Kirana Store", debit: 1_240_00 },
  { date: "05/11", particulars: "Rent · November", debit: 18_000_00 },
  { date: "06/11", particulars: "Swiggy", debit: 486_00 },
];
// Running balance per row, computed once (static sample data).
const LINES = ROWS.map((r, i) => ({ ...r, balance: OPENING - ROWS.slice(0, i + 1).reduce((s, x) => s + x.debit, 0) }));
const CLOSING = LINES[LINES.length - 1]!.balance;

const num = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const amt = (paise: number) => num.format(paise / 100);
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Ticks from the opening balance down to the closing one, timed with the rows. */
function BalanceTicker() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now() + 200;
    const duration = ROWS.length * 260 + 380;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const eased = 1 - (1 - t) ** 3;
      el.textContent = rupees.format(Math.round(OPENING - (OPENING - CLOSING) * eased) / 100);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  const final = rupees.format(CLOSING / 100);
  return (
    <span className="relative inline-block tabular-nums">
      <span className="invisible">{rupees.format(OPENING / 100)}</span>
      <span ref={ref} className="absolute inset-0 text-right">
        {final}
      </span>
    </span>
  );
}

export function PassbookPreview({ className }: { className?: string }) {
  const cols = "grid grid-cols-[3rem_1fr_4.75rem_5.25rem] items-baseline gap-x-2";
  return (
    <figure
      role="img"
      aria-label="Example only, not your data: a passbook-style page. ₹85,000 brought forward, then UPI to Kirana Store ₹1,240, rent ₹18,000 and Swiggy ₹486, leaving ₹65,274, stamped Hisaab complete."
      className={`relative rounded-xl border border-line bg-surface shadow-card ${className ?? ""}`}
    >
      <figcaption className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-ink-3">Example: Paisa passbook</span>
        <span className="rounded-full bg-raised px-2 py-0.5 text-micro font-medium text-ink-3">Sample data</span>
      </figcaption>

      <div className="px-4 pt-2 text-xs">
        {/* Column heads: the passbook's ruled header. */}
        <div className={`${cols} border-b-2 border-double border-line pb-1.5 text-micro font-semibold uppercase tracking-[0.05em] text-ink-3`}>
          <span>Date</span>
          <span>Particulars</span>
          <span className="text-right">Debit ₹</span>
          <span className="text-right">Balance ₹</span>
        </div>

        <div className={`${cols} border-b border-line py-2 text-ink-3`}>
          <span className="tabular-nums">01/11</span>
          <span className="italic">Balance b/f</span>
          <span className="text-right">—</span>
          <span className="text-right tabular-nums text-ink-2">{amt(OPENING)}</span>
        </div>

        {LINES.map((r, i) => {
          return (
            <div key={r.particulars} className={`${cols} animate-type-in border-b border-line py-2`} style={{ "--i": i } as React.CSSProperties}>
              <span className="tabular-nums text-ink-3">{r.date}</span>
              <span className="truncate text-ink">{r.particulars}</span>
              <span className="text-right tabular-nums text-ink">{amt(r.debit)}</span>
              <span className="text-right tabular-nums text-ink-2">{amt(r.balance)}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-3">
        <div>
          <p className="text-xs text-ink-3">Closing balance</p>
          <p className="text-stat font-semibold tracking-tight text-ink">
            <BalanceTicker />
          </p>
        </div>
        {/* The seal: a rubber stamp in success ink that presses into place. */}
        <span
          className="flex animate-stamp items-center gap-1.5 rounded-lg border-[3px] border-double border-success-ink px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-success-ink"
          style={{ "--i": ROWS.length } as React.CSSProperties}
        >
          <Check className="size-4" strokeWidth={3} aria-hidden />
          Hisaab complete
        </span>
      </div>
    </figure>
  );
}
