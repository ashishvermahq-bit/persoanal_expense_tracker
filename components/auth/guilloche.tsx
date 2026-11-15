import { cn } from "@/lib/cn";

/**
 * Abstract guilloche linework, the fine engraved rosettes and waves of
 * cheques and certificates. Original geometry (rotated ellipses + a sine band);
 * it doesn't reproduce any banknote, emblem or logo.
 *
 * Nested reuse keeps it small (~1.3 KB inline): 5 petals → a fan, 6 rotated
 * fans → a rosette (30 petals), and a scaled copy of the same rosette fills its
 * centre. Stroke attributes live on the parent group so <use> clones inherit them.
 * `currentColor` at low opacity → follows the primary token in both themes.
 */
const FAN = [0, 6, 12, 18, 24];
const ROSETTE = [0, 30, 60, 90, 120, 150];
/**
 * Main rosette: top right in the phone header strip (the attribute), centred in the
 * desktop brand panel from lg up. With `slice`, viewBox (400, 400) is the panel's
 * centre at any aspect ratio; a CSS transform on an SVG element overrides the
 * attribute and its px are viewBox units. Second, smaller rosette: bottom left.
 */
const PLACEMENTS = [
  { transform: "translate(660 150)", className: "lg:[transform:translate(400px,400px)]" },
  { transform: "translate(110 720) scale(0.72)" },
];

/** `idPrefix` keeps <defs> ids unique when two instances share a page. */
export function Guilloche({ idPrefix, className }: { idPrefix: string; className?: string }) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
      className={cn("pointer-events-none absolute inset-0 size-full text-primary", className)}
    >
      <defs>
        <ellipse id={id("p")} rx="232" ry="74" />
        <g id={id("f")}>
          {FAN.map((d) => (
            <use key={d} href={`#${id("p")}`} transform={`rotate(${d})`} />
          ))}
        </g>
        <g id={id("r")}>
          {ROSETTE.map((d) => (
            <use key={d} href={`#${id("f")}`} transform={`rotate(${d})`} />
          ))}
          <circle r="168" strokeDasharray="1 5" />
        </g>
        <pattern id={id("w")} width="80" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 7Q20 0 40 7T80 7" fill="none" stroke="currentColor" strokeWidth="0.7" />
        </pattern>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="0.8" className="opacity-[0.09] dark:opacity-[0.14]">
        {PLACEMENTS.map(({ transform, className: placement }) => (
          <g key={transform} transform={transform} className={placement}>
            <use href={`#${id("r")}`} />
            {/* Inner rosette: same geometry at 1/3 scale, stroke compensated. */}
            <use href={`#${id("r")}`} transform="scale(0.32) rotate(3)" strokeWidth="2.4" />
          </g>
        ))}
        <rect x="0" y="430" width="800" height="70" fill={`url(#${id("w")})`} stroke="none" />
      </g>
    </svg>
  );
}
