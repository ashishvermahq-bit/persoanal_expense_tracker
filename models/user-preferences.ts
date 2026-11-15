import { Schema, model, models, type Model } from "mongoose";
import {
  DASHBOARD_VIEWS,
  DATE_RANGES,
  FY_STARTS,
  LOCALES,
  PAYMENT_METHODS,
  THEMES,
  UPI_APPS,
  type IUserPreferences,
} from "@/types/models";

const userPreferencesSchema = new Schema<IUserPreferences>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    currency: { type: String, default: "INR", uppercase: true, minlength: 3, maxlength: 3 },
    timezone: { type: String, default: "Asia/Kolkata" },
    locale: { type: String, enum: LOCALES, default: "en-IN" },
    fyStart: { type: String, enum: FY_STARTS, default: "april" },
    theme: { type: String, enum: THEMES, default: "system" },
    defaultPaymentMethod: { type: String, enum: PAYMENT_METHODS, default: "upi" },
    defaultUpiApp: { type: String, enum: [...UPI_APPS, null], default: null },
    budgetAlertsEnabled: { type: Boolean, default: true },
    defaultDateRange: { type: String, enum: DATE_RANGES, default: "thisMonth" },
    defaultView: { type: String, enum: DASHBOARD_VIEWS, default: "list" },
  },
  { timestamps: true }
);

export const UserPreferences: Model<IUserPreferences> =
  (models.UserPreferences as Model<IUserPreferences>) ??
  model<IUserPreferences>("UserPreferences", userPreferencesSchema);
