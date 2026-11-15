import "server-only";
import { Types } from "mongoose";
import { RecurringRule } from "@/models/recurring-rule";
import { createExpense } from "./expenses";
import { createIncome } from "./income";
import type { CreateExpenseInput } from "@/lib/validation/expense";
import type { CreateIncomeInput } from "@/lib/validation/income";
import type { IRecurringRule } from "@/types/models";

export async function listRecurringRules(userId: Types.ObjectId | string): Promise<IRecurringRule[]> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  return RecurringRule.find({ userId: userObjectId, isActive: true })
    .sort({ nextRunAt: 1 })
    .lean();
}

/**
 * Generate recurring expense/income entries for rules that are due.
 * Run this periodically (cron job, or on-demand at dashboard load).
 */
export async function generateRecurringEntries(userId: Types.ObjectId | string): Promise<number> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const now = new Date();

  const dueRules = await RecurringRule.find({
    userId: userObjectId,
    isActive: true,
    nextRunAt: { $lte: now },
    $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
  }).lean();

  let generated = 0;

  for (const rule of dueRules) {
    try {
      // Typed as the service inputs plus recurringRuleId, which createX persists
      // (it spreads its input) so generated rows stay linked to their rule.
      if (rule.kind === "expense") {
        if (!rule.categoryId) throw new Error("Expense rule has no category");
        const input: CreateExpenseInput & { recurringRuleId: Types.ObjectId } = {
          amountPaise: rule.amountPaise,
          categoryId: rule.categoryId.toString(),
          date: rule.nextRunAt,
          paymentMethod: rule.paymentMethod,
          upiApp: rule.upiApp ?? null,
          taxSection: rule.taxSection,
          description: rule.title,
          tags: [],
          recurringRuleId: rule._id,
        };
        await createExpense(userObjectId, input);
      } else {
        const input: CreateIncomeInput & { recurringRuleId: Types.ObjectId } = {
          amountPaise: rule.amountPaise,
          source: rule.incomeSource ?? "other",
          date: rule.nextRunAt,
          description: rule.title,
          recurringRuleId: rule._id,
        };
        await createIncome(userObjectId, input);
      }
      generated++;
    } catch (err) {
      console.error(`Failed to generate recurring entry for rule ${rule._id}:`, err);
    }

    // Update nextRunAt
    const nextRun = getNextRunDate(rule.nextRunAt, rule.frequency);
    await RecurringRule.updateOne(
      { _id: rule._id },
      {
        nextRunAt: nextRun,
        lastGeneratedAt: now,
      }
    );
  }

  return generated;
}

function getNextRunDate(currentRun: Date, frequency: IRecurringRule["frequency"]): Date {
  const next = new Date(currentRun);
  switch (frequency) {
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

/**
 * Get upcoming recurring entries (within next 30 days or before a specific date).
 * Used on dashboard to show reminders.
 */
export async function getUpcomingRecurring(
  userId: Types.ObjectId | string,
  daysAhead = 30
): Promise<IRecurringRule[]> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  return RecurringRule.find({
    userId: userObjectId,
    isActive: true,
    nextRunAt: { $gte: now, $lte: futureDate },
    $or: [{ endsAt: null }, { endsAt: { $gte: now } }],
  })
    .sort({ nextRunAt: 1 })
    .lean();
}

export async function createRecurringRule(
  userId: Types.ObjectId | string,
  data: Omit<IRecurringRule, "_id" | "userId" | "createdAt" | "updatedAt">
): Promise<IRecurringRule> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const doc = await RecurringRule.create({
    ...data,
    userId: userObjectId,
  });
  return doc.toObject();
}

export async function updateRecurringRule(
  userId: Types.ObjectId | string,
  ruleId: string,
  data: Partial<Omit<IRecurringRule, "_id" | "userId" | "createdAt" | "updatedAt">>
): Promise<IRecurringRule> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const ruleObjectId = new Types.ObjectId(ruleId);

  const doc = await RecurringRule.findOneAndUpdate(
    { _id: ruleObjectId, userId: userObjectId },
    { $set: data },
    { returnDocument: "after", lean: true }
  );

  if (!doc) throw new Error("Recurring rule not found");
  return doc;
}

export async function deleteRecurringRule(userId: Types.ObjectId | string, ruleId: string): Promise<void> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const ruleObjectId = new Types.ObjectId(ruleId);

  await RecurringRule.deleteOne({ _id: ruleObjectId, userId: userObjectId });
}
