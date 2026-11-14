import { Schema, model, models, type Model } from "mongoose";
import { DASHBOARD_VIEWS, DATE_RANGES, type IUserPreferences } from "@/types/models";

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    currency: { type: String, default: "USD", uppercase: true, minlength: 3, maxlength: 3 },
    timezone: { type: String, default: "UTC" },
    defaultDateRange: { type: String, enum: DATE_RANGES, default: "thisMonth" },
    defaultView: { type: String, enum: DASHBOARD_VIEWS, default: "list" },
  },
  { timestamps: true }
);

export const UserPreferences: Model<IUserPreferences> =
  (models.UserPreferences as Model<IUserPreferences>) ??
  model<IUserPreferences>("UserPreferences", userPreferencesSchema);
