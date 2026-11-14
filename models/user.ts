import { Schema, model, models, type Model } from "mongoose";
import type { IUser } from "@/types/models";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },
    // Excluded from queries by default; opt in with .select("+passwordHash").
    passwordHash: { type: String, required: true, select: false },
    isEmailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

export const User: Model<IUser> = (models.User as Model<IUser>) ?? model<IUser>("User", userSchema);
