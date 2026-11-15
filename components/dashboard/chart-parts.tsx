import type { ReactNode } from "react";

/** Shared Recharts styling, all from theme tokens so charts follow dark mode. */
export const AXIS_TICK = { fill: "var(--ink-3)", fontSize: 12 } as const;
export const GRID_STROKE = "var(--grid)";
export const BASELINE_STROKE = "var(--muted)";

/** Tooltip shell: values lead (strong ink), names follow (secondary ink). */
export function TooltipCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-36 rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink shadow-card">
      <p className="mb-1 font-medium text-ink-2">{title}</p>
      {children}
    </div>
  );
}

/** One tooltip row keyed by a short stroke in the series colour; text stays in ink. */
export function TooltipRow({ color, label, value, dashed }: { color: string; label: string; value: string; dashed?: boolean }) {
  return (
    <p className="flex items-center gap-2">
      <span aria-hidden className="h-0.5 w-3 shrink-0 rounded-full" style={dashed ? { borderTop: `2px dotted ${color}` } : { backgroundColor: color }} />
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-ink-3">{label}</span>
    </p>
  );
}

/** Every chart has a table twin, so no value is gated behind hover. */
export function ChartTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="group mt-3">
      <summary className="inline-flex cursor-pointer select-none items-center rounded text-xs font-medium text-primary-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <span className="group-open:hidden">Show as table</span>
        <span className="hidden group-open:inline">Hide table</span>
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-line">
        <table className="w-full text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-raised text-ink-2">
            <tr>
              {head.map((h, i) => (
                <th key={h} scope="col" className={`px-3 py-2 font-medium ${i > 0 ? "text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={String(r[0])}>
                {r.map((cell, i) => (
                  <td key={i} className={`px-3 py-1.5 ${i > 0 ? "text-right tabular-nums" : "text-ink"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
