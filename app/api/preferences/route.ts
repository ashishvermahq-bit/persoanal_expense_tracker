import { ok, parseBody, withAuth } from "@/lib/api";
import { updatePreferences } from "@/lib/services/preferences";
import { z } from "zod";
import { DASHBOARD_VIEWS, DATE_RANGES, THEMES, FY_STARTS, LOCALES, PAYMENT_METHODS } from "@/types/models";

/** A real IANA zone name (Intl throws a RangeError for anything else). */
const timezoneSchema = z
  .string()
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone");

const updatePreferencesSchema = z.strictObject({
  theme: z.enum(THEMES).optional(),
  timezone: timezoneSchema.optional(),
  locale: z.enum(LOCALES).optional(),
  fyStart: z.enum(FY_STARTS).optional(),
  defaultPaymentMethod: z.enum(PAYMENT_METHODS).optional(),
  budgetAlertsEnabled: z.boolean().optional(),
  defaultDateRange: z.enum(DATE_RANGES).optional(),
  defaultView: z.enum(DASHBOARD_VIEWS).optional(),
});

export const PATCH = withAuth(async (request, _ctx, { userId }) => {
  const input = await parseBody(request, updatePreferencesSchema);
  const updated = await updatePreferences(userId, input);
  return ok(updated);
});
