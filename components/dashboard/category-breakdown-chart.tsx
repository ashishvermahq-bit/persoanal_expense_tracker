"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatPaise } from "@/lib/money";
import type { MonthlySummaryDTO } from "@/types/dto";

const CATEGORY_COLORS = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#6250d6", // violet
  "#e34948", // red
];

interface CategoryBreakdownChartProps {
  summary: MonthlySummaryDTO;
}

interface CategoryEntry {
  categoryId: string;
  name: string;
  totalPaise: number;
  count: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CategoryEntry }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{entry.name}</p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{formatPaise(entry.totalPaise, { showPaise: "auto" })}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{entry.count} transactions</p>
    </div>
  );
}

export function CategoryBreakdownChart({ summary }: CategoryBreakdownChartProps) {
  // Sort by total descending, take top 7, fold rest into "Other"
  const sorted = [...summary.byCategory].sort((a, b) => b.totalPaise - a.totalPaise);
  const top = sorted.slice(0, 7);
  const rest = sorted.slice(7);

  const data: CategoryEntry[] =
    rest.length > 0
      ? [
          ...top,
          {
            categoryId: "other",
            name: "Other",
            totalPaise: rest.reduce((sum, c) => sum + c.totalPaise, 0),
            count: rest.reduce((sum, c) => sum + c.count, 0),
          },
        ]
      : top;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="0" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" />
          <XAxis type="number" stroke="currentColor" className="text-zinc-500 dark:text-zinc-400" tickFormatter={(val) => formatPaise(val, { showPaise: "auto" })} />
          <YAxis dataKey="name" type="category" stroke="currentColor" className="text-zinc-500 dark:text-zinc-400" width={90} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalPaise" fill="#2a78d6" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index < CATEGORY_COLORS.length ? CATEGORY_COLORS[index] : CATEGORY_COLORS[0]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
