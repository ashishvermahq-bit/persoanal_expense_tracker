import { Schema, model, models, type Model } from "mongoose";
import type { IBudget } from "@/types/models";

const budgetSchema = new Schema<IBudget>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    amountPaise: {
      type: Number,
      required: true,
      min: [1, "Budget must be at least 1 paisa"],
      validate: [Number.isInteger, "Amount must be an integer number of paise"],
    },
    // Both null => the recurring default for every month. Both set => override for that month.
    year: { type: Number, default: null, min: 2000, max: 9999 },
    month: { type: Number, default: null, min: 1, max: 12 },
  },
  { timestamps: true }
);

budgetSchema.pre("validate", function () {
  if ((this.year === null) !== (this.month === null)) {
    throw new Error("year and month must be both set or both null");
  }
});

budgetSchema.index({ userId: 1, categoryId: 1, year: 1, month: 1 }, { unique: true });

export const Budget: Model<IBudget> =
  (models.Budget as Model<IBudget>) ?? model<IBudget>("Budget", budgetSchema);
