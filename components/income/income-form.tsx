"use client";

import { Form } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { ApiClientError, api } from "@/lib/client";
import { toInputDate, todayIST } from "@/lib/dates";
import { INCOME_SOURCE_LABELS } from "@/lib/labels";
import { toPaise } from "@/lib/money";
import type { IncomeDTO } from "@/types/dto";
import { INCOME_SOURCES, type IncomeSource } from "@/types/models";

export function IncomeForm({ onSaved }: { onSaved?: (income: IncomeDTO) => void }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<IncomeSource>("salary");
  const [date, setDate] = useState(toInputDate(todayIST()));
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    let paise = 0;
    try {
      paise = toPaise(amount);
    } catch {
      /* handled below */
    }
    if (paise < 1) {
      setErrors({ amount: "Enter an amount" });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const saved = await api<IncomeDTO>("/api/income", {
        method: "POST",
        json: { amountPaise: paise, source, date, description: description || null },
      });
      toast.success("Income added");
      setAmount("");
      setDescription("");
      onSaved?.(saved);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast.error(err.message);
      } else toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.4fr_auto] lg:items-end" data-testid="income-form">
      <MoneyInput label="Amount" value={amount} onChange={setAmount} error={errors.amount} data-testid="income-amount" />
      <Select label="Source" value={source} onChange={(e) => setSource(e.target.value as IncomeSource)}>
        {INCOME_SOURCES.map((s) => (
          <option key={s} value={s}>
            {INCOME_SOURCE_LABELS[s]}
          </option>
        ))}
      </Select>
      <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
      <Input label="Note (optional)" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="November salary" maxLength={200} />
      <Button type="submit" loading={loading} className="sm:col-span-2 lg:col-span-1" data-testid="save-income">
        Add income
      </Button>
    </Form>
  );
}
