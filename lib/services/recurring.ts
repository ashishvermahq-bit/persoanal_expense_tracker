import "server-only";
import { Types } from "mongoose";
import { ApiError } from "@/lib/api";
import { clampDay, istMidnight, istParts } from "@/lib/dates";
import { redactForLog } from "@/lib/log";
import { RecurringRule } from "@/models/recurring-rule";
import { assertUsableCategory } from "./categories";
import { createExpense } from "./expenses";
import { createIncome } from "./income";
import type { CreateExpenseInput } from "@/lib/validation/expense";
import type { CreateIncomeInput } from "@/lib/validation/income";
import type { IRecurringRule, RecurrenceFrequency } from "@/types/models";

/** A missed cron run catches up, but never floods a ledger (e.g. a rule started years ago). */
const MAX_CATCH_UP = 24;
const MONTHS: Record<Exclude<RecurrenceFrequency, "weekly">, number> = { monthly: 1, quarterly: 3, yearly: 12 };

type Schedule = Pick<IRecurringRule, "frequency" | "dayOfMonth">;

function toObjectId(id: Types.ObjectId | string): Types.ObjectId {
  return typeof id === "string" ? new Types.ObjectId(id) : id;
}

/**
 * The occurrence after `current`, in IST civil dates. Month-based rules land on
 * `dayOfMonth`, clamped to short months (31 → 28/29 Feb, 30 Apr…) and restored
 * afterwards: a 31st rule runs 31 Jan, 28 Feb, 31 Mar, never drifting to the 28th.
 */
export function nextOccurrence(rule: Schedule, current: Date): Date {
  const { year, month, day } = istParts(current);
  if (rule.frequency === "weekly") return istMidnight(year, month, day + 7);
  const total = year * 12 + (month - 1) + MONTHS[rule.frequency];
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return istMidnight(y, m, clampDay(y, m, rule.dayOfMonth));
}

/** First occurrence on or after `startsAt` (IST). Weekly rules start on that day. */
export function firstOccurrence(rule: Schedule, startsAt: Date): Date {
  const { year, month, day } = istParts(startsAt);
  const startDay = istMidnight(year, month, day);
  if (rule.frequency === "weekly") return startDay;
  const sameMonth = istMidnight(year, month, clampDay(year, month, rule.dayOfMonth));
  if (sameMonth >= startDay) return sameMonth;
  const y = month === 12 ? year + 1 : year;
  const m = month === 12 ? 1 : month + 1;
  return istMidnight(y, m, clampDay(y, m, rule.dayOfMonth));
}

export async function listRecurringRules(userId: Types.ObjectId | string): Promise<IRecurringRule[]> {
  return RecurringRule.find({ userId: toObjectId(userId), isActive: true }).sort({ nextRunAt: 1 }).lean();
}

/**
 * Generate entries for the user's due rules, up to `now`.
 *
 * Safe to run concurrently (cron firing twice, or cron + the manual button): each
 * occurrence is claimed with a compare-and-set on `nextRunAt` BEFORE its entry is
 * written, so only one runner can win a given date. If writing the entry fails,
 * the claim is rolled back so the next run retries that date.
 */
export async function generateRecurringEntries(userId: Types.ObjectId | string, now: Date = new Date()): Promise<number> {
  const uid = toObjectId(userId);
  const dueRules = await RecurringRule.find({ userId: uid, isActive: true, nextRunAt: { $lte: now } }).lean();

  let generated = 0;
  for (const rule of dueRules) {
    let current = rule.nextRunAt;
    for (let n = 0; current <= now && n < MAX_CATCH_UP; n++) {
      if (rule.endsAt && current > rule.endsAt) {
        await RecurringRule.updateOne({ _id: rule._id, userId: uid, nextRunAt: current }, { $set: { isActive: false } });
        break;
      }
      const next = nextOccurrence(rule, current);
      const claimed = await RecurringRule.findOneAndUpdate(
        { _id: rule._id, userId: uid, isActive: true, nextRunAt: current },
        { $set: { nextRunAt: next, lastGeneratedAt: now } },
        { returnDocument: "after", lean: true }
      );
      if (!claimed) break; // another runner took this occurrence

      try {
        await createEntry(uid, rule, current);
        generated++;
      } catch (err) {
        await RecurringRule.updateOne({ _id: rule._id, nextRunAt: next }, { $set: { nextRunAt: current } });
        console.error(`[recurring] rule ${rule._id.toHexString()} failed`, redactForLog(err));
        break;
      }
      current = next;
    }
  }
  return generated;
}

