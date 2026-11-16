"use client";

import { Form } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { FileText, Paperclip, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, api } from "@/lib/client";
import { toInputDate, todayIST } from "@/lib/dates";
import { PAYMENT_METHOD_LABELS, TAX_SECTION_LABELS, UPI_APP_LABELS } from "@/lib/labels";
import { formatRupeesPlain, toPaise } from "@/lib/money";
import type { CategoryDTO, ExpenseDTO, PreferencesDTO } from "@/types/dto";
import { PAYMENT_METHODS, TAX_SECTIONS, UPI_APPS, type PaymentMethod, type TaxSection, type UpiApp } from "@/types/models";

export function ExpenseForm({
  categories,
  preferences,
  expense,
}: {
  categories: CategoryDTO[];
  preferences: PreferencesDTO;
  /** When present the form edits; otherwise it creates. */
  expense?: ExpenseDTO;
}) {
  const router = useRouter();
  const editing = !!expense;
  const [amount, setAmount] = useState(expense ? formatRupeesPlain(expense.amountPaise) : "");
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "");
  const [date, setDate] = useState(expense ? toInputDate(new Date(expense.date)) : toInputDate(todayIST()));
  const [payment, setPayment] = useState<PaymentMethod>(expense?.paymentMethod ?? preferences.defaultPaymentMethod);
  const [upiApp, setUpiApp] = useState<UpiApp | "">(expense?.upiApp ?? preferences.defaultUpiApp ?? "");
  const [taxSection, setTaxSection] = useState<TaxSection>(expense?.taxSection ?? "none");
  const [description, setDescription] = useState(expense?.description ?? "");
  const [merchant, setMerchant] = useState(expense?.merchant ?? "");
  const [tags, setTags] = useState(expense?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receiptUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  function onCategoryChange(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    // Pre-fill the tax tag from the category unless the user already chose one.
    if (cat && (taxSection === "none" || !editing)) setTaxSection(cat.defaultTaxSection);
  }

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { url } = await api<{ url: string }>("/api/uploads/receipt", { method: "POST", body: fd });
      setReceiptUrl(url);
      toast.success("Receipt attached");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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
    if (!categoryId) next.categoryId = "Choose a category";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload = {
      amountPaise: paise,
      categoryId,
      date,
      paymentMethod: payment,
      upiApp: payment === "upi" && upiApp ? upiApp : null,
      taxSection,
      description: description || null,
      merchant: merchant || null,
      tags,
      notes: notes || null,
      receiptUrl,
    };

    setLoading(true);
    try {
      const saved = editing
        ? await api<ExpenseDTO>(`/api/expenses/${expense.id}`, { method: "PATCH", json: payload })
        : await api<ExpenseDTO>("/api/expenses", { method: "POST", json: payload });
      toast.success(editing ? "Expense updated" : "Expense added");
      router.push(editing ? "/expenses" : `/expenses/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast.error(err.message);
      } else toast.error("Network error. Try again.");
      setLoading(false);
    }
  }

  async function onDelete() {
    if (!expense) return;
    setDeleting(true);
    try {
      await api(`/api/expenses/${expense.id}`, { method: "DELETE" });
      toast.success("Expense deleted");
      router.push("/expenses");
      router.refresh();
    } catch {
      toast.error("Could not delete. Try again.");
      setDeleting(false);
    }
  }

  return (
    <Form onSubmit={onSubmit} noValidate className="space-y-6" data-testid="expense-form">
      <div className="grid gap-4 sm:grid-cols-2">
        <MoneyInput label="Amount" value={amount} onChange={setAmount} error={errors.amount} autoFocus={!editing} data-testid="amount" />
        <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
        <CategoryIcon icon={selectedCategory?.icon} color={selectedCategory?.color} size="lg" className="hidden sm:inline-flex" />
        <Select label="Category" value={categoryId} onChange={(e) => onCategoryChange(e.target.value)} error={errors.categoryId} data-testid="category">
          <option value="">Choose…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Paid via" value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod)}>
          {PAYMENT_METHODS.map((p) => (
            <option key={p} value={p}>
              {PAYMENT_METHOD_LABELS[p]}
            </option>
          ))}
        </Select>
        {payment === "upi" ? (
          <Select label="UPI app" value={upiApp} onChange={(e) => setUpiApp(e.target.value as UpiApp | "")}>
            <option value="">Not specified</option>
            {UPI_APPS.map((a) => (
              <option key={a} value={a}>
                {UPI_APP_LABELS[a]}
              </option>
            ))}
          </Select>
        ) : (
          <div />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dinner with family" maxLength={200} error={errors.description} />
        <Input label="Merchant / payee" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Swiggy, BigBasket, landlord…" maxLength={100} error={errors.merchant} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Tax section" value={taxSection} onChange={(e) => setTaxSection(e.target.value as TaxSection)} hint="For your FY summary only — not tax advice.">
          {TAX_SECTIONS.map((t) => (
            <option key={t} value={t}>
              {TAX_SECTION_LABELS[t]}
            </option>
          ))}
        </Select>
        <Input label="Tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="family, trip, reimbursable" hint="Comma separated, up to 20." error={errors.tags} />
      </div>

      <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} error={errors.notes} />

      <div className="space-y-1.5">
        <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Receipt</span>
        {receiptUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            {/\.pdf$/i.test(receiptUrl) ? (
              <FileText className="size-10 text-zinc-400" aria-hidden />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- user upload, arbitrary dimensions
              <img src={receiptUrl} alt="Receipt" className="size-14 rounded object-cover" />
            )}
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-sm font-medium underline-offset-4 hover:underline">
              View receipt
            </a>
            <Button type="button" variant="ghost" size="sm" onClick={() => setReceiptUrl(null)} aria-label="Remove receipt">
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        ) : (
          <div>
            <input
              ref={fileRef}
              id="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="sr-only"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            <Button type="button" variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Paperclip className="size-4" aria-hidden />
              Attach receipt
            </Button>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">JPG, PNG, WebP or PDF up to 4 MB.</p>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        {editing ? (
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-danger-ink hover:bg-danger/10" data-testid="delete-expense">
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2 sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} data-testid="save-expense">
            {editing ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={onDelete}
        loading={deleting}
        destructive
        title="Delete this expense?"
        description="It will be removed from your totals. You can't undo this from the app."
        confirmLabel="Delete"
      />
    </Form>
  );
}
