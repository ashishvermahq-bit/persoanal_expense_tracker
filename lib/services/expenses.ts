import "server-only";
import { Types } from "mongoose";
import { ApiError } from "@/lib/api";
import { toPaise } from "@/lib/money";
import { recomputeForDates } from "@/lib/summary/recompute";
import type { CreateExpenseInput, ExpenseFilters, UpdateExpenseInput } from "@/lib/validation/expense";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";
import type { ExpenseDTO, Paged } from "@/types/dto";
import { assertUsableCategory } from "./categories";
import { compact } from "./compact";
import { toExpenseDTO, type CategoryRef } from "./serialize";

type Filter = Record<string, unknown>;

const SORTS: Record<ExpenseFilters["sort"], Record<string, 1 | -1>> = {
  date_desc: { date: -1, _id: -1 },
  date_asc: { date: 1, _id: 1 },
  amount_desc: { amountPaise: -1, _id: -1 },
  amount_asc: { amountPaise: 1, _id: 1 },
};

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildExpenseFilter(userId: Types.ObjectId, f: ExpenseFilters): Filter {
  const q: Filter = { userId, deletedAt: null };
  // `to` is inclusive (it is the last day the user picked): compare against the next IST midnight.
  if (f.from || f.to) q.date = { ...(f.from ? { $gte: f.from } : {}), ...(f.to ? { $lt: new Date(f.to.getTime() + 86_400_000) } : {}) };
  if (f.categoryId?.length) q.categoryId = { $in: f.categoryId.map((id: string) => new Types.ObjectId(id)) };
  if (f.paymentMethod?.length) q.paymentMethod = { $in: f.paymentMethod };
  if (f.taxSection?.length) q.taxSection = { $in: f.taxSection };
  if (f.minAmount !== undefined || f.maxAmount !== undefined) {
    q.amountPaise = {
      ...(f.minAmount !== undefined ? { $gte: toPaise(f.minAmount) } : {}),
      ...(f.maxAmount !== undefined ? { $lte: toPaise(f.maxAmount) } : {}),
    };
  }
  if (f.tag) q.tags = f.tag;
  if (f.q) {
    // Case-insensitive substring match so "swig" finds "Swiggy". Volumes are
    // per-user and small; the text index stays available for bulk search later.
    const rx = new RegExp(escapeRegex(f.q), "i");
    q.$or = [{ description: rx }, { merchant: rx }, { notes: rx }, { tags: rx }];
  }
  return q;
}

async function categoryMap(ids: Iterable<Types.ObjectId>): Promise<Map<string, CategoryRef>> {
  const unique = Array.from(new Set(Array.from(ids, (i) => i.toHexString()))).map((h) => new Types.ObjectId(h));
  if (unique.length === 0) return new Map();
  const cats = await Category.find({ _id: { $in: unique } }, { name: 1, icon: 1, color: 1 }).lean();
  return new Map(cats.map((c) => [c._id.toHexString(), c]));
}

export async function listExpenses(userId: Types.ObjectId, f: ExpenseFilters): Promise<Paged<ExpenseDTO>> {
  const filter = buildExpenseFilter(userId, f);
  const skip = (f.page - 1) * f.pageSize;

  const [docs, agg] = await Promise.all([
    Expense.find(filter).sort(SORTS[f.sort]).skip(skip).limit(f.pageSize).lean(),
    Expense.aggregate<{ total: number; totalPaise: number }>([
      { $match: filter },
      { $group: { _id: null, total: { $sum: 1 }, totalPaise: { $sum: "$amountPaise" } } },
    ]),
  ]);
  const total = agg[0]?.total ?? 0;
  const cats = await categoryMap(docs.map((d) => d.categoryId));

  return {
    items: docs.map((d) => toExpenseDTO(d, cats.get(d.categoryId.toHexString()) ?? null)),
    page: f.page,
    pageSize: f.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / f.pageSize)),
    totalPaise: agg[0]?.totalPaise ?? 0,
  };
}

