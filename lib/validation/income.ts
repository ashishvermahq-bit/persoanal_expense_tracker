import { z } from "./zod";
import { INCOME_SOURCES } from "@/types/models";
import { amountFields, dateInputSchema, optionalText } from "./common";

const incomeFields = z.object({
  source: z.enum(INCOME_SOURCES),
  date: dateInputSchema,
  description: optionalText(200),
});

export const createIncomeSchema = z
  .object({ ...incomeFields.shape, amountPaise: z.number().optional(), amount: z.union([z.string(), z.number()]).optional() })
  .transform((raw, ctx) => {
    const { amountPaise, amount, ...rest } = raw;
    const parsed = amountFields.safeParse({ amountPaise, amount });
    if (!parsed.success) {
      for (const i of parsed.error.issues) ctx.addIssue({ ...i, path: i.path.length ? i.path : ["amount"] });
      return z.NEVER;
    }
    return { ...rest, amountPaise: parsed.data };
  });

export type CreateIncomeInput = z.output<typeof createIncomeSchema>;

export const updateIncomeSchema = z
  .object({ ...incomeFields.partial().shape, amountPaise: z.number().optional(), amount: z.union([z.string(), z.number()]).optional() })
  .transform((raw, ctx) => {
    const { amountPaise, amount, ...rest } = raw;
    const out: Partial<CreateIncomeInput> = { ...rest };
    if (amountPaise !== undefined || amount !== undefined) {
      const parsed = amountFields.safeParse({ amountPaise, amount });
      if (!parsed.success) {
        for (const i of parsed.error.issues) ctx.addIssue({ ...i, path: i.path.length ? i.path : ["amount"] });
        return z.NEVER;
      }
      out.amountPaise = parsed.data;
    }
    return out;
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type UpdateIncomeInput = z.output<typeof updateIncomeSchema>;

export const incomeFiltersSchema = z.object({
  from: dateInputSchema.optional(),
  to: dateInputSchema.optional(),
  source: z.enum(INCOME_SOURCES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type IncomeFilters = z.output<typeof incomeFiltersSchema>;
