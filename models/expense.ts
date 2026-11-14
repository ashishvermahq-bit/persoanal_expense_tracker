import { Schema, model, models, type Model } from "mongoose";
import { PAYMENT_METHODS, type IExpense } from "@/types/models";

const expenseSchema = new Schema<IExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than zero"],
      set: (v: number) => Math.round(v * 100) / 100,
    },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    description: { type: String, trim: true, maxlength: 200 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "other" },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
      default: [],
      validate: [(v: string[]) => v.length <= 20, "At most 20 tags allowed"],
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    receiptUrl: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Active expenses are queried with { userId, deletedAt: null }, so deletedAt sits before date.
expenseSchema.index({ userId: 1, deletedAt: 1, date: -1 });
expenseSchema.index({ userId: 1, categoryId: 1, date: -1 });

export const Expense: Model<IExpense> =
  (models.Expense as Model<IExpense>) ?? model<IExpense>("Expense", expenseSchema);
