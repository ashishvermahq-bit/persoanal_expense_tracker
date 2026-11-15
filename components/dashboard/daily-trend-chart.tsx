"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPaise, formatPaiseCompact } from "@/lib/money";
import type { MonthlySummaryDTO } from "@/types/dto";
import { AXIS_TICK, BASELINE_STROKE, ChartTable, GRID_STROKE, TooltipCard, TooltipRow } from "./chart-parts";

interface DailyTrendChartProps {
  currentMonth: MonthlySummaryDTO;
  previousMonth: MonthlySummaryDTO;
  /** Last day of the current month to plot (today, IST): no line through future zeros. */
  throughDay: number;
  /** Days in the current month (x-axis length). */
  currentDays: number;
  /** Days in the previous month (so a 30-day month doesn't end with a fake 0). */
  previousDays: number;
  currentLabel: string;
  previousLabel: string;
}

type Row = { day: number; current: number | null; previous: number | null };

// Emphasis form: this month is the accent, last month is context in grey.
const CURRENT = "var(--primary)";
const PREVIOUS = "var(--muted)";

function TrendTooltip({ active, payload, labels }: { active?: boolean; payload?: { payload: Row }[]; labels: [string, string] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload;
  return (
    <TooltipCard title={`Day ${row.day}`}>
      {row.current !== null && <TooltipRow color={CURRENT} label={labels[0]} value={formatPaise(row.current)} />}
      {row.previous !== null && <TooltipRow color={PREVIOUS} label={labels[1]} value={formatPaise(row.previous)} dashed />}
    </TooltipCard>
  );
}

export function DailyTrendChart({ currentMonth, previousMonth, throughDay, currentDays, previousDays, currentLabel, previousLabel }: DailyTrendChartProps) {
  const data: Row[] = Array.from({ length: Math.max(currentDays, previousDays) }, (_, i) => ({
    day: i + 1,
    current: i < throughDay ? (currentMonth.dailyTotalsPaise[i] ?? 0) : null,
    previous: i < previousDays ? (previousMonth.dailyTotalsPaise[i] ?? 0) : null,
  }));

  return (
    <div>
      {/* Legend: line keys mirror the marks; text stays in ink. */}
      <ul className="mb-3 flex flex-wrap gap-4 text-xs text-ink-2" aria-label="Legend">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ backgroundColor: CURRENT }} />
          {currentLabel}
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-4" style={{ borderTop: `2px dotted ${PREVIOUS}` }} />
          {previousLabel}
        </li>
      </ul>
      <div className="h-64" role="img" aria-label={`Daily spending, ${currentLabel} compared with ${previousLabel}. Table view below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="day" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: BASELINE_STROKE }} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => formatPaiseCompact(v)} />
            <Tooltip content={<TrendTooltip labels={[currentLabel, previousLabel]} />} cursor={{ stroke: "var(--ink-3)", strokeWidth: 1 }} />
            <Line type="monotone" dataKey="previous" stroke={PREVIOUS} strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round" dot={false} activeDot={false} isAnimationActive={false} connectNulls={false} />
            <Line
              type="monotone"
              dataKey="current"
              stroke={CURRENT}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: 4, fill: CURRENT, stroke: "var(--surface)", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption={`Daily spending, ${currentLabel} vs ${previousLabel}`}
        head={["Day", currentLabel, previousLabel]}
        rows={data.map((r) => [r.day, r.current === null ? "—" : formatPaise(r.current), r.previous === null ? "—" : formatPaise(r.previous)])}
      />
    </div>
  );
}
