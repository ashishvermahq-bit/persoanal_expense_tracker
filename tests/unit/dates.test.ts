import { describe, expect, it } from "vitest";
import {
  clampDay,
  currentYearMonthIST,
  formatDateIN,
  fromInputDate,
  fyLabel,
  fyMonths,
  fyRange,
  fyStartYear,
  istParts,
  monthRange,
  parseFyParam,
  previousMonth,
  todayIST,
  toInputDate,
} from "@/lib/dates";

describe("IST day boundaries", () => {
  it("treats 20:00 UTC as the next IST day", () => {
    // 2026-03-31 20:00 UTC = 2026-04-01 01:30 IST
    const d = new Date("2026-03-31T20:00:00Z");
    expect(istParts(d)).toEqual({ year: 2026, month: 4, day: 1 });
    expect(formatDateIN(d)).toBe("01/04/2026");
    expect(currentYearMonthIST(d)).toEqual({ year: 2026, month: 4 });
  });
  it("todayIST is 18:30 UTC of the previous UTC day", () => {
    const d = new Date("2026-11-15T05:00:00Z");
    expect(todayIST(d).toISOString()).toBe("2026-11-14T18:30:00.000Z");
  });
  it("monthRange is [IST midnight 1st, IST midnight next 1st)", () => {
    const r = monthRange(2026, 2);
    expect(r.start.toISOString()).toBe("2026-01-31T18:30:00.000Z");
    expect(r.end.toISOString()).toBe("2026-02-28T18:30:00.000Z");
  });
  it("input date round trip", () => {
    const d = fromInputDate("2026-11-15")!;
    expect(toInputDate(d)).toBe("2026-11-15");
    expect(fromInputDate("2026-02-30")).toBeNull();
    expect(fromInputDate("nope")).toBeNull();
  });
  it("previousMonth wraps year", () => {
    expect(previousMonth({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
  });
  it("clampDay handles 31st in Feb", () => {
    expect(clampDay(2026, 2, 31)).toBe(28);
    expect(clampDay(2028, 2, 31)).toBe(29);
  });
});

describe("Indian financial year", () => {
  it("March belongs to the previous FY, April starts a new one", () => {
    expect(fyStartYear(new Date("2026-03-31T10:00:00Z"))).toBe(2025);
    expect(fyStartYear(new Date("2026-04-01T10:00:00Z"))).toBe(2026);
    // 31 Mar 23:00 IST is still FY 2025-26
    expect(fyStartYear(new Date("2026-03-31T17:30:00Z"))).toBe(2025);
    // 1 Apr 00:00 IST
    expect(fyStartYear(new Date("2026-03-31T18:30:00Z"))).toBe(2026);
  });
  it("january mode is the calendar year", () => {
    expect(fyStartYear(new Date("2026-03-31T10:00:00Z"), "january")).toBe(2026);
    expect(fyLabel(2026, "january")).toBe("2026");
  });
  it("labels and ranges", () => {
    expect(fyLabel(2025)).toBe("FY 2025-26");
    expect(fyLabel(2099)).toBe("FY 2099-00");
    const r = fyRange(2025);
    expect(r.start.toISOString()).toBe("2025-03-31T18:30:00.000Z");
    expect(r.end.toISOString()).toBe("2026-03-31T18:30:00.000Z");
    const months = fyMonths(2025);
    expect(months[0]).toEqual({ year: 2025, month: 4 });
    expect(months[11]).toEqual({ year: 2026, month: 3 });
  });
  it("parses FY params", () => {
    expect(parseFyParam("2025-26")).toBe(2025);
    expect(parseFyParam("2025")).toBe(2025);
    expect(parseFyParam("2025-27")).toBeNull();
    expect(parseFyParam("abc")).toBeNull();
  });
});
