"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHOD_LABELS, TAX_SECTION_SHORT } from "@/lib/labels";
import type { CategoryDTO } from "@/types/dto";
import { PAYMENT_METHODS, TAX_SECTIONS } from "@/types/models";

const FILTER_KEYS = ["q", "from", "to", "categoryId", "paymentMethod", "taxSection", "minAmount", "maxAmount", "tag", "sort"] as const;

export function FilterBar({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();
  const urlQ = sp.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [open, setOpen] = useState(false);

  // The URL is the source of truth. With cacheComponents, Next keeps this page
  // alive in <Activity> between visits, so local state can outlive a navigation
  // (e.g. back to /expenses after editing) and the debounced effect below would
  // push the stale search back into the URL. Re-sync whenever the URL's q changes.
  const [syncedQ, setSyncedQ] = useState(urlQ);
  if (urlQ !== syncedQ) {
    setSyncedQ(urlQ);
    setQ(urlQ);
  }

  const activeCount = FILTER_KEYS.filter((k) => k !== "q" && k !== "sort" && sp.get(k)).length;

  function update(patch: Record<string, string | null>) {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page"); // filters change → back to page 1
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
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

  return (
    <div className="space-y-3" data-testid="filter-bar">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search description, merchant, tags…"
            aria-label="Search expenses"
            className="block h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm pointer-coarse:h-11"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="filters">
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-primary-solid px-1.5 text-micro font-semibold text-on-primary">{activeCount}</span>
          )}
        </Button>
      </div>

      {open && (
        <div id="filters" className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900">
          <Input label="From" type="date" value={sp.get("from") ?? ""} onChange={(e) => update({ from: e.target.value })} />
          <Input label="To" type="date" value={sp.get("to") ?? ""} onChange={(e) => update({ to: e.target.value })} />
          <Select label="Category" value={sp.get("categoryId") ?? ""} onChange={(e) => update({ categoryId: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select label="Paid via" value={sp.get("paymentMethod") ?? ""} onChange={(e) => update({ paymentMethod: e.target.value })}>
            <option value="">Any mode</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p} value={p}>
                {PAYMENT_METHOD_LABELS[p]}
              </option>
            ))}
          </Select>
          <Input label="Min ₹" type="number" inputMode="numeric" min={0} value={sp.get("minAmount") ?? ""} onChange={(e) => update({ minAmount: e.target.value })} />
          <Input label="Max ₹" type="number" inputMode="numeric" min={0} value={sp.get("maxAmount") ?? ""} onChange={(e) => update({ maxAmount: e.target.value })} />
          <Select label="Tax section" value={sp.get("taxSection") ?? ""} onChange={(e) => update({ taxSection: e.target.value })}>
            <option value="">Any</option>
            {TAX_SECTIONS.filter((t) => t !== "none").map((t) => (
              <option key={t} value={t}>
                {TAX_SECTION_SHORT[t]}
              </option>
            ))}
          </Select>
          <Select label="Sort" value={sp.get("sort") ?? "date_desc"} onChange={(e) => update({ sort: e.target.value })}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="amount_desc">Largest first</option>
            <option value="amount_asc">Smallest first</option>
          </Select>
          {(activeCount > 0 || q) && (
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                <X className="size-3.5" aria-hidden />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
