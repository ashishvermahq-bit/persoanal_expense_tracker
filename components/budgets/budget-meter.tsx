"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/money";
import type { BudgetStatus } from "@/lib/services/budgets";

interface BudgetMeterProps {
  categoryName: string;
  status: BudgetStatus;
  spendPaise: number;
  budgetPaise: number;
}

/** Status never relies on colour alone: each carries an icon and a text label. */
const STATUS = {
  ok: { Icon: CheckCircle2, fill: "bg-success", track: "bg-success/15", icon: "text-success", ink: "text-success-ink" },
  warning: { Icon: AlertTriangle, fill: "bg-warning", track: "bg-warning/20", icon: "text-warning", ink: "text-warning-ink" },
  over: { Icon: OctagonAlert, fill: "bg-danger", track: "bg-danger/15", icon: "text-danger", ink: "text-danger-ink" },
} as const;

const RANK: Record<BudgetStatus, number> = { ok: 0, warning: 1, over: 2 };

function statusLabel(status: BudgetStatus, pct: number, spendPaise: number, budgetPaise: number) {
  if (status === "over") return `Over by ${formatPaise(spendPaise - budgetPaise)}`;
  if (status === "warning") return `${pct}% used`;
  return "On track";
}

/**
 * One row of a meter list: name + figures, a 6px meter, status icon + label.
 * The fill is static on first render and animates (0.8s) when spend changes,
 * e.g. after router.refresh() following a new expense. Crossing a threshold
 * flashes the fill once.
 */
export function BudgetMeter({ categoryName, status, spendPaise, budgetPaise }: BudgetMeterProps) {
  const pct = budgetPaise > 0 ? Math.round((spendPaise / budgetPaise) * 100) : 0;
  const width = Math.min(pct, 100);
  const cfg = STATUS[status];

  const [animate, setAnimate] = useState(false);
  const fillRef = useRef<HTMLDivElement>(null);
  const prevStatus = useRef(status);

  useEffect(() => {
    // Enable the width transition only after the first paint.
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const crossed = RANK[status] > RANK[prevStatus.current];
    prevStatus.current = status;
    if (!crossed || !fillRef.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Web Animations rather than a remount, so the width transition still plays.
    fillRef.current.animate([{ filter: "brightness(1.35) saturate(1.4)" }, { filter: "none" }], { duration: 300, easing: "ease-out" });
  }, [status]);

  const label = statusLabel(status, pct, spendPaise, budgetPaise);

  return (
    <div className="py-3" data-testid="budget-meter" data-status={status}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-medium text-ink">{categoryName}</p>
        <p className="shrink-0 text-xs tabular-nums text-ink-3">
          <span className="font-semibold text-ink">{formatPaise(spendPaise, { showPaise: "auto" })}</span> of {formatPaise(budgetPaise, { showPaise: "auto" })}
        </p>
      </div>
      <div
        role="meter"
        aria-label={`${categoryName} budget`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-valuetext={`${pct}% of budget used. ${label}`}
        className={cn("mt-2 h-1.5 overflow-hidden rounded-[3px]", cfg.track)}
      >
        <div
          ref={fillRef}
          className={cn("h-full rounded-[3px]", cfg.fill, animate && "transition-[width,background-color] duration-800 ease-out")}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", cfg.ink)}>
        <cfg.Icon className={cn("size-3.5", cfg.icon)} aria-hidden />
        {label}
      </p>
    </div>
  );
}
