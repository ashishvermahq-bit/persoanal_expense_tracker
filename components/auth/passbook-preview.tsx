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
// Category colours from the series tokens: Kirana = aqua, Rent = violet, Food = orange.
// Light/dark tones go through the `cat` utility. Light aqua is 2.74:1 on the card,
// so it's darkened by the smallest step that clears 3:1 (6% → 3.07:1); the others pass as-is.
const ROWS = [
  { date: "02/11", particulars: "UPI · Kirana Store", short: "Kirana", debit: 1_240_00, light: "color-mix(in srgb, var(--series-3) 94%, black)", dark: "var(--series-3)" },
  { date: "05/11", particulars: "Rent · November", short: "Rent", debit: 18_000_00, light: "var(--series-7)", dark: "var(--series-7)" },
  { date: "06/11", particulars: "Swiggy", short: "Swiggy", debit: 486_00, light: "var(--series-2)", dark: "var(--series-2)" },
];
const tone = (r: (typeof ROWS)[number]) => ({ "--cat-l": r.light, "--cat-d": r.dark }) as React.CSSProperties;
const DEBITS = ROWS.reduce((s, r) => s + r.debit, 0);
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
        <div className={`${cols} border-l-[3px] border-l-transparent pl-2 border-b-2 border-double border-line pb-1.5 text-micro font-semibold uppercase tracking-[0.05em] text-ink-3`}>
          <span>Date</span>
          <span>Particulars</span>
          <span className="text-right">Debit ₹</span>
          <span className="text-right">Balance ₹</span>
        </div>

        <div className={`${cols} border-l-[3px] border-l-transparent pl-2 border-b border-line py-2 text-ink-3`}>
          <span className="tabular-nums">01/11</span>
          <span className="italic">Balance b/f</span>
          <span className="text-right">—</span>
          <span className="text-right tabular-nums text-ink-2">{amt(OPENING)}</span>
        </div>

        {LINES.map((r, i) => {
          return (
            <div
              key={r.particulars}
              className={`${cols} cat animate-type-in border-b border-l-[3px] border-line border-l-[color:var(--cat)] pl-2 py-2`}
              style={{ "--i": i, ...tone(r) } as React.CSSProperties}
            >
              <span className="tabular-nums text-ink-3">{r.date}</span>
              <span className="flex min-w-0 items-center gap-1.5 text-ink">
                <span aria-hidden className="size-2 shrink-0 rounded-full bg-[var(--cat)]" />
                <span className="truncate">{r.particulars}</span>
              </span>
              <span className="text-right tabular-nums text-ink">{amt(r.debit)}</span>
              <span className="text-right tabular-nums text-ink-2">{amt(r.balance)}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-ink-3">Closing balance</p>
          <p className="text-stat font-semibold tracking-tight text-ink">
            <BalanceTicker />
          </p>
          {/* Slim split of this month's three debits, in their category colours (2px gaps). */}
          <div className="mt-2 flex h-1.5 max-w-40 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {ROWS.map((r, i) => (
              <span key={r.particulars} className="cat h-full animate-type-in bg-[var(--cat)]" style={{ width: `${(r.debit / DEBITS) * 100}%`, "--i": i, ...tone(r) } as React.CSSProperties} />
            ))}
          </div>
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

/** Phones: a one-line passbook strip under the form, labelled as an example. */
export function PassbookStrip({ className }: { className?: string }) {
  return (
    <figure
      role="img"
      aria-label="Example only, not your data: UPI to Kirana Store ₹1,240, rent ₹18,000 and Swiggy ₹486."
      className={`flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-ink-2 ${className ?? ""}`}
    >
      <span className="rounded-full bg-raised px-2 py-0.5 text-micro font-medium text-ink-3">Example</span>
      {ROWS.map((r, i) => (
        <span key={r.particulars} className="cat flex animate-list-in items-center gap-1.5" style={{ "--i": i + 4, ...tone(r) } as React.CSSProperties}>
          <span aria-hidden className="size-2 rounded-full bg-[var(--cat)]" />
          {r.short}
          <span className="tabular-nums text-ink">{rupees.format(r.debit / 100)}</span>
        </span>
      ))}
    </figure>
  );
}
