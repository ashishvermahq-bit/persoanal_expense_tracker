"use client";

import { Form } from "@/components/ui/form";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Archive, ArchiveRestore, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ApiClientError, api } from "@/lib/client";
import { TAX_SECTION_LABELS, TAX_SECTION_SHORT } from "@/lib/labels";
import type { CategoryDTO } from "@/types/dto";
import { TAX_SECTIONS, type TaxSection } from "@/types/models";
import { CATEGORY_COLORS, CATEGORY_ICONS, CategoryIcon, ICON_NAMES } from "./category-icon";

type Draft = { name: string; icon: string; color: string; defaultTaxSection: TaxSection };
const emptyDraft = (): Draft => ({ name: "", icon: "tag", color: CATEGORY_COLORS[0]!, defaultTaxSection: "none" });

export function CategoryManager({ categories }: { categories: CategoryDTO[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryDTO | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<CategoryDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const system = categories.filter((c) => c.isSystem);
  const custom = categories.filter((c) => !c.isSystem && !c.isArchived);
  const archived = categories.filter((c) => !c.isSystem && c.isArchived);

  function openNew() {
    setDraft(emptyDraft());
    setErrors({});
    setEditing("new");
  }
  function openEdit(c: CategoryDTO) {
    setDraft({ name: c.name, icon: c.icon ?? "tag", color: c.color ?? CATEGORY_COLORS[0]!, defaultTaxSection: c.defaultTaxSection });
    setErrors({});
    setEditing(c);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft.name.trim()) {
      setErrors({ name: "Enter a name" });
      return;
    }
    setSaving(true);
    try {
      if (editing === "new") {
        await api<CategoryDTO>("/api/categories", { method: "POST", json: draft });
        toast.success("Category added");
      } else if (editing) {
        await api<CategoryDTO>(`/api/categories/${editing.id}`, { method: "PATCH", json: draft });
        toast.success("Category updated");
      }
      setEditing(null);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        if (!Object.keys(err.fields).length) toast.error(err.message);
      } else toast.error("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(c: CategoryDTO) {
    try {
      await api(`/api/categories/${c.id}`, { method: "PATCH", json: { isArchived: !c.isArchived } });
      toast.success(c.isArchived ? "Category restored" : "Category archived");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Something went wrong");
    }
  }

  async function remove() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const { archived } = await api<{ archived: boolean }>(`/api/categories/${toDelete.id}`, { method: "DELETE" });
      toast.success(archived ? "Category is in use, so it was archived instead" : "Category deleted");
      setToDelete(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Your categories</h2>
          <Button size="sm" onClick={openNew} data-testid="new-category">
            <Plus className="size-3.5" aria-hidden />
            New
          </Button>
        </div>
        {custom.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Add categories that fit your life — “Society maintenance”, “Kids’ classes”, “Chai”.
          </p>
        ) : (
          <CategoryGrid
            items={custom}
            renderActions={(c) => (
              <>
                <IconButton label="Edit" onClick={() => openEdit(c)}>
                  <Pencil className="size-4" aria-hidden />
                </IconButton>
                <IconButton label="Archive" onClick={() => toggleArchive(c)}>
                  <Archive className="size-4" aria-hidden />
                </IconButton>
                <IconButton label="Delete" onClick={() => setToDelete(c)} danger>
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </>
            )}
          />
        )}
      </section>

      {archived.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Archived</h2>
          <CategoryGrid
            items={archived}
            muted
            renderActions={(c) => (
              <IconButton label="Restore" onClick={() => toggleArchive(c)}>
                <ArchiveRestore className="size-4" aria-hidden />
              </IconButton>
            )}
          />
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <Lock className="size-3.5" aria-hidden /> Default categories
        </h2>
        <CategoryGrid items={system} />
      </section>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New category" : "Edit category"}>
        <Form onSubmit={save} noValidate className="space-y-5">
          <div className="flex items-center gap-3">
            <CategoryIcon icon={draft.icon} color={draft.color} size="lg" />
            <div className="flex-1">
              <Input label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} error={errors.name} maxLength={50} autoFocus data-testid="category-name" />
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  aria-pressed={draft.color === c}
                  onClick={() => setDraft({ ...draft, color: c })}
                  className={`size-7 rounded-full ring-offset-2 ring-offset-white transition-transform dark:ring-offset-zinc-900 ${draft.color === c ? "ring-2 ring-zinc-900 dark:ring-zinc-50" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Icon</legend>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-700">
              {ICON_NAMES.map((name) => {
                const Icon = CATEGORY_ICONS[name]!;
                return (
                  <Chip key={name} selected={draft.icon === name} onClick={() => setDraft({ ...draft, icon: name })} aria-label={name} className="size-9 justify-center px-0">
                    <Icon className="size-4" aria-hidden />
                  </Chip>
                );
              })}
            </div>
          </fieldset>
          <Select label="Default tax section" value={draft.defaultTaxSection} onChange={(e) => setDraft({ ...draft, defaultTaxSection: e.target.value as TaxSection })} hint="Pre-selected when you add an expense in this category.">
            {TAX_SECTIONS.map((t) => (
              <option key={t} value={t}>
                {TAX_SECTION_LABELS[t]}
              </option>
            ))}
          </Select>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} data-testid="save-category">
              {editing === "new" ? "Add category" : "Save"}
            </Button>
          </div>
        </Form>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        loading={deleting}
        destructive
        title={`Delete “${toDelete?.name}”?`}
        description="If any expense uses it, it will be archived instead so your history stays intact."
        confirmLabel="Delete"
      />
    </div>
  );
}

function CategoryGrid({ items, muted, renderActions }: { items: CategoryDTO[]; muted?: boolean; renderActions?: (c: CategoryDTO) => React.ReactNode }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((c) => (
        <li
          key={c.id}
          className={`flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900 ${muted ? "opacity-60" : ""}`}
          data-testid="category-item"
        >
          <CategoryIcon icon={c.icon} color={c.color} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{c.name}</p>
            {c.defaultTaxSection !== "none" && <p className="text-xs text-zinc-500 dark:text-zinc-400">Tax: {TAX_SECTION_SHORT[c.defaultTaxSection]}</p>}
          </div>
          {renderActions && <div className="flex items-center">{renderActions(c)}</div>}
        </li>
      ))}
    </ul>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`rounded-lg p-2 text-ink-3 transition-colors hover:bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:p-3 ${danger ? "hover:text-danger-ink" : "hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
