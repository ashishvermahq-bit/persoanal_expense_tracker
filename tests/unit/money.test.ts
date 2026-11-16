import { describe, expect, it } from "vitest";
import {
  formatPaise,
  formatPaiseCompact,
  formatRupeesPlain,
  fromPaise,
  parseRupeeInput,
  percentOf,
  toPaise,
} from "@/lib/money";

describe("toPaise / fromPaise", () => {
  it("converts rupees to integer paise without float drift", () => {
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise(1.005)).toBe(101);
    expect(toPaise(450)).toBe(45000);
    expect(toPaise("1,23,456.78")).toBe(12345678);
    expect(toPaise("₹ 99.5")).toBe(9950);
    expect(toPaise("Rs.450")).toBe(45000);
  });
  it("round-trips", () => {
    expect(fromPaise(toPaise(12345.67))).toBe(12345.67);
  });
  it("rejects garbage", () => {
    expect(() => toPaise("abc")).toThrow(RangeError);
    expect(() => toPaise(NaN)).toThrow(RangeError);
    expect(parseRupeeInput("1.234")).toBeNaN();
    expect(parseRupeeInput("")).toBeNaN();
  });
});

describe("formatPaise (en-IN grouping)", () => {
  it("uses lakh/crore grouping", () => {
    expect(formatPaise(12345678)).toBe("₹1,23,456.78");
    expect(formatPaise(1_00_000_00)).toBe("₹1,00,000");
    expect(formatPaise(1_00_000_00, { showPaise: true })).toBe("₹1,00,000.00");
  });
  it("handles small, zero and negative", () => {
    expect(formatPaise(0)).toBe("₹0");
    expect(formatPaise(50)).toBe("₹0.50");
    expect(formatPaise(-45000)).toBe("-₹450");
    expect(formatPaise(45000, { signed: true })).toBe("+₹450");
  });
  it("plain and compact forms", () => {
    expect(formatRupeesPlain(12345678)).toBe("1,23,456.78");
    expect(formatPaiseCompact(1_50_000_00)).toBe("₹1.5L");
    expect(formatPaiseCompact(2_50_00_000_00)).toBe("₹2.5Cr");
    expect(formatPaiseCompact(4500_00)).toBe("₹4.5K");
    expect(formatPaiseCompact(450_00)).toBe("₹450");
  });
});

describe("percentOf", () => {
  it("computes budget usage", () => {
    expect(percentOf(8000_00, 10000_00)).toBe(80);
    expect(percentOf(12500_00, 10000_00)).toBe(125);
    expect(percentOf(0, 0)).toBe(0);
    expect(percentOf(100, 0)).toBe(100);
  });
});
