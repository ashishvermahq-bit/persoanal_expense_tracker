"use client";

import { Form } from "@/components/ui/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { ApiClientError, api } from "@/lib/client";
import { toInputDate, todayIST } from "@/lib/dates";
import { PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { formatPaise, toPaise } from "@/lib/money";
import type { CategoryDTO, ExpenseDTO, PreferencesDTO } from "@/types/dto";
import { PAYMENT_METHODS, type PaymentMethod } from "@/types/models";

const QUICK_PAYMENTS: PaymentMethod[] = ["upi", "cash", "credit_card", "debit_card"];

export function QuickAddForm({
  categories,
  recentCategoryIds,
  preferences,
}: {
  categories: CategoryDTO[];
  recentCategoryIds: string[];
  preferences: PreferencesDTO;
}) {
  const router = useRouter();
  const amountRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>(preferences.defaultPaymentMethod);
  const [date, setDate] = useState(toInputDate(todayIST()));
  const [note, setNote] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const ordered = useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const recent = recentCategoryIds.map((id) => byId.get(id)).filter((c): c is CategoryDTO => !!c);
    const rest = categories.filter((c) => !recentCategoryIds.includes(c.id));
    return [...recent, ...rest];
  }, [categories, recentCategoryIds]);
  const visible = showAll ? ordered : ordered.slice(0, 8);
  const paymentOptions = showMore ? PAYMENT_METHODS.filter((p) => p !== "other") : QUICK_PAYMENTS;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    let paise = 0;
    try {
      paise = toPaise(amount);
      if (paise < 1) next.amount = "Enter an amount";
    } catch {
      next.amount = "Enter a valid amount";
    }
    if (!categoryId) next.categoryId = "Pick a category";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    try {
      const cat = categories.find((c) => c.id === categoryId)!;
      const created = await api<ExpenseDTO>("/api/expenses", {
        method: "POST",
        json: {
          amountPaise: paise,
          categoryId,
          paymentMethod: payment,
          upiApp: payment === "upi" ? preferences.defaultUpiApp : null,
          taxSection: cat.defaultTaxSection,
          date,
          description: note || null,
        },
      });
      toast.success(`${formatPaise(created.amountPaise)} · ${cat.name}`, {
        description: "Expense saved",
        action: { label: "View", onClick: () => router.push(`/expenses/${created.id}`) },
      });
      setAmount("");
      setNote("");
      setCategoryId(null);
      setErrors({});
      amountRef.current?.focus();
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
    <Form onSubmit={onSubmit} noValidate className="space-y-6" data-testid="quick-add-form">
      <MoneyInput ref={amountRef} label="Amount" size="xl" value={amount} onChange={setAmount} error={errors.amount} autoFocus data-testid="amount" />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Category</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {visible.map((c) => (
            <Chip
              key={c.id}
              selected={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              icon={<CategoryIcon icon={c.icon} color={c.color} size="sm" className="-ml-1.5" />}
              data-testid={`cat-${c.id}`}
              className="pl-1.5"
            >
              {c.name}
            </Chip>
          ))}
          {ordered.length > 8 && (
            <Chip onClick={() => setShowAll((v) => !v)} aria-expanded={showAll} className="text-zinc-500">
              {showAll ? "Less" : `More (${ordered.length - 8})`}
              <ChevronDown className={`size-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} aria-hidden />
            </Chip>
          )}
        </div>
        {errors.categoryId && (
          <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            {errors.categoryId}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Paid via</legend>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Payment mode">
          {paymentOptions.map((p) => (
            <Chip key={p} selected={payment === p} onClick={() => setPayment(p)} data-testid={`pay-${p}`}>
              {payment === p && <Check className="size-3.5" aria-hidden />}
              {PAYMENT_METHOD_LABELS[p]}
            </Chip>
          ))}
          {!showMore && (
            <Chip onClick={() => setShowMore(true)} className="text-zinc-500">
              More
            </Chip>
          )}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={toInputDate(todayIST())} />
        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Swiggy dinner, auto to office…" maxLength={200} />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/expenses/new" className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
          Need tags, receipt or tax section? Add with details →
        </Link>
        <Button type="submit" size="lg" loading={loading} className="sm:min-w-40" data-testid="save-expense">
          Save expense
        </Button>
      </div>
    </Form>
  );
}
