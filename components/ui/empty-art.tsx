/**
 * Original line illustrations for empty states. Stroke-only, token colours
 * (primary for the accent line, muted for structure), aria-hidden.
 */
export type EmptyArt = "ledger" | "receipt" | "gauge";

const common = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function EmptyIllustration({ art }: { art: EmptyArt }) {
  return (
    <svg viewBox="0 0 120 88" className="h-20 w-28" aria-hidden focusable="false">
      {art === "ledger" && (
        <g {...common}>
          <rect x="22" y="10" width="76" height="68" rx="6" stroke="var(--muted)" strokeWidth="2" />
          <path d="M40 10v68" stroke="var(--muted)" strokeWidth="2" />
          <path d="M48 28h38M48 40h30M48 52h34" stroke="var(--muted)" strokeWidth="2" strokeDasharray="2 5" />
          <path d="M48 64h22" stroke="var(--primary)" strokeWidth="3" />
          <circle cx="86" cy="64" r="6" stroke="var(--primary)" strokeWidth="2.5" />
        </g>
      )}
      {art === "receipt" && (
        <g {...common}>
          <path d="M34 8h52v72l-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5-6.5 5z" stroke="var(--muted)" strokeWidth="2" />
          <path d="M44 24h32M44 36h24M44 48h28" stroke="var(--muted)" strokeWidth="2" strokeDasharray="2 5" />
          <path d="M44 60h32" stroke="var(--primary)" strokeWidth="3" />
        </g>
      )}
      {art === "gauge" && (
        <g {...common}>
          <path d="M20 66a40 40 0 0 1 80 0" stroke="var(--muted)" strokeWidth="2" strokeDasharray="2 6" />
          <path d="M20 66a40 40 0 0 1 52-38" stroke="var(--primary)" strokeWidth="4" />
          <path d="M60 66l16-20" stroke="var(--ink-3)" strokeWidth="2.5" />
          <circle cx="60" cy="66" r="4" stroke="var(--ink-3)" strokeWidth="2.5" />
        </g>
      )}
    </svg>
  );
}
