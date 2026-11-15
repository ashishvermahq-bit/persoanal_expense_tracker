import { describe, expect, it } from "vitest";
import { CATEGORY_COLORS } from "@/components/categories/category-icon";
import { CARD_SURFACE, categoryTones, contrast, contrastOnTint } from "@/lib/color";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/lib/seed/categories";

const ALL = [...new Set([...DEFAULT_EXPENSE_CATEGORIES.map((c) => c.color!), ...CATEGORY_COLORS].map((c) => c.toLowerCase()))];
const lum = (hex: string) => contrast(hex, "#000000"); // monotonic in luminance

describe("categoryTones", () => {
  it.each(ALL)("%s clears 3:1 on its own tint in both themes", (c) => {
    const t = categoryTones(c)!;
    expect(contrastOnTint(t.light, CARD_SURFACE.light)).toBeGreaterThanOrEqual(3);
    expect(contrastOnTint(t.dark, CARD_SURFACE.dark)).toBeGreaterThanOrEqual(3);
  });

  it("keeps the original colour wherever it already passes", () => {
    for (const c of ALL) {
      const t = categoryTones(c)!;
      if (contrastOnTint(c, CARD_SURFACE.light) >= 3) expect(t.light).toBe(c);
      if (contrastOnTint(c, CARD_SURFACE.dark) >= 3) expect(t.dark).toBe(c);
    }
  });

  it("only nudges darker on light and lighter on dark", () => {
    for (const c of ALL) {
      const t = categoryTones(c)!;
      expect(lum(t.light)).toBeLessThanOrEqual(lum(c) + 1e-9);
      expect(lum(t.dark)).toBeGreaterThanOrEqual(lum(c) - 1e-9);
    }
  });

  it("returns null for missing or invalid colours (muted token fallback)", () => {
    expect(categoryTones(null)).toBeNull();
    expect(categoryTones("teal")).toBeNull();
  });
});
