/**
 * Category colour tones. A category's colour is user data (any hex). We show it
 * at full strength, with an 18% tint of the same colour behind icons, and only
 * nudge it when it would fail 3:1 (WCAG non-text contrast) in a theme:
 * darker on the light surface, lighter on the dark surface, in 4% steps, the
 * smallest change that passes. Mixing is sRGB to match CSS `color-mix(in srgb)`.
 */

export const CARD_SURFACE = { light: "#fcfcfb", dark: "#1a1a19" } as const;
export const TINT = 0.18;
const MIN_CONTRAST = 3;

type RGB = [number, number, number];

function parse(hex: string): RGB | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? m[1]!.replace(/./g, (c) => c + c) : m[1]!;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}
const toHex = (c: RGB) => "#" + c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

/** a·(1−t) + b·t, per channel. */
function mix(a: RGB, b: RGB, t: number): RGB {
  return [0, 1, 2].map((i) => a[i]! * (1 - t) + b[i]! * t) as RGB;
}

function luminance([r, g, b]: RGB): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: string, b: string): number {
  const ca = parse(a);
  const cb = parse(b);
  if (!ca || !cb) return 1;
  const [x, y] = [luminance(ca), luminance(cb)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** The glyph's real background: an 18% tint of the colour over the card surface. */
export function tintOver(color: string, surface: string): string {
  return toHex(mix(parse(surface)!, parse(color)!, TINT));
}

/** Contrast of a colour drawn on its own tint (the strictest place it appears). */
export function contrastOnTint(color: string, surface: string): number {
  return contrast(color, tintOver(color, surface));
}

function nudge(color: string, theme: "light" | "dark"): string {
  const base = parse(color);
  if (!base) return color;
  const surface = CARD_SURFACE[theme];
  const target: RGB = theme === "light" ? [0, 0, 0] : [255, 255, 255];
  for (let step = 0; step <= 25; step++) {
    const candidate = toHex(mix(base, target, step * 0.04));
    if (contrastOnTint(candidate, surface) >= MIN_CONTRAST) return step === 0 ? color.toLowerCase() : candidate;
  }
  return toHex(target);
}

export interface CategoryTones {
  light: string;
  dark: string;
}

const cache = new Map<string, CategoryTones>();

/** Light/dark tones for a category colour; the original colour wherever it already passes. */
export function categoryTones(color: string | null | undefined): CategoryTones | null {
  if (!color || !parse(color)) return null;
  const key = color.toLowerCase();
  let t = cache.get(key);
  if (!t) {
    t = { light: nudge(key, "light"), dark: nudge(key, "dark") };
    cache.set(key, t);
  }
  return t;
}

/** CSS custom properties consumed by the `cat-*` utilities in globals.css. */
export function categoryStyle(color: string | null | undefined): React.CSSProperties {
  const t = categoryTones(color);
  return (t ? { "--cat-l": t.light, "--cat-d": t.dark } : {}) as React.CSSProperties;
}
