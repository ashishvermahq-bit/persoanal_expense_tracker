import { Types } from "mongoose";
import { Budget } from "@/models/budget";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";
import { monthRange } from "@/lib/dates";
import { compact } from "./compact";
import type { BudgetDTO } from "@/types/dto";
import type { CreateBudget } from "@/lib/validation/budget";

export type BudgetStatus = "ok" | "warning" | "over";

export interface BudgetWithSpend {
  id: string;
  categoryId: string;
  categoryName: string;
  amountPaise: number;
  spendPaise: number;
  status: BudgetStatus;
}

export function getBudgetStatus(spendPaise: number, budgetPaise: number): BudgetStatus {
  if (spendPaise >= budgetPaise) return "over";
  if (spendPaise >= budgetPaise * 0.8) return "warning";
  return "ok";
}

/**
 * Get all budgets for a month with spend and status.
 * Returns both month-specific and default budgets.
 */
export async function listBudgetsWithSpend(
  userId: Types.ObjectId | string,
  year: number,
  month: number,
): Promise<BudgetWithSpend[]> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;

  // Get both default and month-specific budgets
  const budgets = await Budget.find({
    userId: userObjectId,
    $or: [
      { year: null, month: null }, // defaults
      { year, month }, // month-specific
    ],
  }).lean();

  if (budgets.length === 0) return [];

  // Get category names
  const categoryIds = budgets.map((b) => b.categoryId);
  const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
  const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

  // Get spend for each category in this month
  // IST month boundaries (server-local midnight would misfile 00:00–05:30 IST).
  const { start: startOfMonth, end: startOfNextMonth } = monthRange(year, month);

  interface SpendAgg {
    _id: Types.ObjectId;
    total: number;
  }

  const spend = await Expense.aggregate<SpendAgg>([
    {
      $match: {
        userId: userObjectId,
        deletedAt: null,
        date: { $gte: startOfMonth, $lt: startOfNextMonth },
      },
    },
    {
      $group: {
        _id: "$categoryId",
        total: { $sum: "$amountPaise" },
      },
    },
  ]);

  const spendMap = new Map(spend.map((s) => [s._id.toString(), s.total]));

  // Build result, preferring month-specific over default
  const byCategory = new Map<string, (typeof budgets)[0]>();
  for (const budget of budgets) {
    const categoryId = budget.categoryId.toString();
    if (!byCategory.has(categoryId)) {
      byCategory.set(categoryId, budget);
    } else {
      const existing = byCategory.get(categoryId)!;
      // Month-specific takes priority over default
      if (budget.year !== null && existing.year === null) {
        byCategory.set(categoryId, budget);
      }
    }
  }

  return Array.from(byCategory.values()).map((budget) => {
    const categoryId = budget.categoryId.toString();
    const categoryName = categoryMap.get(categoryId) || "Unknown";
    const spendPaise = spendMap.get(categoryId) ?? 0;
    const status = getBudgetStatus(spendPaise, budget.amountPaise);

    return {
      id: budget._id.toString(),
      categoryId,
      categoryName,
      amountPaise: budget.amountPaise,
      spendPaise,
      status,
    };
  });
}

/**
 * Get the budget (if any) for a category in a specific month.
 * Used when adding an expense to check if we're at warning/over.
 */
export async function getBudgetForCategory(
  userId: Types.ObjectId | string,
  categoryId: string,
  year: number,
  month: number,
): Promise<BudgetWithSpend | null> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const categoryObjectId = new Types.ObjectId(categoryId);

  // Try month-specific first, then fall back to default
  let budget = await Budget.findOne({
    userId: userObjectId,
    categoryId: categoryObjectId,
    year,
    month,
  }).lean();

  if (!budget) {
    budget = await Budget.findOne({
      userId: userObjectId,
      categoryId: categoryObjectId,
      year: null,
      month: null,
    }).lean();
  }

  if (!budget) return null;

  // Get category name
  const category = await Category.findById(budget.categoryId).lean();
  if (!category) return null;

  // Get current month's spend for this category
  // IST month boundaries (server-local midnight would misfile 00:00–05:30 IST).
  const { start: startOfMonth, end: startOfNextMonth } = monthRange(year, month);

  const [spendResult] = await Expense.aggregate([
    {
      $match: {
        userId: userObjectId,
        categoryId: budget.categoryId,
        deletedAt: null,
        date: { $gte: startOfMonth, $lt: startOfNextMonth },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amountPaise" },
      },
    },
  ]);

  const spendPaise = spendResult?.total ?? 0;
  const status = getBudgetStatus(spendPaise, budget.amountPaise);

  return {
    id: budget._id.toString(),
    categoryId: budget.categoryId.toString(),
    categoryName: category.name,
    amountPaise: budget.amountPaise,
    spendPaise,
    status,
  };
}

export async function upsertBudget(
  userId: Types.ObjectId | string,
  data: CreateBudget,
): Promise<BudgetDTO> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const categoryObjectId = new Types.ObjectId(data.categoryId);

  const payload = compact({
    userId: userObjectId,
    categoryId: categoryObjectId,
    amountPaise: data.amountPaise,
    year: data.year,
    month: data.month,
  });

  const updated = await Budget.findOneAndUpdate(
    {
      userId: userObjectId,
      categoryId: categoryObjectId,
      year: data.year,
      month: data.month,
    },
    payload,
    { upsert: true, returnDocument: "after" },
  ).lean();

  return {
    id: updated._id.toString(),
    categoryId: updated.categoryId.toString(),
    amountPaise: updated.amountPaise,
    year: updated.year,
    month: updated.month,
  };
}

export async function deleteBudget(userId: Types.ObjectId | string, budgetId: string): Promise<void> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const budgetObjectId = new Types.ObjectId(budgetId);
  await Budget.deleteOne({ _id: budgetObjectId, userId: userObjectId });
}
