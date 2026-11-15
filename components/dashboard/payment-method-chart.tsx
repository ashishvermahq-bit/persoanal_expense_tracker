"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatPaise } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import type { MonthlySummaryDTO, PaymentMethod } from "@/types/dto";

const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  upi: "#2a78d6",
  debit_card: "#eb6834",
  credit_card: "#1baf7a",
  cash: "#eda100",
  net_banking: "#e87ba4",
  wallet: "#008300",
  emi: "#6250d6",
  other: "#e34948",
};

interface PaymentMethodChartProps {
  summary: MonthlySummaryDTO;
}

interface PaymentEntry {
  method: string;
  paymentMethod: PaymentMethod;
  totalPaise: number;
  count: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PaymentEntry }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-50">{entry.method}</p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">{formatPaise(entry.totalPaise, { showPaise: "auto" })}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{entry.count} transactions</p>
    </div>
  );
}

export function PaymentMethodChart({ summary }: PaymentMethodChartProps) {
  const data: PaymentEntry[] = summary.byPaymentMethod.map((m) => ({
    method: PAYMENT_METHOD_LABELS[m.paymentMethod],
    paymentMethod: m.paymentMethod,
    totalPaise: m.totalPaise,
    count: m.count,
  }));

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
          <YAxis dataKey="method" type="category" stroke="currentColor" className="text-zinc-500 dark:text-zinc-400" width={90} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="totalPaise" fill="#2a78d6" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PAYMENT_COLORS[entry.paymentMethod as keyof typeof PAYMENT_COLORS] || PAYMENT_COLORS.other}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
