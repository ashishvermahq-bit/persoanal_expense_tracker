import { describe, expect, it } from "vitest";
import { CATEGORY_COLORS } from "@/components/categories/category-icon";
import { CARD_SURFACE, categoryTones, contrast, contrastOnTint, hueStyle, type Hue } from "@/lib/color";
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

describe("hueStyle (series hues as icon tones)", () => {
  // Mirrors app/globals.css --series-1..8 (light / dark).
  const LIGHT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
  const DARK = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"];
  const mixBlack = (hex: string, pct: number) =>
    "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - pct / 100)).toString(16).padStart(2, "0")).join("");
  const darkenOf = (hue: number) => {
    const v = (hueStyle(hue as Hue) as Record<string, string>)["--cat-l"]!;
    const m = / (\d+)%, black\)$/.exec(v);
    return m ? 100 - Number(m[1]) : 0;
  };

  it.each([1, 2, 3, 4, 5, 6, 7, 8])("series-%i clears 3:1 on its tint in both themes, with the smallest darkening", (hue) => {
    const d = darkenOf(hue);
    expect(contrastOnTint(mixBlack(LIGHT[hue - 1]!, d), CARD_SURFACE.light)).toBeGreaterThanOrEqual(3);
    if (d > 0) expect(contrastOnTint(mixBlack(LIGHT[hue - 1]!, d - 2), CARD_SURFACE.light)).toBeLessThan(3);
    expect(contrastOnTint(DARK[hue - 1]!, CARD_SURFACE.dark)).toBeGreaterThanOrEqual(3);
  });
});
