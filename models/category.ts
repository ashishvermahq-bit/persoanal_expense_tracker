import { Schema, model, models, type Model } from "mongoose";
import type { ICategory } from "@/types/models";

const categorySchema = new Schema<ICategory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    icon: { type: String, trim: true },
    color: { type: String, match: [/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #1a2b3c"] },
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

categorySchema.index({ userId: 1, isArchived: 1 });
categorySchema.index({ isSystem: 1 });
// Case-insensitive uniqueness of names per owner (system categories share userId: null).
categorySchema.index(
  { userId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export const Category: Model<ICategory> =
  (models.Category as Model<ICategory>) ?? model<ICategory>("Category", categorySchema);
