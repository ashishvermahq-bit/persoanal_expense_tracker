"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/cn";
import { formatPaise } from "@/lib/money";
import type { TrendPeriodDTO } from "@/types/dto";
import { RankedBars } from "./ranked-bars";
import { SpendColumns } from "./spend-columns";

type View = "spend" | "category" | "mode";
type Period = TrendPeriodDTO["key"];

/**
 * "Trends", collapsed by default: glance first, details on tap. One chart at
 * a time, chosen by two segmented controls (what × period). The chart mounts
 * only when expanded (Recharts can't measure a hidden container). Every view
 * keeps its "Show as table" twin.
 */
export function TrendsPanel({ periods }: { periods: TrendPeriodDTO[] }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("spend");
  const [period, setPeriod] = useState<Period>("month");
  const panelId = useId();
  const data = periods.find((p) => p.key === period) ?? periods[0]!;
  const empty = data.totalPaise === 0;

  return (
    <section className="rounded-xl border border-line bg-surface shadow-card" aria-labelledby={`${panelId}-h`}>
      <h2 id={`${panelId}-h`}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          data-testid="trends-toggle"
          className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <span>
            <span className="block text-sm font-semibold uppercase tracking-[0.05em] text-ink-3">Trends</span>
            <span className="block text-xs text-ink-3">Spend over time, by category and by payment mode</span>
          </span>
          <ChevronDown className={cn("size-5 shrink-0 text-ink-3 transition-transform duration-200", open && "rotate-180")} aria-hidden />
        </button>
      </h2>

      {open && (
        <div id={panelId} className="animate-fade-in space-y-4 border-t border-line p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Show"
              value={view}
              onChange={setView}
              options={[
                { value: "spend", label: "Spend" },
                { value: "category", label: "Category" },
                { value: "mode", label: "Mode" },
              ]}
              testId="trends-view"
              className="w-full sm:w-auto"
            />
            <Segmented
              label="Period"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
                { value: "fy", label: "FY" },
              ]}
              testId="trends-period"
              className="w-full sm:ml-auto sm:w-auto"
            />
          </div>

          <p className="text-sm text-ink-3">
            {data.label}: <span className="font-semibold text-ink">{formatPaise(data.totalPaise)}</span>
          </p>

          {empty ? (
            <p className="rounded-lg bg-raised px-3 py-6 text-center text-sm text-ink-3">No spending in this period yet.</p>
          ) : view === "spend" ? (
            <SpendColumns series={data.series} caption={`Spending per ${period === "fy" ? "month" : "day"}, ${data.label}`} />
          ) : view === "category" ? (
            <RankedBars label={`Spending by category, ${data.label}`} items={data.byCategory} />
          ) : (
            <RankedBars label={`Spending by payment mode, ${data.label}`} items={data.byPaymentMethod} />
          )}
        </div>
      )}
    </section>
  );
}
