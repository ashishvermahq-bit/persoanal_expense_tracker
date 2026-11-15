"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Check, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { daysInMonth, istParts, previousMonth, todayIST } from "@/lib/dates";
import { PAYMENT_METHOD_LABELS, TAX_SECTION_SHORT } from "@/lib/labels";
import type { CategoryDTO } from "@/types/dto";
import { PAYMENT_METHODS, TAX_SECTIONS, type PaymentMethod, type TaxSection } from "@/types/models";

const FILTER_KEYS = ["from", "to", "categoryId", "paymentMethod", "taxSection", "minAmount", "maxAmount", "tag", "sort"] as const;
const pad = (n: number) => String(n).padStart(2, "0");

function monthPreset(year: number, month: number) {
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(daysInMonth(year, month))}` };
}
const shortDate = (s: string) => {
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}/${m}` : s;
};

/**
 * URL-driven filters. Search stays inline; quick chips cover the common cases;
 * everything else lives in a bottom sheet ("Filters"). Active filters show as
 * removable chips so the current slice is always visible.
 */
export function FilterBar({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const urlQ = sp.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [sheetOpen, setSheetOpen] = useState(false);

  // The URL is the source of truth. With cacheComponents, Next keeps this page
  // alive in <Activity> between visits, so local state can outlive a navigation
  // and the debounced effect below would push a stale search back into the URL.
  const [syncedQ, setSyncedQ] = useState(urlQ);
  if (urlQ !== syncedQ) {
    setSyncedQ(urlQ);
    setQ(urlQ);
  }

  const activeCount = FILTER_KEYS.filter((k) => k !== "sort" && sp.get(k)).length;

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // filters change → back to page 1
    const s = next.toString();
    startTransition(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  }

  // Debounced free-text search.
  useEffect(() => {
    if (q === (sp.get("q") ?? "")) return;
    const t = setTimeout(() => update({ q }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function clearAll() {
    setQ("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  // Presets (IST months).
  const t = istParts(todayIST());
  const thisMonth = monthPreset(t.year, t.month);
  const pm = previousMonth(t);
  const lastMonth = monthPreset(pm.year, pm.month);
  const from = sp.get("from");
  const to = sp.get("to");
  const isRange = (r: { from: string; to: string }) => from === r.from && to === r.to;
  const mode = sp.get("paymentMethod");
  const presetRange = isRange(thisMonth) || isRange(lastMonth);

  const quick = [
    { id: "this-month", label: "This month", on: isRange(thisMonth), toggle: () => update(isRange(thisMonth) ? { from: null, to: null } : thisMonth) },
    { id: "last-month", label: "Last month", on: isRange(lastMonth), toggle: () => update(isRange(lastMonth) ? { from: null, to: null } : lastMonth) },
    ...(["upi", "cash", "credit_card"] as PaymentMethod[]).map((m) => ({
      id: m,
      label: PAYMENT_METHOD_LABELS[m],
      on: mode === m,
      toggle: () => update({ paymentMethod: mode === m ? null : m }),
    })),
  ];

  // Active filters not already shown as a selected quick chip.
  const category = categories.find((c) => c.id === sp.get("categoryId"));
  const tax = sp.get("taxSection") as TaxSection | null;
  type Removable = { id: string; label: string; clear: Record<string, string | null> };
  const candidates: (Removable | null)[] = [
    !presetRange && (from || to) ? { id: "range", label: `${from ? shortDate(from) : "…"} – ${to ? shortDate(to) : "…"}`, clear: { from: null, to: null } } : null,
    category ? { id: "category", label: category.name, clear: { categoryId: null } } : null,
    mode && !["upi", "cash", "credit_card"].includes(mode) ? { id: "mode", label: PAYMENT_METHOD_LABELS[mode as PaymentMethod] ?? mode, clear: { paymentMethod: null } } : null,
    tax ? { id: "tax", label: TAX_SECTION_SHORT[tax] ?? tax, clear: { taxSection: null } } : null,
    sp.get("minAmount") ? { id: "min", label: `≥ ₹${sp.get("minAmount")}`, clear: { minAmount: null } } : null,
    sp.get("maxAmount") ? { id: "max", label: `≤ ₹${sp.get("maxAmount")}`, clear: { maxAmount: null } } : null,
    sp.get("tag") ? { id: "tag", label: `#${sp.get("tag")}`, clear: { tag: null } } : null,
  ];
  const removable = candidates.filter((x): x is Removable => x !== null);

  const chip = "inline-flex h-9 shrink-0 snap-start items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:h-10";

  return (
    <div className="space-y-3" data-testid="filter-bar">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search description, merchant, tags…"
            aria-label="Search expenses"
            className="block h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm pointer-coarse:h-11"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => setSheetOpen(true)} aria-haspopup="dialog" data-testid="open-filters">
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="hidden sm:inline">Filters</span>
          <span className="sr-only sm:hidden">Filters</span>
          {activeCount > 0 && <span className="ml-0.5 rounded-full bg-primary-solid px-1.5 text-micro font-semibold text-on-primary">{activeCount}</span>}
        </Button>
      </div>

      {/* Quick chips: horizontal scroll with snap on phones. */}
      <div className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Quick filters">
        {quick.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={c.on}
            onClick={c.toggle}
            className={cn(chip, c.on ? "border-primary bg-primary/10 text-ink ring-1 ring-primary" : "border-line bg-surface text-ink-2 hover:bg-primary/5")}
          >
            {c.on && <Check className="size-3.5" aria-hidden />}
            {c.label}
          </button>
        ))}
        {removable.map((r) => (
          <button key={r.id} type="button" onClick={() => update(r.clear)} className={cn(chip, "border-primary bg-primary/10 text-ink")} aria-label={`Remove filter ${r.label}`}>
            {r.label}
            <X className="size-3.5" aria-hidden />
          </button>
        ))}
        {(activeCount > 0 || q) && (
          <button type="button" onClick={clearAll} className={cn(chip, "border-transparent text-primary-ink hover:underline")}>
            Clear all
          </button>
        )}
      </div>

      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters" description="Changes apply straight away.">
        <div id="filters" className="grid gap-3 sm:grid-cols-2">
          <Input label="From" type="date" value={from ?? ""} onChange={(e) => update({ from: e.target.value })} />
          <Input label="To" type="date" value={to ?? ""} onChange={(e) => update({ to: e.target.value })} />
          <Select label="Category" value={sp.get("categoryId") ?? ""} onChange={(e) => update({ categoryId: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Paid via" value={mode ?? ""} onChange={(e) => update({ paymentMethod: e.target.value })}>
            <option value="">Any mode</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {PAYMENT_METHOD_LABELS[p]}
              </option>
            ))}
          </Select>
          <Input label="Min ₹" type="number" inputMode="numeric" min={0} value={sp.get("minAmount") ?? ""} onChange={(e) => update({ minAmount: e.target.value })} />
          <Input label="Max ₹" type="number" inputMode="numeric" min={0} value={sp.get("maxAmount") ?? ""} onChange={(e) => update({ maxAmount: e.target.value })} />
          <Select label="Tax section" value={tax ?? ""} onChange={(e) => update({ taxSection: e.target.value })}>
            <option value="">Any</option>
            {TAX_SECTIONS.filter((x) => x !== "none").map((x) => (
              <option key={x} value={x}>
                {TAX_SECTION_SHORT[x]}
              </option>
            ))}
          </Select>
          <Select label="Sort" value={sp.get("sort") ?? "date_desc"} onChange={(e) => update({ sort: e.target.value })}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Largest first</option>
            <option value="amount_asc">Smallest first</option>
          </Select>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={clearAll} disabled={activeCount === 0 && !q}>
            <X className="size-4" aria-hidden />
            Clear all
          </Button>
          <Button type="button" onClick={() => setSheetOpen(false)}>
            Show results
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
