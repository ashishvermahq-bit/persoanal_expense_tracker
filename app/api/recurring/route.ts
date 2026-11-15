import { ok, parseBody, withAuth } from "@/lib/api";
import { listRecurringRules, createRecurringRule, generateRecurringEntries } from "@/lib/services/recurring";
import { z } from "zod";
import { RECURRENCE_FREQUENCIES, PAYMENT_METHODS, UPI_APPS, TAX_SECTIONS, INCOME_SOURCES, ENTRY_KINDS } from "@/types/models";
import { objectIdSchema } from "@/lib/validation/common";

const createRecurringRuleSchema = z.object({
  kind: z.enum(ENTRY_KINDS),
  title: z.string().min(1).max(200),
  amountPaise: z.number().int().positive(),
  categoryId: objectIdSchema.optional().nullable(),
  incomeSource: z.enum(INCOME_SOURCES).optional().nullable(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  upiApp: z.enum(UPI_APPS).optional().nullable(),
  taxSection: z.enum(TAX_SECTIONS),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  dayOfMonth: z.number().int().min(1).max(31),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  remindDaysBefore: z.number().int().min(0).max(30),
  isActive: z.boolean(),
});

export const GET = withAuth(async (_request, _ctx, { userId }) => {
  const rules = await listRecurringRules(userId);
  return ok(rules);
});

export const POST = withAuth(async (request, _ctx, { userId }) => {
  const { Types } = await import("mongoose");
  const input = await parseBody(request, createRecurringRuleSchema);
  interface CreateRecurringInput {
    kind: string;
    title: string;
    amountPaise: number;
    categoryId: string | null | undefined;
    incomeSource: string | null | undefined;
    paymentMethod: string;
    upiApp: string | null;
    taxSection: string;
    frequency: string;
    dayOfMonth: number;
    startsAt: Date;
    endsAt: Date | null;
    nextRunAt: Date;
    lastGeneratedAt: null;
    isActive: boolean;
    remindDaysBefore: number;
  }
  const rule = await createRecurringRule(userId, {
    ...input,
    categoryId: input.categoryId ? new Types.ObjectId(input.categoryId) : null,
    upiApp: input.upiApp || null,
    startsAt: new Date(input.startsAt),
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    nextRunAt: new Date(input.startsAt),
    lastGeneratedAt: null,
  } as CreateRecurringInput);
  return ok(rule, { status: 201 });
});

export const PUT = withAuth(async (_request, _ctx, { userId }) => {
  // Manually generate recurring entries for the user (normally done by cron)
  const generated = await generateRecurringEntries(userId);
  return ok({ generated });
});