async function createEntry(userId: Types.ObjectId, rule: IRecurringRule, date: Date): Promise<void> {
  // Typed as the service inputs plus recurringRuleId, which createX persists
  // (it spreads its input) so generated rows stay linked to their rule.
  if (rule.kind === "expense") {
    if (!rule.categoryId) throw new Error("Expense rule has no category");
    const input: CreateExpenseInput & { recurringRuleId: Types.ObjectId } = {
      amountPaise: rule.amountPaise,
      categoryId: rule.categoryId.toHexString(),
      date,
      paymentMethod: rule.paymentMethod,
      upiApp: rule.paymentMethod === "upi" ? (rule.upiApp ?? null) : null,
      taxSection: rule.taxSection,
      description: rule.title,
      tags: [],
      recurringRuleId: rule._id,
    };
    await createExpense(userId, input, { allowArchivedCategory: true });
  } else {
    const input: CreateIncomeInput & { recurringRuleId: Types.ObjectId } = {
      amountPaise: rule.amountPaise,
      source: rule.incomeSource ?? "other",
      date,
      description: rule.title,
      recurringRuleId: rule._id,
    };
    await createIncome(userId, input);
  }
}

/** Every user with at least one due rule (for the cron route). */
export async function usersWithDueRules(now: Date = new Date()): Promise<Types.ObjectId[]> {
  return RecurringRule.distinct("userId", { isActive: true, nextRunAt: { $lte: now } });
}

/**
 * Get upcoming recurring entries (within next 30 days or before a specific date).
 * Used on dashboard to show reminders.
 */
export async function getUpcomingRecurring(userId: Types.ObjectId | string, daysAhead = 30): Promise<IRecurringRule[]> {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  return RecurringRule.find({
    userId: toObjectId(userId),
    isActive: true,
    nextRunAt: { $gte: now, $lte: futureDate },
    $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
  })
    .sort({ nextRunAt: 1 })
    .lean();
}

export type NewRecurringRule = Omit<IRecurringRule, "_id" | "userId" | "createdAt" | "updatedAt" | "nextRunAt" | "lastGeneratedAt" | "categoryId"> & {
  categoryId: string | null;
};

export async function createRecurringRule(userId: Types.ObjectId | string, data: NewRecurringRule): Promise<IRecurringRule> {
  const uid = toObjectId(userId);
  let categoryId: Types.ObjectId | null = null;
  if (data.kind === "expense") {
    if (!data.categoryId) throw new ApiError("VALIDATION", "Choose a category", { categoryId: "Choose a category" });
    // Only the user's own or system categories (no referencing another user's).
    categoryId = await assertUsableCategory(uid, data.categoryId);
  } else if (!data.incomeSource) {
    throw new ApiError("VALIDATION", "Choose an income source", { incomeSource: "Choose an income source" });
  }
  const doc = await RecurringRule.create({
    ...data,
    categoryId,
    userId: uid,
    nextRunAt: firstOccurrence(data, data.startsAt),
    lastGeneratedAt: null,
  });
  return doc.toObject();
}

function ruleId(id: string): Types.ObjectId {
  if (!/^[0-9a-f]{24}$/i.test(id)) throw new ApiError("NOT_FOUND", "Recurring rule not found");
  return new Types.ObjectId(id);
}

export async function updateRecurringRule(
  userId: Types.ObjectId | string,
  id: string,
  data: Partial<Pick<IRecurringRule, "title" | "amountPaise" | "isActive" | "remindDaysBefore" | "endsAt">>
): Promise<IRecurringRule> {
  const doc = await RecurringRule.findOneAndUpdate({ _id: ruleId(id), userId: toObjectId(userId) }, { $set: data }, { returnDocument: "after", lean: true });
  if (!doc) throw new ApiError("NOT_FOUND", "Recurring rule not found");
  return doc;
}

export async function deleteRecurringRule(userId: Types.ObjectId | string, id: string): Promise<void> {
  await RecurringRule.deleteOne({ _id: ruleId(id), userId: toObjectId(userId) });
}
