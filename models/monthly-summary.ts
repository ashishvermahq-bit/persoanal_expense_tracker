import { Schema, model, models, type Model } from "mongoose";
import {
  PAYMENT_METHODS,
  TAX_SECTIONS,
  type ICategoryBreakdown,
  type IMonthlySummary,
  type IPaymentMethodBreakdown,
  type ITaxSectionBreakdown,
} from "@/types/models";

const categoryBreakdownSchema = new Schema<ICategoryBreakdown>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    name: { type: String, required: true },
    totalPaise: { type: Number, required: true, min: 0 },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const paymentMethodBreakdownSchema = new Schema<IPaymentMethodBreakdown>(
  {
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    totalPaise: { type: Number, required: true, min: 0 },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const taxSectionBreakdownSchema = new Schema<ITaxSectionBreakdown>(
  {
    taxSection: { type: String, enum: TAX_SECTIONS, required: true },
    totalPaise: { type: Number, required: true, min: 0 },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const monthlySummarySchema = new Schema<IMonthlySummary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    year: { type: Number, required: true, min: 2000, max: 9999 },
    month: { type: Number, required: true, min: 1, max: 12 },
    totalExpensePaise: { type: Number, default: 0, min: 0 },
    totalIncomePaise: { type: Number, default: 0, min: 0 },
    // Can be negative when spending exceeds income.
    savingsPaise: { type: Number, default: 0 },
    savingsRate: { type: Number, default: null },
    expenseCount: { type: Number, default: 0, min: 0 },
    largestExpensePaise: { type: Number, default: 0, min: 0 },
    averageExpensePaise: { type: Number, default: 0, min: 0 },
    byCategory: { type: [categoryBreakdownSchema], default: [] },
    byPaymentMethod: { type: [paymentMethodBreakdownSchema], default: [] },
    byTaxSection: { type: [taxSectionBreakdownSchema], default: [] },
    dailyTotalsPaise: {
      type: [Number],
      default: () => new Array<number>(31).fill(0),
      validate: [(v: number[]) => v.length === 31, "dailyTotalsPaise must have 31 entries"],
    },
    // Fractional change in total spend vs previous month; null when there is no previous month.
    changeFromPreviousMonth: { type: Number, default: null },
    lastCalculatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

monthlySummarySchema.index({ userId: 1, year: -1, month: -1 }, { unique: true });

export const MonthlySummary: Model<IMonthlySummary> =
  (models.MonthlySummary as Model<IMonthlySummary>) ??
  model<IMonthlySummary>("MonthlySummary", monthlySummarySchema);
