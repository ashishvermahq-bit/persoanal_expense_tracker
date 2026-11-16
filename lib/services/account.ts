import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { ApiError } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { LOGIN_FAILURE_LIMIT, resetRateLimit } from "@/lib/auth/rate-limit";
import { csvRow } from "@/lib/csv";
import { formatDateIN } from "@/lib/dates";
import { formatRupeesPlain } from "@/lib/money";
import { Budget } from "@/models/budget";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";
import { Income } from "@/models/income";
import { MonthlySummary } from "@/models/monthly-summary";
import { PasswordResetToken } from "@/models/password-reset-token";
import { Receipt } from "@/models/receipt";
import { RecurringRule } from "@/models/recurring-rule";
import { SplitEntry, SplitGroup } from "@/models/split";
import { User } from "@/models/user";
import { UserPreferences } from "@/models/user-preferences";

/** Reset links work once, for 30 minutes. */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Change the password and revoke every other session: bumping sessionVersion
 * invalidates all tokens issued before. Returns the new version so the caller
 * can re-issue the current device's cookie.
 */
export async function changePassword(userId: Types.ObjectId, currentPassword: string, newPassword: string): Promise<number> {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new ApiError("UNAUTHORIZED", "Please sign in");
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new ApiError("VALIDATION", "Current password is incorrect", { currentPassword: "Current password is incorrect" });
  }
  const passwordHash = await hashPassword(newPassword);
  const updated = await User.findOneAndUpdate({ _id: userId }, { $set: { passwordHash }, $inc: { sessionVersion: 1 } }, { returnDocument: "after", lean: true });
  // Any reset link still in flight would otherwise undo this change.
  await PasswordResetToken.deleteMany({ userId });
  return updated!.sessionVersion;
}

/**
 * Start a reset for `email`. Returns the raw token for the mailer, or null when
 * there's no such account; callers must respond identically either way.
 */
export async function createPasswordResetToken(email: string, now: Date = new Date()): Promise<{ token: string; userId: Types.ObjectId } | null> {
  const user = await User.findOne({ email }, { _id: 1 }).lean();
  if (!user) return null;
  const token = randomBytes(32).toString("base64url"); // 43 chars
  await PasswordResetToken.deleteMany({ userId: user._id, usedAt: null }); // only the newest link works
  await PasswordResetToken.create({ userId: user._id, tokenHash: sha256(token), expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS) });
  return { token, userId: user._id };
}

/**
 * Spend a reset token: single use (atomic claim), unexpired, then set the new
 * password and sign out every device. Clears the failed-login lock for the email.
 */
export async function resetPasswordWithToken(token: string, newPassword: string, now: Date = new Date()): Promise<void> {
  const claimed = await PasswordResetToken.findOneAndUpdate(
    { tokenHash: sha256(token), usedAt: null, expiresAt: { $gt: now } },
    { $set: { usedAt: now } },
    { returnDocument: "after", lean: true }
  );
  if (!claimed) throw new ApiError("VALIDATION", "This reset link has expired or was already used. Ask for a new one.", { token: "Expired or already used" });
  const passwordHash = await hashPassword(newPassword);
  const user = await User.findOneAndUpdate(
    { _id: claimed.userId },
    { $set: { passwordHash, failedLoginCount: 0, lockedUntil: null }, $inc: { sessionVersion: 1 } },
    { returnDocument: "after", lean: true }
  );
  if (!user) throw new ApiError("VALIDATION", "This reset link has expired or was already used. Ask for a new one.");
  await resetRateLimit(`login:fail:${user.email}`, LOGIN_FAILURE_LIMIT, now);
}

/**
 * Erase the account and everything it owns (DPDP Act 2023: right to erasure).
 * Shared system categories stay; the user's own categories go.
 */
