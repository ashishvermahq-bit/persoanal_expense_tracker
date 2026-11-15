import "server-only";
import { Types } from "mongoose";
import { ApiError } from "@/lib/api";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";
import type { CategoryDTO } from "@/types/dto";
import type { CategoryKind } from "@/types/models";
import type { CreateCategoryInput, UpdateCategoryInput } from "@/lib/validation/category";
import { toCategoryDTO } from "./serialize";

/** System + the user's own categories, active first, in sort order. */
export async function listCategories(
  userId: Types.ObjectId,
  opts: { includeArchived?: boolean; kind?: CategoryKind } = {}
): Promise<CategoryDTO[]> {
  const filter: Record<string, unknown> = { $or: [{ userId: null, isSystem: true }, { userId }] };
  if (!opts.includeArchived) filter.isArchived = false;
  if (opts.kind) filter.kind = opts.kind;
  const docs = await Category.find(filter).sort({ isArchived: 1, sortOrder: 1, name: 1 }).lean();
  return docs.map(toCategoryDTO);
}

/** Resolves a category the user may use (system or their own, not archived). */
export async function assertUsableCategory(userId: Types.ObjectId, categoryId: string): Promise<Types.ObjectId> {
  const cat = await Category.findOne(
    { _id: new Types.ObjectId(categoryId), isArchived: false, $or: [{ userId: null, isSystem: true }, { userId }] },
    { _id: 1 }
  ).lean();
  if (!cat) throw new ApiError("VALIDATION", "Choose a category", { categoryId: "Choose a valid category" });
  return cat._id;
}

export async function createCategory(userId: Types.ObjectId, input: CreateCategoryInput): Promise<CategoryDTO> {
  const clash = await Category.findOne({
    name: input.name,
    $or: [{ userId: null, isSystem: true }, { userId }],
  })
    .collation({ locale: "en", strength: 2 })
    .lean();
  if (clash) throw new ApiError("CONFLICT", "A category with this name already exists", { name: "Already exists" });

  const last = await Category.findOne({ userId }).sort({ sortOrder: -1 }).lean();
  const doc = await Category.create({
    ...input,
    userId,
    isSystem: false,
    sortOrder: (last?.sortOrder ?? 1000) + 10,
  });
  return toCategoryDTO(doc.toObject());
}

export async function updateCategory(userId: Types.ObjectId, id: string, input: UpdateCategoryInput): Promise<CategoryDTO> {
  const _id = new Types.ObjectId(id);
  const existing = await Category.findOne({ _id, userId }).lean();
  if (!existing) {
    const system = await Category.exists({ _id, isSystem: true });
    if (system) throw new ApiError("FORBIDDEN", "Default categories can't be edited. Create your own instead.");
    throw new ApiError("NOT_FOUND", "Category not found");
  }
  if (input.name && input.name.toLowerCase() !== existing.name.toLowerCase()) {
    const clash = await Category.findOne({ name: input.name, _id: { $ne: _id }, $or: [{ userId: null, isSystem: true }, { userId }] })
      .collation({ locale: "en", strength: 2 })
      .lean();
    if (clash) throw new ApiError("CONFLICT", "A category with this name already exists", { name: "Already exists" });
  }
  const doc = await Category.findOneAndUpdate({ _id, userId }, { $set: input }, { returnDocument: "after", lean: true });
  return toCategoryDTO(doc!);
}

/**
 * Categories are never hard-deleted once used (expenses reference them);
 * archive instead. Unused custom categories can be removed outright.
 */
export async function deleteCategory(userId: Types.ObjectId, id: string): Promise<{ archived: boolean }> {
  const _id = new Types.ObjectId(id);
  const cat = await Category.findOne({ _id, userId }).lean();
  if (!cat) {
    if (await Category.exists({ _id, isSystem: true })) {
      throw new ApiError("FORBIDDEN", "Default categories can't be deleted.");
    }
    throw new ApiError("NOT_FOUND", "Category not found");
  }
  const inUse = await Expense.exists({ userId, categoryId: _id });
  if (inUse) {
    await Category.updateOne({ _id }, { $set: { isArchived: true } });
    return { archived: true };
  }
  await Category.deleteOne({ _id });
  return { archived: false };
}
