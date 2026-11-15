import { z } from "./zod";
import { objectIdSchema, paiseSchema, rupeeInputSchema } from "./common";

const budgetBaseSchema = z.object({
  categoryId: objectIdSchema,
  // Integer paise, or a human-typed rupee value normalised to paise.
  amountPaise: paiseSchema.or(rupeeInputSchema),
  // year and month are both set or both null (null = default for every month)
  year: z.number().int().min(2020).max(2100).nullable(),
  month: z.number().int().min(1).max(12).nullable(),
});

const yearMonthPaired = (d: { year?: number | null; month?: number | null }) =>
  (d.year === undefined) === (d.month === undefined) && (d.year === null) === (d.month === null);
const pairedMessage = { message: "Year and month must both be set or both be empty", path: ["year"] };

export const createBudgetSchema = budgetBaseSchema.refine(yearMonthPaired, pairedMessage);

// Zod 4: .partial() must come before .refine() (it throws on refined schemas).
export const updateBudgetSchema = budgetBaseSchema.partial().refine(yearMonthPaired, pairedMessage);

export type CreateBudget = z.infer<typeof createBudgetSchema>;
export type UpdateBudget = z.infer<typeof updateBudgetSchema>;
