import { z } from "zod";
import { ok, parseBody, withAuth } from "@/lib/api";
import { createRecurringRule, generateRecurringEntries, listRecurringRules } from "@/lib/services/recurring";
import { objectIdSchema, paiseSchema } from "@/lib/validation/common";
import { ENTRY_KINDS, INCOME_SOURCES, PAYMENT_METHODS, RECURRENCE_FREQUENCIES, TAX_SECTIONS, UPI_APPS } from "@/types/models";

const createRecurringRuleSchema = z
  .strictObject({
    kind: z.enum(ENTRY_KINDS),
    title: z.string().trim().min(1).max(100),
    amountPaise: paiseSchema,
    categoryId: objectIdSchema.nullable().default(null),
    incomeSource: z.enum(INCOME_SOURCES).nullable().default(null),
    paymentMethod: z.enum(PAYMENT_METHODS).default("upi"),
    upiApp: z.enum(UPI_APPS).nullable().default(null),
    taxSection: z.enum(TAX_SECTIONS).default("none"),
    frequency: z.enum(RECURRENCE_FREQUENCIES),
    dayOfMonth: z.number().int().min(1).max(31),
    startsAt: z.iso.datetime({ offset: true }).transform((s) => new Date(s)),
    endsAt: z.iso.datetime({ offset: true }).transform((s) => new Date(s)).nullable().default(null),
    remindDaysBefore: z.number().int().min(0).max(30).default(2),
    isActive: z.boolean().default(true),
  })
  .refine((r) => !r.endsAt || r.endsAt > r.startsAt, { path: ["endsAt"], message: "End date must be after the start date" });

export const GET = withAuth(async (_request, _ctx, { userId }) => {
  return ok(await listRecurringRules(userId));
});

export const POST = withAuth(async (request, _ctx, { userId }) => {
  const input = await parseBody(request, createRecurringRuleSchema);
  return ok(await createRecurringRule(userId, input), { status: 201 });
});

/** Generate this user's due entries now (the cron route does it for everyone daily). */
export const PUT = withAuth(async (_request, _ctx, { userId }) => {
  return ok({ generated: await generateRecurringEntries(userId) });
});
