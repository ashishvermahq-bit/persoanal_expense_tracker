"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";
import { CategoryDot } from "@/components/categories/category-icon";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/money";
import type { BudgetStatus } from "@/lib/services/budgets";

interface BudgetMeterProps {
  categoryName: string;
  status: BudgetStatus;
  spendPaise: number;
  budgetPaise: number;
  /** The category's colour: shown as a dot beside the name (identity; status keeps its own colours). */
  color?: string | null;
  /** "adaptive": ring on phones, bar from sm up (budgets page). Default: bar. */
  layout?: "list" | "adaptive";
}

/** Status never relies on colour alone: each carries an icon and a text label. */
const STATUS = {
  ok: { Icon: CheckCircle2, fill: "bg-success", track: "bg-success/15", stroke: "stroke-success", ringTrack: "stroke-success/20", icon: "text-success", ink: "text-success-ink" },
  warning: { Icon: AlertTriangle, fill: "bg-warning", track: "bg-warning/20", stroke: "stroke-warning", ringTrack: "stroke-warning/25", icon: "text-warning", ink: "text-warning-ink" },
  over: { Icon: OctagonAlert, fill: "bg-danger", track: "bg-danger/15", stroke: "stroke-danger", ringTrack: "stroke-danger/20", icon: "text-danger", ink: "text-danger-ink" },
} as const;

const RANK: Record<BudgetStatus, number> = { ok: 0, warning: 1, over: 2 };

function statusLabel(status: BudgetStatus, pct: number, spendPaise: number, budgetPaise: number) {
  if (status === "over") return `Over by ${formatPaise(spendPaise - budgetPaise)}`;
  if (status === "warning") return `${pct}% used`;
  return "On track";
}

/**
 * One budget: name + figures, a 6px meter (or a ring on phones), status icon +
 * label. Static on first render; the fill animates (0.8s) only when spend
 * changes (e.g. router.refresh() after a new expense). Crossing a threshold
 * flashes the fill once.
 */
export function BudgetMeter({ categoryName, status, spendPaise, budgetPaise, color, layout = "list" }: BudgetMeterProps) {
  const pct = budgetPaise > 0 ? Math.round((spendPaise / budgetPaise) * 100) : 0;
  const width = Math.min(pct, 100);
  const cfg = STATUS[status];
  const adaptive = layout === "adaptive";

  const [animate, setAnimate] = useState(false);
  const fillRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  const prevStatus = useRef(status);

  useEffect(() => {
    // Enable transitions only after the first paint.
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const crossed = RANK[status] > RANK[prevStatus.current];
    prevStatus.current = status;
    if (!crossed || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Web Animations rather than a remount, so the fill transition still plays.
    const frames = [{ filter: "brightness(1.35) saturate(1.4)" }, { filter: "none" }];
    fillRef.current?.animate(frames, { duration: 300, easing: "ease-out" });
    ringRef.current?.animate(frames, { duration: 300, easing: "ease-out" });
  }, [status]);

  const label = statusLabel(status, pct, spendPaise, budgetPaise);

  return (
    <div className="py-3" data-testid="budget-meter" data-status={status}>
      <div
        role="meter"
        aria-label={`${categoryName} budget`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-valuetext={`${pct}% of budget used. ${label}`}
        className={cn(adaptive && "flex items-center gap-3 sm:block")}
      >
        {adaptive && (
          <div className="relative size-14 shrink-0 sm:hidden">
            <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="15.9155" fill="none" strokeWidth="3.5" className={cfg.ringTrack} />
              <circle
                ref={ringRef}
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={`${width} 100`}
                className={cn(cfg.stroke, animate && "transition-[stroke-dasharray] duration-800 ease-out")}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-ink">{pct}%</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-ink">
              {color !== undefined && <CategoryDot color={color} />}
              <span className="truncate">{categoryName}</span>
            </p>
            <p className="shrink-0 text-xs tabular-nums text-ink-3">
              <span className="font-semibold text-ink">{formatPaise(spendPaise, { showPaise: "auto" })}</span> of {formatPaise(budgetPaise, { showPaise: "auto" })}
            </p>
          </div>
          <div aria-hidden className={cn("mt-2 h-1.5 overflow-hidden rounded-[3px]", cfg.track, adaptive && "hidden sm:block")}>
            <div ref={fillRef} className={cn("h-full rounded-[3px]", cfg.fill, animate && "transition-[width,background-color] duration-800 ease-out")} style={{ width: `${width}%` }} />
          </div>
          <p className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", cfg.ink)}>
            <cfg.Icon className={cn("size-3.5", cfg.icon)} aria-hidden />
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
