import "server-only";
import { Types } from "mongoose";
import { ApiError } from "@/lib/api";
import { recomputeForDates } from "@/lib/summary/recompute";
import type { CreateIncomeInput, IncomeFilters, UpdateIncomeInput } from "@/lib/validation/income";
import { Income } from "@/models/income";
import type { IncomeDTO, Paged } from "@/types/dto";
import { compact } from "./compact";
import { toIncomeDTO } from "./serialize";

export async function listIncome(userId: Types.ObjectId, f: IncomeFilters): Promise<Paged<IncomeDTO>> {
  const filter: Record<string, unknown> = { userId, deletedAt: null };
  // `to` is inclusive (the last day picked), same as expenses: compare against the next IST midnight.
  if (f.from || f.to) filter.date = { ...(f.from ? { $gte: f.from } : {}), ...(f.to ? { $lt: new Date(f.to.getTime() + 86_400_000) } : {}) };
  if (f.source) filter.source = f.source;
  const skip = (f.page - 1) * f.pageSize;

  const [docs, agg] = await Promise.all([
    Income.find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(f.pageSize).lean(),
    Income.aggregate<{ total: number; totalPaise: number }>([
      { $match: filter },
      { $group: { _id: null, total: { $sum: 1 }, totalPaise: { $sum: "$amountPaise" } } },
    ]),
  ]);
  const total = agg[0]?.total ?? 0;
  return {
    items: docs.map(toIncomeDTO),
    page: f.page,
    pageSize: f.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / f.pageSize)),
    totalPaise: agg[0]?.totalPaise ?? 0,
  };
}

export async function createIncome(userId: Types.ObjectId, input: CreateIncomeInput): Promise<IncomeDTO> {
  const doc = await Income.create(compact({ ...input, userId, currency: "INR" }));
  await recomputeForDates(userId, [doc.date]);
  return toIncomeDTO(doc.toObject());
}

export async function updateIncome(userId: Types.ObjectId, id: string, input: UpdateIncomeInput): Promise<IncomeDTO> {
  if (!Types.ObjectId.isValid(id)) throw new ApiError("NOT_FOUND", "Income entry not found");
  const _id = new Types.ObjectId(id);
  const before = await Income.findOne({ _id, userId, deletedAt: null }, { date: 1 }).lean();
  if (!before) throw new ApiError("NOT_FOUND", "Income entry not found");
  const doc = await Income.findOneAndUpdate({ _id, userId, deletedAt: null }, { $set: input }, { returnDocument: "after", lean: true, runValidators: true });
  if (!doc) throw new ApiError("NOT_FOUND", "Income entry not found");
  await recomputeForDates(userId, [before.date, doc.date]);
  return toIncomeDTO(doc);
}

export async function deleteIncome(userId: Types.ObjectId, id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw new ApiError("NOT_FOUND", "Income entry not found");
  const doc = await Income.findOneAndUpdate(
    { _id: new Types.ObjectId(id), userId, deletedAt: null },
    { $set: { deletedAt: new Date() } },
    { returnDocument: "after", lean: true }
  );
  if (!doc) throw new ApiError("NOT_FOUND", "Income entry not found");
  await recomputeForDates(userId, [doc.date]);
}
