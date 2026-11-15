import { z } from "zod";
import { objectIdSchema, paiseSchema, rupeeInputSchema } from "./common";

export const budgetBaseSchema = z.object({
  categoryId: objectIdSchema,
  // Amount in paise or rupees (human input gets normalized)
  amountPaise: paiseSchema.or(rupeeInputSchema),
  // year and month are both set or both null (null = default for all months)
  year: z.number().int().min(2020).max(2100).nullable(),
  month: z.number().int().min(1).max(12).nullable(),
});

export const budgetFieldsSchema = budgetBaseSchema.refine(
  (data) => (data.year === null && data.month === null) || (data.year !== null && data.month !== null),
  { message: "Year and month must both be set or both be null", path: ["year"] },
);

export const createBudgetSchema = budgetFieldsSchema;

export const updateBudgetSchema = budgetFieldsSchema.partial();

export type CreateBudget = z.infer<typeof createBudgetSchema>;
export type UpdateBudget = z.infer<typeof updateBudgetSchema>;
