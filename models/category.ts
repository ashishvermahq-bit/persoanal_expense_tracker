import { Schema, model, models, type Model } from "mongoose";
import { CATEGORY_KINDS, TAX_SECTIONS, type ICategory } from "@/types/models";

const categorySchema = new Schema<ICategory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    kind: { type: String, enum: CATEGORY_KINDS, default: "expense" },
    // lucide icon name, e.g. "shopping-basket"
    icon: { type: String, trim: true, maxlength: 50 },
    color: { type: String, match: [/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #1a2b3c"] },
    defaultTaxSection: { type: String, enum: TAX_SECTIONS, default: "none" },
    sortOrder: { type: Number, default: 1000 },
    isSystem: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

categorySchema.pre("validate", function () {
  if (this.isSystem !== (this.userId === null)) {
    throw new Error("System categories must have no userId; user categories must have one");
  }
});

categorySchema.index({ userId: 1, isArchived: 1, sortOrder: 1 });
categorySchema.index({ isSystem: 1 });
// Case-insensitive uniqueness of names per owner (system categories share userId: null).
categorySchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export const Category: Model<ICategory> =
  (models.Category as Model<ICategory>) ?? model<ICategory>("Category", categorySchema);
