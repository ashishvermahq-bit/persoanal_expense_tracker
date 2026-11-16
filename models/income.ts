import { Schema, model, models, type Model } from "mongoose";
import { INCOME_SOURCES, type IIncome } from "@/types/models";

const incomeSchema = new Schema<IIncome>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, enum: INCOME_SOURCES, required: true },
    amountPaise: {
      type: Number,
      required: true,
      min: [1, "Amount must be at least 1 paisa"],
      validate: [Number.isInteger, "Amount must be an integer number of paise"],
    },
    currency: { type: String, required: true, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
    date: { type: Date, required: true },
    description: { type: String, trim: true, maxlength: 200 },
    recurringRuleId: { type: Schema.Types.ObjectId, ref: "RecurringRule", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

incomeSchema.index({ userId: 1, deletedAt: 1, date: -1 });

export const Income: Model<IIncome> =
  (models.Income as Model<IIncome>) ?? model<IIncome>("Income", incomeSchema);
