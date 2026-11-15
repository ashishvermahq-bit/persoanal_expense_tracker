import { Schema, model, models, type Model } from "mongoose";
import { PAYMENT_METHODS, TAX_SECTIONS, UPI_APPS, type IExpense } from "@/types/models";

const expenseSchema = new Schema<IExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    // Integer paise. ₹450.50 is stored as 45050.
    amountPaise: {
      type: Number,
      required: true,
      min: [1, "Amount must be at least 1 paisa"],
      validate: [Number.isInteger, "Amount must be an integer number of paise"],
    },
    currency: { type: String, required: true, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
    description: { type: String, trim: true, maxlength: 200 },
    merchant: { type: String, trim: true, maxlength: 100 },
    date: { type: Date, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "upi" },
    upiApp: { type: String, enum: [...UPI_APPS, null], default: null },
    taxSection: { type: String, enum: TAX_SECTIONS, default: "none" },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
      default: [],
      validate: [(v: string[]) => v.length <= 20, "At most 20 tags allowed"],
    },
    notes: { type: String, trim: true, maxlength: 2000 },
    receiptUrl: { type: String, trim: true },
    recurringRuleId: { type: Schema.Types.ObjectId, ref: "RecurringRule", default: null },
    splitGroupId: { type: Schema.Types.ObjectId, ref: "SplitGroup", default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Active expenses are queried with { userId, deletedAt: null }, so deletedAt sits before date.
expenseSchema.index({ userId: 1, deletedAt: 1, date: -1 });
expenseSchema.index({ userId: 1, categoryId: 1, date: -1 });
expenseSchema.index({ userId: 1, taxSection: 1, date: -1 });
expenseSchema.index({ userId: 1, recurringRuleId: 1, date: -1 }, { sparse: true });
// Free-text search across the human-written fields.
expenseSchema.index(
  { description: "text", merchant: "text", notes: "text", tags: "text" },
  { weights: { merchant: 5, description: 4, tags: 3, notes: 1 }, name: "expense_text" }
);

export const Expense: Model<IExpense> =
  (models.Expense as Model<IExpense>) ?? model<IExpense>("Expense", expenseSchema);
