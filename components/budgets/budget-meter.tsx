"use client";

import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatPaise } from "@/lib/money";
import type { BudgetStatus } from "@/lib/services/budgets";

interface BudgetMeterProps {
  categoryName: string;
  status: BudgetStatus;
  spendPaise: number;
  budgetPaise: number;
}

const STATUS_CONFIG = {
  ok: {
    color: "bg-green-100 dark:bg-green-900/30",
    barColor: "bg-green-600 dark:bg-green-500",
    icon: CheckCircle2,
    label: "On track",
    dotClass: "bg-green-600 dark:bg-green-500",
  },
  warning: {
    color: "bg-yellow-100 dark:bg-yellow-900/30",
    barColor: "bg-yellow-500 dark:bg-yellow-400",
    icon: AlertTriangle,
    label: "80% used",
    dotClass: "bg-yellow-500 dark:bg-yellow-400",
  },
  over: {
    color: "bg-red-100 dark:bg-red-900/30",
    barColor: "bg-red-600 dark:bg-red-500",
    icon: AlertCircle,
    label: "Over budget",
    dotClass: "bg-red-600 dark:bg-red-500",
  },
};

export function BudgetMeter({ categoryName, status, spendPaise, budgetPaise }: BudgetMeterProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const percentage = budgetPaise > 0 ? Math.min((spendPaise / budgetPaise) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      {/* Category name */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{categoryName}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatPaise(spendPaise, { showPaise: "auto" })} of {formatPaise(budgetPaise, { showPaise: "auto" })}
        </p>
      </div>

      {/* Meter bar */}
      <div className="flex flex-1 flex-col gap-1">
        <div className={`h-2 rounded-full ${config.barColor} ${config.color}`} style={{ width: `${percentage}%` }} />
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <Icon className={`size-4 ${status === "ok" ? "text-green-600 dark:text-green-500" : status === "warning" ? "text-yellow-500 dark:text-yellow-400" : "text-red-600 dark:text-red-500"}`} />
        <span className={status === "ok" ? "text-green-700 dark:text-green-400" : status === "warning" ? "text-yellow-700 dark:text-yellow-400" : "text-red-700 dark:text-red-400"}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
