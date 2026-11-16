"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPaise, formatPaiseCompact } from "@/lib/money";
import { AXIS_TICK, BASELINE_STROKE, ChartTable, GRID_STROKE, TooltipCard, TooltipRow } from "./chart-parts";

export interface SeriesPoint {
  key: string;
  label: string;
  totalPaise: number;
}

const FILL = "var(--series-1)";

function ColumnTooltip({ active, payload }: { active?: boolean; payload?: { payload: SeriesPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!.payload;
  return (
    <TooltipCard title={p.label}>
      <TooltipRow color={FILL} label="spent" value={formatPaise(p.totalPaise)} />
    </TooltipCard>
  );
}

/** Spend per time bucket (day or month): one hue, ≤24px columns, 4px rounded tops, table twin. */
export function SpendColumns({ series, caption }: { series: SeriesPoint[]; caption: string }) {
  const many = series.length > 12;
  return (
    <div>
      <div className="h-56" role="img" aria-label={`${caption}. Table view below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap={many ? 2 : 8}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: BASELINE_STROKE }} interval={many ? "preserveStartEnd" : 0} minTickGap={8} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => formatPaiseCompact(v)} allowDecimals={false} />
            <Tooltip content={<ColumnTooltip />} cursor={{ fill: "var(--raised)" }} />
            <Bar dataKey="totalPaise" fill={FILL} maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable caption={caption} head={["Period", "Spent"]} rows={series.map((s) => [s.label, formatPaise(s.totalPaise)])} />
    </div>
  );
}
