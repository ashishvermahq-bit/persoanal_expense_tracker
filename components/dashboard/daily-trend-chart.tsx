"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatPaise } from "@/lib/money";
import type { MonthlySummaryDTO } from "@/types/dto";

interface DailyTrendChartProps {
  currentMonth: MonthlySummaryDTO;
  previousMonth: MonthlySummaryDTO;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number; payload: { day: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">Day {payload[0].payload.day}</p>
      {payload.map((entry, idx: number) => (
        <p key={idx} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatPaise(entry.value, { showPaise: "auto" })}
        </p>
      ))}
    </div>
  );
}

export function DailyTrendChart({ currentMonth, previousMonth }: DailyTrendChartProps) {
  // Combine daily data from both months
  const data = currentMonth.dailyTotalsPaise.map((current, day) => ({
    day: day + 1,
    current,
    previous: previousMonth.dailyTotalsPaise[day] ?? 0,
  }));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="0" stroke="currentColor" className="text-zinc-200 dark:text-zinc-700" />
          <XAxis dataKey="day" stroke="currentColor" className="text-zinc-500 dark:text-zinc-400" />
          <YAxis stroke="currentColor" className="text-zinc-500 dark:text-zinc-400" tickFormatter={(val) => formatPaise(val, { showPaise: "auto" })} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="current"
            stroke="#2a78d6"
            dot={false}
            strokeWidth={2}
            name="This month"
          />
          <Line
            type="monotone"
            dataKey="previous"
            stroke="#c3c2b7"
            dot={false}
            strokeWidth={2}
            name="Last month"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
