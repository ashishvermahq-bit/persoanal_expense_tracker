import { Category } from "@/models/category";
import type { CategoryKind, TaxSection } from "@/types/models";

export interface SeedCategory {
  name: string;
  kind: CategoryKind;
  icon: string;
  color: string;
  defaultTaxSection?: TaxSection;
}

/**
 * System categories shared by all users (userId: null). Names are the unique
 * key, so renaming here creates a new category rather than updating one.
 */
export const DEFAULT_EXPENSE_CATEGORIES: SeedCategory[] = [
  { name: "Groceries / Kirana", kind: "expense", icon: "shopping-basket", color: "#16a34a" },
  { name: "Rent", kind: "expense", icon: "home", color: "#7c3aed", defaultTaxSection: "HRA" },
  { name: "EMI / Loans", kind: "expense", icon: "landmark", color: "#b91c1c" },
  { name: "Electricity / Water / Gas", kind: "expense", icon: "zap", color: "#f59e0b" },
  { name: "Mobile / DTH / Broadband", kind: "expense", icon: "wifi", color: "#0ea5e9" },
  { name: "Fuel", kind: "expense", icon: "fuel", color: "#ea580c" },
  { name: "Food & Dining", kind: "expense", icon: "utensils", color: "#e11d48" },
  { name: "Travel / Commute", kind: "expense", icon: "car", color: "#2563eb" },
  { name: "Shopping", kind: "expense", icon: "shopping-bag", color: "#db2777" },
  { name: "Medical", kind: "expense", icon: "heart-pulse", color: "#dc2626" },
  { name: "Education / School Fees", kind: "expense", icon: "graduation-cap", color: "#4f46e5", defaultTaxSection: "80C" },
  { name: "Insurance", kind: "expense", icon: "shield-check", color: "#0d9488", defaultTaxSection: "80D" },
  { name: "Investments", kind: "expense", icon: "trending-up", color: "#15803d", defaultTaxSection: "80C" },
  { name: "Domestic Help", kind: "expense", icon: "hand-helping", color: "#a16207" },
  { name: "Festivals & Gifts", kind: "expense", icon: "gift", color: "#c026d3" },
  { name: "Donations", kind: "expense", icon: "heart-handshake", color: "#9333ea" },
  { name: "Entertainment / OTT", kind: "expense", icon: "clapperboard", color: "#6d28d9" },
  { name: "Personal Care", kind: "expense", icon: "sparkles", color: "#ec4899" },
  { name: "Miscellaneous", kind: "expense", icon: "circle-ellipsis", color: "#64748b" },
];

export const DEFAULT_CATEGORIES: SeedCategory[] = DEFAULT_EXPENSE_CATEGORIES;

/** Idempotent: inserts any missing system category, never overwrites user edits. */
export async function seedSystemCategories(): Promise<{ inserted: number }> {
  const existing = await Category.find({ isSystem: true }, { name: 1 })
    .collation({ locale: "en", strength: 2 })
    .lean();
  const have = new Set(existing.map((c) => c.name.toLowerCase()));
  const missing = DEFAULT_CATEGORIES.filter((c) => !have.has(c.name.toLowerCase()));
  if (missing.length === 0) return { inserted: 0 };

  await Category.insertMany(
    missing.map((c) => ({
      userId: null,
      isSystem: true,
      isArchived: false,
      name: c.name,
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      defaultTaxSection: c.defaultTaxSection ?? "none",
      sortOrder: DEFAULT_CATEGORIES.indexOf(c) * 10,
    })),
    { ordered: false }
  );
  return { inserted: missing.length };
}
