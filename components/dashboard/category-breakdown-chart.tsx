"use client";

import type { MonthlySummaryDTO } from "@/types/dto";
import { RankedBars } from "./ranked-bars";

export function CategoryBreakdownChart({ summary }: { summary: MonthlySummaryDTO }) {
  return (
    <RankedBars
      label="Spending by category"
      items={summary.byCategory.map((c) => ({ key: c.categoryId, name: c.name, totalPaise: c.totalPaise, count: c.count }))}
    />
  );
}
