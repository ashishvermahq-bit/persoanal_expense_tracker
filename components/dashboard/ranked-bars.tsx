"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatPaise, formatPaiseCompact } from "@/lib/money";
import { AXIS_TICK, ChartTable, TooltipCard, TooltipRow } from "./chart-parts";

export interface RankedItem {
  key: string;
  name: string;
  totalPaise: number;
  count: number;
}

const FILL = "var(--series-1)";
const ROW_HEIGHT = 36;

function BarTooltip({ active, payload, total }: { active?: boolean; payload?: { payload: RankedItem }[]; total: number }) {
  if (!active || !payload?.length) return null;
  const item = payload[0]!.payload;
  const share = total ? Math.round((item.totalPaise / total) * 100) : 0;
  return (
    <TooltipCard title={item.name}>
      <TooltipRow color={FILL} label={`${share}% · ${item.count} ${item.count === 1 ? "expense" : "expenses"}`} value={formatPaise(item.totalPaise)} />
    </TooltipCard>
  );
}

/**
 * Part-to-whole as ranked horizontal bars, largest first, one hue.
 * (Colouring bars by rank would repaint entities when data changes; the name
 * on each row carries identity.) Past `max` rows the tail folds into "Other".
 */
export function RankedBars({ items, label, max = 7 }: { items: RankedItem[]; label: string; max?: number }) {
  const sorted = [...items].sort((a, b) => b.totalPaise - a.totalPaise);
  const head = sorted.slice(0, max);
  const tail = sorted.slice(max);
  const data: RankedItem[] = tail.length
    ? [...head, { key: "other", name: "Other", totalPaise: tail.reduce((s, c) => s + c.totalPaise, 0), count: tail.reduce((s, c) => s + c.count, 0) }]
    : head;
  const total = data.reduce((s, d) => s + d.totalPaise, 0);

  return (
    <div>
      <div style={{ height: data.length * ROW_HEIGHT + 8 }} role="img" aria-label={`${label}, largest first. Table view below.`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }} barCategoryGap={8}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis dataKey="name" type="category" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--muted)" }} width={104} interval={0} />
            <Tooltip content={<BarTooltip total={total} />} cursor={{ fill: "var(--raised)" }} />
            {/* ≤24px thick, 4px rounded data-end, square at the baseline. */}
            <Bar dataKey="totalPaise" fill={FILL} barSize={20} radius={[0, 4, 4, 0]} isAnimationActive={false}>
              <LabelList dataKey="totalPaise" position="right" offset={6} formatter={(v: unknown) => formatPaiseCompact(Number(v))} fill="var(--ink-2)" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ChartTable
        caption={label}
        head={["Name", "Amount", "Share", "Count"]}
        rows={data.map((d) => [d.name, formatPaise(d.totalPaise), `${total ? Math.round((d.totalPaise / total) * 100) : 0}%`, d.count])}
      />
    </div>
  );
}
