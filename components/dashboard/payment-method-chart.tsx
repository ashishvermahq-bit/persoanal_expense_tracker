"use client";

import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import type { MonthlySummaryDTO } from "@/types/dto";
import { RankedBars } from "./ranked-bars";

export function PaymentMethodChart({ summary }: { summary: MonthlySummaryDTO }) {
  return (
    <RankedBars
      label="Spending by payment mode"
      items={summary.byPaymentMethod.map((m) => ({ key: m.paymentMethod, name: PAYMENT_METHOD_LABELS[m.paymentMethod], totalPaise: m.totalPaise, count: m.count }))}
    />
  );
}
