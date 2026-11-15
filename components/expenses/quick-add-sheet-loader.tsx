import { listCategories } from "@/lib/services/categories";
import { requireUserId } from "@/lib/services/context";
import { recentCategoryIds } from "@/lib/services/expenses";
import { getPreferences } from "@/lib/services/preferences";
import { QuickAddSheet } from "./quick-add-sheet";

/** Server half of the global quick-add sheet (mounted once in the (app) layout). */
export async function QuickAddSheetLoader() {
  const userId = await requireUserId();
  const [categories, recent, preferences] = await Promise.all([
    listCategories(userId, { kind: "expense" }),
    recentCategoryIds(userId),
    getPreferences(userId),
  ]);
  return <QuickAddSheet categories={categories} recentCategoryIds={recent} preferences={preferences} />;
}
