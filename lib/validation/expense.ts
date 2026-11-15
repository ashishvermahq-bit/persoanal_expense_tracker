import { z } from "./zod";
import { PAYMENT_METHODS, TAX_SECTIONS, UPI_APPS } from "@/types/models";
import { RECEIPT_URL_PATTERN } from "@/lib/receipt-url";
import { amountFields, dateInputSchema, objectIdSchema, optionalText, tagsSchema } from "./common";

/** Only a receipt this app stored (no off-site or javascript: URLs in an <a>/<img>). */
const receiptUrlSchema = optionalText(500).refine((v) => v == null || RECEIPT_URL_PATTERN.test(v), "Upload the receipt again");

// No defaults here so `.partial()` (for PATCH) yields truly-absent keys.
const expenseBase = z.object({
  categoryId: objectIdSchema,
  date: dateInputSchema,
  paymentMethod: z.enum(PAYMENT_METHODS),
  upiApp: z.enum(UPI_APPS).nullable().optional(),
  taxSection: z.enum(TAX_SECTIONS),
  description: optionalText(200),
  merchant: optionalText(100),
  notes: optionalText(2000),
  receiptUrl: receiptUrlSchema,
  tags: tagsSchema,
});

const expenseFields = expenseBase.extend({
  paymentMethod: expenseBase.shape.paymentMethod.default("upi"),
  taxSection: expenseBase.shape.taxSection.default("none"),
  tags: expenseBase.shape.tags.optional().default([]),
});

/** POST /api/expenses */
export const createExpenseSchema = z
  .object({ ...expenseFields.shape, amountPaise: z.number().optional(), amount: z.union([z.string(), z.number()]).optional() })
  .transform((raw, ctx) => {
    const { amountPaise, amount, ...rest } = raw;
    const parsed = amountFields.safeParse({ amountPaise, amount });
    if (!parsed.success) {
      for (const i of parsed.error.issues) ctx.addIssue({ ...i, path: i.path.length ? i.path : ["amount"] });
      return z.NEVER;
    }
    return { ...rest, amountPaise: parsed.data, upiApp: rest.paymentMethod === "upi" ? (rest.upiApp ?? null) : null };
  });

export type CreateExpenseInput = z.output<typeof createExpenseSchema>;

/** PATCH /api/expenses/:id — every field optional. */
export const updateExpenseSchema = z
  .object({
    ...expenseBase.partial().shape,
    amountPaise: z.number().optional(),
    amount: z.union([z.string(), z.number()]).optional(),
  })
  .transform((raw, ctx) => {
    const { amountPaise, amount, ...rest } = raw;
    const out: Partial<CreateExpenseInput> = { ...rest };
    if (amountPaise !== undefined || amount !== undefined) {
      const parsed = amountFields.safeParse({ amountPaise, amount });
      if (!parsed.success) {
        for (const i of parsed.error.issues) ctx.addIssue({ ...i, path: i.path.length ? i.path : ["amount"] });
        return z.NEVER;
      }
      out.amountPaise = parsed.data;
    }
    if (rest.paymentMethod !== undefined && rest.paymentMethod !== "upi") out.upiApp = null;
    return out;
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export type UpdateExpenseInput = z.output<typeof updateExpenseSchema>;

/** "a,b" or ["a","b"] → validated array. */
const csv = <T extends string>(item: z.ZodType<T, string>) =>
  z
    .union([z.array(z.string()), z.string()])
    .transform((v) => (Array.isArray(v) ? v : v.split(",").map((s) => s.trim()).filter(Boolean)))
    .pipe(z.array(item));

/** GET /api/expenses query string (all optional). Amounts here are rupees as typed by the user. */
export const expenseFiltersSchema = z.object({
  from: dateInputSchema.optional(),
  to: dateInputSchema.optional(),
  categoryId: csv(objectIdSchema).optional(),
  paymentMethod: csv(z.enum(PAYMENT_METHODS)).optional(),
  taxSection: csv(z.enum(TAX_SECTIONS)).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().toLowerCase().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.enum(["date_desc", "date_asc", "amount_desc", "amount_asc"]).default("date_desc"),
});

export type ExpenseFilters = z.output<typeof expenseFiltersSchema>;
export type ExpenseFiltersInput = z.input<typeof expenseFiltersSchema>;
