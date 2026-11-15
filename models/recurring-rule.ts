import { Schema, model, models, type Model } from "mongoose";
import {
  ENTRY_KINDS,
  INCOME_SOURCES,
  PAYMENT_METHODS,
  RECURRENCE_FREQUENCIES,
  TAX_SECTIONS,
  UPI_APPS,
  type IRecurringRule,
} from "@/types/models";

const recurringRuleSchema = new Schema<IRecurringRule>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: { type: String, enum: ENTRY_KINDS, required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: [Number.isInteger, "Amount must be an integer number of paise"],
    },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    incomeSource: { type: String, enum: [...INCOME_SOURCES, null], default: null },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "upi" },
    upiApp: { type: String, enum: [...UPI_APPS, null], default: null },
    taxSection: { type: String, enum: TAX_SECTIONS, default: "none" },
    frequency: { type: String, enum: RECURRENCE_FREQUENCIES, default: "monthly" },
    dayOfMonth: { type: Number, default: 1, min: 1, max: 31 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, default: null },
    nextRunAt: { type: Date, required: true },
    lastGeneratedAt: { type: Date, default: null },
    remindDaysBefore: { type: Number, default: 2, min: 0, max: 30 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

recurringRuleSchema.pre("validate", function () {
  if (this.kind === "expense" && !this.categoryId) throw new Error("Expense rules need a categoryId");
  if (this.kind === "income" && !this.incomeSource) throw new Error("Income rules need an incomeSource");
});

recurringRuleSchema.index({ userId: 1, isActive: 1, nextRunAt: 1 });

export const RecurringRule: Model<IRecurringRule> =
  (models.RecurringRule as Model<IRecurringRule>) ??
  model<IRecurringRule>("RecurringRule", recurringRuleSchema);
