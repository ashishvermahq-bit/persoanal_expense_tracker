import { ok, parseBody, withAuth } from "@/lib/api";
import { updatePreferences } from "@/lib/services/preferences";
import { z } from "zod";
import { THEMES, FY_STARTS, LOCALES, PAYMENT_METHODS } from "@/types/models";

const updatePreferencesSchema = z.object({
  theme: z.enum(THEMES).optional(),
  timezone: z.string().optional(),
  locale: z.enum(LOCALES).optional(),
  fyStart: z.enum(FY_STARTS).optional(),
  defaultPaymentMethod: z.enum(PAYMENT_METHODS).optional(),
  budgetAlertsEnabled: z.boolean().optional(),
  defaultDateRange: z.string().optional(),
  defaultView: z.string().optional(),
});

export const PATCH = withAuth(async (request, _ctx, { userId }) => {
  const input = await parseBody(request, updatePreferencesSchema);
  const updated = await updatePreferences(userId, input);
  return ok(updated);
});
