import { Schema, model, models, type Model } from "mongoose";
import type { ICategoryBreakdown, IMonthlySummary } from "@/types/models";

const categoryBreakdownSchema = new Schema<ICategoryBreakdown>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    name: { type: String, required: true },
    total: { type: Number, required: true, min: 0 },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const monthlySummarySchema = new Schema<IMonthlySummary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true, min: 2000, max: 9999 },
    month: { type: Number, required: true, min: 1, max: 12 },
    totalAmount: { type: Number, default: 0, min: 0 },
    expenseCount: { type: Number, default: 0, min: 0 },
    largestExpense: { type: Number, default: 0, min: 0 },
    averageExpense: { type: Number, default: 0, min: 0 },
    byCategory: { type: [categoryBreakdownSchema], default: [] },
    // null when there is no previous month to compare against.
    changeFromPreviousMonth: { type: Number, default: null },
    lastCalculatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

monthlySummarySchema.index({ userId: 1, year: -1, month: -1 }, { unique: true });

export const MonthlySummary: Model<IMonthlySummary> =
  (models.MonthlySummary as Model<IMonthlySummary>) ??
  model<IMonthlySummary>("MonthlySummary", monthlySummarySchema);