export async function getExpense(userId: Types.ObjectId, id: string): Promise<ExpenseDTO> {
  if (!Types.ObjectId.isValid(id)) throw new ApiError("NOT_FOUND", "Expense not found");
  const doc = await Expense.findOne({ _id: new Types.ObjectId(id), userId, deletedAt: null }).lean();
  if (!doc) throw new ApiError("NOT_FOUND", "Expense not found");
  const cat = await Category.findById(doc.categoryId, { name: 1, icon: 1, color: 1 }).lean();
  return toExpenseDTO(doc, cat);
}

/** `allowArchivedCategory`: for recurring rules created before their category was archived. */
export async function createExpense(userId: Types.ObjectId, input: CreateExpenseInput, opts: { allowArchivedCategory?: boolean } = {}): Promise<ExpenseDTO> {
  const categoryId = await assertUsableCategory(userId, input.categoryId, { allowArchived: opts.allowArchivedCategory });
  const doc = await Expense.create(compact({ ...input, categoryId, userId, currency: "INR" }));
  await recomputeForDates(userId, [doc.date]);
  const cat = await Category.findById(categoryId, { name: 1, icon: 1, color: 1 }).lean();
  return toExpenseDTO(doc.toObject(), cat);
}

export async function updateExpense(userId: Types.ObjectId, id: string, input: UpdateExpenseInput): Promise<ExpenseDTO> {
  if (!Types.ObjectId.isValid(id)) throw new ApiError("NOT_FOUND", "Expense not found");
  const _id = new Types.ObjectId(id);
  const before = await Expense.findOne({ _id, userId, deletedAt: null }, { date: 1, categoryId: 1 }).lean();
  if (!before) throw new ApiError("NOT_FOUND", "Expense not found");

  const $set: Record<string, unknown> = { ...input };
  // Only a *changed* category must be usable: an expense whose category was archived
  // later keeps it (the edit form re-sends it), otherwise it could never be edited.
  if (input.categoryId && input.categoryId !== before.categoryId.toHexString()) {
    $set.categoryId = await assertUsableCategory(userId, input.categoryId);
  } else {
    delete $set.categoryId;
  }

  const doc = await Expense.findOneAndUpdate(
    { _id, userId, deletedAt: null },
    { $set },
    { returnDocument: "after", lean: true, runValidators: true }
  );
  if (!doc) throw new ApiError("NOT_FOUND", "Expense not found");

  await recomputeForDates(userId, [before.date, doc.date]);
  const cat = await Category.findById(doc.categoryId, { name: 1, icon: 1, color: 1 }).lean();
  return toExpenseDTO(doc, cat);
}

/** Soft delete; the row stays for audit/undo and is excluded from every query. */
export async function deleteExpense(userId: Types.ObjectId, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw new ApiError("NOT_FOUND", "Expense not found");
  const doc = await Expense.findOneAndUpdate(
    { _id: new Types.ObjectId(id), userId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { returnDocument: "after", lean: true }
  );
  if (!doc) throw new ApiError("NOT_FOUND", "Expense not found");
  await recomputeForDates(userId, [doc.date]);
}

/** Undo a soft delete (the list's 5-second "Undo" toast). Only the owner's own deleted rows. */
export async function restoreExpense(userId: Types.ObjectId, id: string): Promise<ExpenseDTO> {
  if (!Types.ObjectId.isValid(id)) throw new ApiError("NOT_FOUND", "Expense not found");
  const doc = await Expense.findOneAndUpdate(
    { _id: new Types.ObjectId(id), userId, deletedAt: { $ne: null } },
    { $set: { deletedAt: null } },
    { returnDocument: "after", lean: true }
  );
  if (!doc) throw new ApiError("NOT_FOUND", "Expense not found");
  await recomputeForDates(userId, [doc.date]);
  const cat = await Category.findById(doc.categoryId, { name: 1, icon: 1, color: 1 }).lean();
  return toExpenseDTO(doc, cat);
}

/** The user's most-used categories recently — drives the quick-add chip order. */
export async function recentCategoryIds(userId: Types.ObjectId, limit = 8): Promise<string[]> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await Expense.aggregate<{ _id: Types.ObjectId }>([
    { $match: { userId, deletedAt: null, date: { $gte: since } } },
    { $group: { _id: "$categoryId", n: { $sum: 1 }, last: { $max: "$date" } } },
    { $sort: { n: -1, last: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => r._id.toHexString());
}
