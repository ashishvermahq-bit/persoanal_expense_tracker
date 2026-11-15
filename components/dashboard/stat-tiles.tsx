"use client";

import { ArrowDown, ArrowUp, TrendingUp, Wallet } from "lucide-react";
import { formatPaise } from "@/lib/money";
import type { MonthlySummaryDTO } from "@/types/dto";

interface StatTilesProps {
  current: MonthlySummaryDTO;
}

function StatTile({
  label,
  value,
  delta,
  isUp,
  icon: Icon,
}: {
  label: string;
  value: number;
  delta: number | null;
  isUp: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const deltaPercent = delta !== null ? `${Math.abs(Math.round((delta / (value - delta)) * 100))}%` : null;
  const deltaGood = isUp ? delta! >= 0 : delta! <= 0;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50 font-variant-numeric: tabular-nums">
            {formatPaise(value, { showPaise: "auto" })}
          </p>
          {deltaPercent && (
            <p
              className={`mt-1 flex items-center gap-1 text-xs font-medium ${
                deltaGood
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {deltaGood ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />}
              {deltaPercent} than last month
            </p>
          )}
        </div>
        <Icon className="size-6 text-zinc-400 dark:text-zinc-600" />
      </div>
    </div>
  );
}

export function StatTiles({ current }: StatTilesProps) {
  const spentDelta = current.changeFromPreviousMonth !== null ? -current.changeFromPreviousMonth : null;
  const savingsDelta = current.changeFromPreviousMonth !== null ? current.changeFromPreviousMonth : null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatTile
        label="Total Spent"
        value={current.totalExpensePaise}
        delta={spentDelta}
        isUp={false}
        icon={Wallet}
      />
      <StatTile
        label="Income"
        value={current.totalIncomePaise}
        delta={null}
        isUp={true}
        icon={TrendingUp}
      />
      <StatTile
        label="Savings"
        value={current.savingsPaise}
        delta={savingsDelta}
        isUp={true}
        icon={TrendingUp}
      />
    </div>
  );
}