export async function deleteAccount(userId: Types.ObjectId, password: string): Promise<void> {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw new ApiError("UNAUTHORIZED", "Please sign in");
  if (!(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError("VALIDATION", "Password is incorrect", { password: "Password is incorrect" });
  }
  const mine = { userId };
  await Promise.all([
    Expense.deleteMany(mine),
    Income.deleteMany(mine),
    Budget.deleteMany(mine),
    Category.deleteMany({ userId, isSystem: false }),
    MonthlySummary.deleteMany(mine),
    RecurringRule.deleteMany(mine),
    SplitEntry.deleteMany(mine),
    SplitGroup.deleteMany(mine),
    UserPreferences.deleteMany(mine),
    Receipt.deleteMany(mine),
    PasswordResetToken.deleteMany(mine),
  ]);
  // Last, so a failure above leaves a still-usable account to retry from.
  await User.deleteOne({ _id: userId });
}

/**
 * Everything stored about the user, as JSON (DPDP Act 2023: right to access).
 * Includes soft-deleted entries, marked with `deletedAt`. Receipt files are
 * listed (id, type, size) rather than inlined; each one downloads from its URL.
 */
export async function exportAccountJSON(userId: Types.ObjectId): Promise<Record<string, unknown>> {
  const mine = { userId };
  // Drop internal fields (the owner id is the requester; __v is Mongoose bookkeeping).
  const strip = <T extends object>(docs: T[]) =>
    docs.map((d) => Object.fromEntries(Object.entries(d).filter(([k]) => k !== "__v" && k !== "userId")));
  const [user, preferences, categories, expenses, income, budgets, recurring, splitGroups, splitEntries, receipts] = await Promise.all([
    User.findById(userId, { name: 1, email: 1, createdAt: 1, lastLoginAt: 1 }).lean(),
    UserPreferences.findOne(mine, { _id: 0, __v: 0, userId: 0 }).lean(),
    Category.find({ userId }).lean(),
    Expense.find(mine).sort({ date: 1 }).lean(),
    Income.find(mine).sort({ date: 1 }).lean(),
    Budget.find(mine).lean(),
    RecurringRule.find(mine).lean(),
    SplitGroup.find(mine).lean(),
    SplitEntry.find(mine).lean(),
    Receipt.find(mine, { data: 0 }).lean(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    note: "Amounts are integer paise (₹1 = 100 paise). Dates are UTC instants; the app shows them in IST.",
    account: user ? { name: user.name, email: user.email, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt } : null,
    preferences,
    categories: strip(categories),
    expenses: strip(expenses),
    income: strip(income),
    budgets: strip(budgets),
    recurringRules: strip(recurring),
    splitGroups: strip(splitGroups),
    splitEntries: strip(splitEntries),
    receipts: receipts.map((r) => ({ id: r._id, contentType: r.contentType, size: r.size, createdAt: r.createdAt })),
  };
}

/** All-time expenses and income as one spreadsheet-safe CSV. */
export async function exportAccountCSV(userId: Types.ObjectId): Promise<string> {
  const [expenses, income, categories] = await Promise.all([
    Expense.find({ userId, deletedAt: null }).sort({ date: 1 }).lean(),
    Income.find({ userId, deletedAt: null }).sort({ date: 1 }).lean(),
    Category.find({ $or: [{ userId }, { isSystem: true }] }, { name: 1 }).lean(),
  ]);
  const names = new Map(categories.map((c) => [c._id.toHexString(), c.name]));
  const lines = [csvRow(["Type", "Date", "Category / Source", "Amount (₹)", "Amount (paise)", "Payment method", "Description", "Merchant", "Tags", "Notes", "Tax section"])];
  for (const e of expenses) {
    lines.push(
      csvRow([
        "expense",
        formatDateIN(e.date),
        names.get(e.categoryId.toHexString()) ?? "Unknown",
        formatRupeesPlain(e.amountPaise),
        e.amountPaise,
        e.paymentMethod,
        e.description ?? "",
        e.merchant ?? "",
        (e.tags ?? []).join("; "),
        e.notes ?? "",
        e.taxSection,
      ])
    );
  }
  for (const i of income) {
    lines.push(csvRow(["income", formatDateIN(i.date), i.source, formatRupeesPlain(i.amountPaise), i.amountPaise, "", i.description ?? "", "", "", "", ""]));
  }
  return lines.join("\r\n");
}
