/**
 * Date utilities pinned to IST (Asia/Kolkata, UTC+05:30, no DST).
 * "Today", "this month" and financial-year logic must all go through here so
 * that server (often UTC) and client agree.
 */
import type { FyStart } from "@/types/models";

export const IST_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 330;

export interface YearMonth {
  year: number;
  /** 1–12 */
  month: number;
}

export interface DateRange {
  /** inclusive */
  start: Date;
  /** exclusive */
  end: Date;
}

/** Civil date parts of `d` as observed in IST. */
export function istParts(d: Date): { year: number; month: number; day: number } {
  const shifted = new Date(d.getTime() + IST_OFFSET_MINUTES * 60_000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

/** The instant at which `year-month-day 00:00` happens in IST. */
export function istMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MINUTES * 60_000);
}

export function todayIST(now: Date = new Date()): Date {
  const { year, month, day } = istParts(now);
  return istMidnight(year, month, day);
}

export function currentYearMonthIST(now: Date = new Date()): YearMonth {
  const { year, month } = istParts(now);
  return { year, month };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** [start, end) of a calendar month in IST. */
export function monthRange(year: number, month: number): DateRange {
  return {
    start: istMidnight(year, month, 1),
    end: istMidnight(year, month, daysInMonth(year, month) + 1),
  };
}

export function previousMonth({ year, month }: YearMonth): YearMonth {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth({ year, month }: YearMonth): YearMonth {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export function yearMonthOf(d: Date): YearMonth {
  const { year, month } = istParts(d);
  return { year, month };
}

// ---------------------------------------------------------------------------
// Financial year
// ---------------------------------------------------------------------------

/**
 * Indian FY runs 1 April – 31 March and is labelled by its starting year,
 * e.g. FY 2025-26 starts 1 Apr 2025. With `fyStart = "january"` it is just
 * the calendar year.
 */
export function fyStartYear(d: Date, fyStart: FyStart = "april"): number {
  const { year, month } = istParts(d);
  if (fyStart === "january") return year;
  return month >= 4 ? year : year - 1;
}

/** [start, end) of the FY beginning in `startYear`. */
export function fyRange(startYear: number, fyStart: FyStart = "april"): DateRange {
  if (fyStart === "january") {
    return { start: istMidnight(startYear, 1, 1), end: istMidnight(startYear + 1, 1, 1) };
  }
  return { start: istMidnight(startYear, 4, 1), end: istMidnight(startYear + 1, 4, 1) };
}

/** "FY 2025-26" (april) or "2025" (january). */
export function fyLabel(startYear: number, fyStart: FyStart = "april"): string {
  if (fyStart === "january") return String(startYear);
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** The 12 months of an FY in order. */
export function fyMonths(startYear: number, fyStart: FyStart = "april"): YearMonth[] {
  let cur: YearMonth = fyStart === "january" ? { year: startYear, month: 1 } : { year: startYear, month: 4 };
  const out: YearMonth[] = [];
  for (let i = 0; i < 12; i++) {
    out.push(cur);
    cur = nextMonth(cur);
  }
  return out;
}

/** Parse "2025-26" or "2025" into a start year; null on garbage. */
export function parseFyParam(param: string): number | null {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(param.trim());
  if (!m) return null;
  const start = Number(m[1]);
  if (m[2] !== undefined && Number(m[2]) !== (start + 1) % 100) return null;
  return start;
}

// ---------------------------------------------------------------------------
// Display / input
// ---------------------------------------------------------------------------

/** DD/MM/YYYY in IST. */
export function formatDateIN(d: Date): string {
  const { year, month, day } = istParts(d);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** "15 Nov 2026" style, IST. */
export function formatDateLong(d: Date, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: IST_TIMEZONE,
  }).format(d);
}

/** "Nov 2026" */
export function formatMonthLabel({ year, month }: YearMonth, locale = "en-IN"): string {
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1))
  );
}

/** yyyy-mm-dd of `d` in IST — the value for <input type="date">. */
export function toInputDate(d: Date): string {
  const { year, month, day } = istParts(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Parse "yyyy-mm-dd" (from <input type="date">) as IST midnight. */
export function fromInputDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return null;
  return istMidnight(y, mo, d);
}

/** Clamp a desired day-of-month into the month's real length (for recurring rules). */
export function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(1, day), daysInMonth(year, month));
}
