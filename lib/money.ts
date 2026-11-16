/**
 * Money utilities. Amounts are stored as integer paise (₹1 = 100 paise) to
 * avoid floating-point drift. Formatting uses the en-IN locale, which yields
 * Indian digit grouping: ₹1,23,456.78.
 */

export const PAISE_PER_RUPEE = 100;

/** Convert a rupee amount (number or user-typed string) to integer paise. */
export function toPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseRupeeInput(rupees) : rupees;
  if (!Number.isFinite(n)) throw new RangeError(`Invalid rupee amount: ${String(rupees)}`);
  // Round half away from zero at the 2nd decimal to match how people read receipts.
  const sign = n < 0 ? -1 : 1;
  // Nudge by epsilon *before* scaling so 1.005 (really 1.00499999…) rounds to 101.
  return sign * Math.round((Math.abs(n) + Number.EPSILON) * PAISE_PER_RUPEE);
}

/** Convert integer paise to a rupee number (for charts/calculations only, never storage). */
export function fromPaise(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

/**
 * Parse human input like "1,23,456.5", "₹ 450", "Rs.450", " 99 " into a
 * rupee number. Returns NaN for garbage.
 */
export function parseRupeeInput(input: string): number {
  const cleaned = input
    .replace(/₹|rs\.?|inr/gi, "")
    .replace(/,/g, "")
    .trim();
  if (!/^-?\d*(\.\d{0,2})?$/.test(cleaned) || cleaned === "" || cleaned === "-" || cleaned === ".") {
    return NaN;
  }
  return Number(cleaned);
}

export interface FormatOptions {
  /** Show paise. Default "auto": only when the amount has a non-zero paise part. */
  showPaise?: boolean | "auto";
  /** Locale for digit grouping. Default en-IN. */
  locale?: string;
  /** ISO currency code. Default INR. */
  currency?: string;
  /** Prefix "+" for positive values (useful for income). */
  signed?: boolean;
}

/** Format integer paise as a currency string: 12345678 → "₹1,23,456.78". */
export function formatPaise(paise: number, opts: FormatOptions = {}): string {
  const { showPaise = "auto", locale = "en-IN", currency = "INR", signed = false } = opts;
  const hasFraction = paise % PAISE_PER_RUPEE !== 0;
  const digits = showPaise === "auto" ? (hasFraction ? 2 : 0) : showPaise ? 2 : 0;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const out = formatter.format(fromPaise(paise));
  return signed && paise > 0 ? `+${out}` : out;
}

/** Compact form for tight UI: 2.5 crore → "₹2.5Cr", 1.5 lakh → "₹1.5L", 4500 → "₹4.5K". */
export function formatPaiseCompact(paise: number, locale = "en-IN"): string {
  const abs = Math.abs(fromPaise(paise));
  const sign = paise < 0 ? "-" : "";
  const trim = (n: number) =>
    Number.isInteger(n) ? n.toString() : n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, "");
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)}K`;
  return formatPaise(paise, { locale, showPaise: false });
}

/** Plain number with Indian grouping and no currency symbol: 12345678 → "1,23,456.78". */
export function formatRupeesPlain(paise: number, locale = "en-IN"): string {
  const hasFraction = paise % PAISE_PER_RUPEE !== 0;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(fromPaise(paise));
}

export function sumPaise(values: Iterable<number>): number {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/** Percentage of `part` over `whole`, one decimal, capped at 999 to keep bars sane. */
export function percentOf(partPaise: number, wholePaise: number): number {
  if (wholePaise <= 0) return partPaise > 0 ? 100 : 0;
  return Math.min(999, Math.round((partPaise / wholePaise) * 1000) / 10);
}
