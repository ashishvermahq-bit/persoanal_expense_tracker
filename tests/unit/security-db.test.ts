import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { seedSystemCategories } from "@/lib/seed/categories";
import { changePassword, createPasswordResetToken, deleteAccount, exportAccountCSV, exportAccountJSON, resetPasswordWithToken, RESET_TOKEN_TTL_MS } from "@/lib/services/account";
import { upsertBudget } from "@/lib/services/budgets";
import { createCategory, deleteCategory, updateCategory } from "@/lib/services/categories";
import { buildExpenseFilter, createExpense, deleteExpense, getExpense, restoreExpense, updateExpense } from "@/lib/services/expenses";
import { exportToCSV } from "@/lib/services/export";
import { createIncome, deleteIncome, updateIncome } from "@/lib/services/income";
import { createRecurringRule, generateRecurringEntries } from "@/lib/services/recurring";
import { getReceipt, putReceipt } from "@/lib/storage";
import { istMidnight } from "@/lib/dates";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";
import { Income } from "@/models/income";
import { PasswordResetToken } from "@/models/password-reset-token";
import { Receipt } from "@/models/receipt";
import { RecurringRule } from "@/models/recurring-rule";
import { User } from "@/models/user";

let mongod: MongoMemoryServer;
let alice: Types.ObjectId;
let bob: Types.ObjectId;
let aliceCat: string; // Alice's own custom category
let systemCat: string;

async function makeUser(email: string) {
  const u = await User.create({ name: email.split("@")[0], email, passwordHash: await hashPassword("Secret123") });
  return u._id;
}

const notFound = (p: Promise<unknown>) => expect(p).rejects.toMatchObject({ code: "NOT_FOUND" });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedSystemCategories();
  alice = await makeUser("alice@example.com");
  bob = await makeUser("bob@example.com");
  aliceCat = (await createCategory(alice, { name: "Alice private", kind: "expense", defaultTaxSection: "none" })).id;
  systemCat = (await Category.findOne({ isSystem: true, kind: "expense" }).lean())!._id.toHexString();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("IDOR: another user's records are invisible and untouchable", () => {
  it("expenses: read, edit, delete, restore by id all 404 for Bob", async () => {
    const e = await createExpense(alice, { amountPaise: 10_000, categoryId: aliceCat, date: istMidnight(2026, 11, 2), paymentMethod: "upi", upiApp: null, taxSection: "none", tags: [] });
    await notFound(getExpense(bob, e.id));
    await notFound(updateExpense(bob, e.id, { amountPaise: 1 }));
    await notFound(deleteExpense(bob, e.id));
    await deleteExpense(alice, e.id);
    await notFound(restoreExpense(bob, e.id));
    expect((await Expense.findById(e.id).lean())!.amountPaise).toBe(10_000);
    await notFound(getExpense(alice, "not-an-id"));
  });

  it("income: edit and delete by id 404 for Bob", async () => {
    const i = await createIncome(alice, { amountPaise: 5_000_00, source: "salary", date: istMidnight(2026, 11, 1) });
    await notFound(updateIncome(bob, i.id, { amountPaise: 1 }));
    await notFound(deleteIncome(bob, i.id));
    expect((await Income.findById(i.id).lean())!.deletedAt).toBeNull();
  });

  it("categories: Bob can't edit, delete or use Alice's category", async () => {
    await notFound(updateCategory(bob, aliceCat, { name: "Pwned" }));
    await notFound(deleteCategory(bob, aliceCat));
    await notFound(updateCategory(bob, "zzz", { name: "x" }));
    await expect(createExpense(bob, { amountPaise: 1, categoryId: aliceCat, date: new Date(), paymentMethod: "cash", upiApp: null, taxSection: "none", tags: [] })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("budgets: Bob can't budget on Alice's category (which would echo its name back)", async () => {
    await expect(upsertBudget(bob, { categoryId: aliceCat, amountPaise: 1_000_00, year: null, month: null })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(upsertBudget(bob, { categoryId: systemCat, amountPaise: 1_000_00, year: null, month: null })).resolves.toMatchObject({ categoryId: systemCat });
  });

  it("recurring rules: Bob can't reference Alice's category", async () => {
    const rule = { kind: "expense" as const, title: "x", amountPaise: 100, incomeSource: null, paymentMethod: "upi" as const, upiApp: null, taxSection: "none" as const, frequency: "monthly" as const, dayOfMonth: 1, startsAt: new Date(), endsAt: null, remindDaysBefore: 2, isActive: true };
    await expect(createRecurringRule(bob, { ...rule, categoryId: aliceCat })).rejects.toBeInstanceOf(ApiError);
    await expect(createRecurringRule(bob, { ...rule, categoryId: systemCat })).resolves.toBeTruthy();
  });

  it("receipts: only the owner can fetch one", async () => {
    const stored = await putReceipt(alice, { bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), contentType: "application/pdf" });
    const file = stored.url.split("/").pop()!;
    expect(await getReceipt(alice, file)).not.toBeNull();
    expect(await getReceipt(bob, file)).toBeNull();
    expect(await getReceipt(alice, "../../etc/passwd")).toBeNull();
  });
});

describe("search input is a literal (no regex injection / ReDoS)", () => {
  it("escapes regex metacharacters", () => {
    const q = buildExpenseFilter(alice, { q: "(a+)+$", page: 1, pageSize: 25, sort: "date_desc" } as never);
    const rx = (q.$or as { description: RegExp }[])[0]!.description;
    expect(rx.source).toBe("\\(a\\+\\)\\+\\$");
    expect(rx.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaa!")).toBe(false);
  });
});

describe("CSV export: formula injection end to end", () => {
  it("prefixes dangerous cells and keeps every row one line of 8 quoted cells", async () => {
    await createExpense(alice, {
      amountPaise: 1_23_456_78,
      categoryId: systemCat,
      date: istMidnight(2026, 11, 3),
      paymentMethod: "upi",
      upiApp: null,
      taxSection: "none",
      tags: [],
      merchant: '=HYPERLINK("http://evil.example","Refund")',
      description: 'Dinner, "team"',
    });
    const csv = await exportToCSV(alice, { year: 2026, month: 11 });
    const row = csv.split("\r\n").find((l) => l.includes("HYPERLINK"))!;
    expect(row).toContain(`"'=HYPERLINK(""http://evil.example"",""Refund"")"`);
    expect(row).toContain(`"Dinner, ""team"""`);
    expect(row).toContain(`"1,23,456.78"`);
    expect(csv).not.toMatch(/(^|,)=HYPERLINK/m);
  });
});

describe("password reset tokens", () => {
  it("are single use, expire, and sign out every session", async () => {
    const u = await makeUser("reset@example.com");
    const issued = (await createPasswordResetToken("reset@example.com"))!;
    expect(issued.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // Only a hash is stored.
    expect(await PasswordResetToken.exists({ tokenHash: issued.token })).toBeNull();

    await resetPasswordWithToken(issued.token, "NewSecret456");
    const after = await User.findById(u).select("+passwordHash").lean();
    expect(await verifyPassword("NewSecret456", after!.passwordHash)).toBe(true);
    expect(after!.sessionVersion).toBe(1);
    await expect(resetPasswordWithToken(issued.token, "Another789")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("are refused after 30 minutes", async () => {
    await makeUser("expiry@example.com");
    const t0 = new Date("2026-11-16T10:00:00Z");
    const issued = (await createPasswordResetToken("expiry@example.com", t0))!;
    const late = new Date(t0.getTime() + RESET_TOKEN_TTL_MS + 1000);
    await expect(resetPasswordWithToken(issued.token, "NewSecret456", late)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("unknown emails get no token (and the route answers the same either way)", async () => {
    expect(await createPasswordResetToken("nobody@example.com")).toBeNull();
  });

  it("only the newest link works", async () => {
    await makeUser("twice@example.com");
    const first = (await createPasswordResetToken("twice@example.com"))!;
    await createPasswordResetToken("twice@example.com");
    await expect(resetPasswordWithToken(first.token, "NewSecret456")).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("change password", () => {
  it("needs the current password and revokes other sessions", async () => {
    const u = await makeUser("change@example.com");
    await expect(changePassword(u, "wrong", "NewSecret456")).rejects.toMatchObject({ code: "VALIDATION" });
    const version = await changePassword(u, "Secret123", "NewSecret456");
    expect(version).toBe(1);
    expect((await User.findById(u).lean())!.sessionVersion).toBe(1);
  });
});

describe("recurring generation", () => {
  it("never double-generates when two runs race, and catches up missed months", async () => {
    const u = await makeUser("recurring@example.com");
    await createRecurringRule(u, {
      kind: "expense",
      title: "Rent",
      amountPaise: 25_000_00,
      categoryId: systemCat,
      incomeSource: null,
      paymentMethod: "net_banking",
      upiApp: null,
      taxSection: "HRA",
      frequency: "monthly",
      dayOfMonth: 31,
      startsAt: istMidnight(2027, 1, 1),
      endsAt: null,
      remindDaysBefore: 2,
      isActive: true,
    });
    const now = istMidnight(2027, 4, 15);
    const [a, b] = await Promise.all([generateRecurringEntries(u, now), generateRecurringEntries(u, now)]);
    expect(a + b).toBe(3); // 31 Jan, 28 Feb, 31 Mar
    const dates = (await Expense.find({ userId: u }).sort({ date: 1 }).lean()).map((e) => e.date.getTime());
    expect(dates).toEqual([istMidnight(2027, 1, 31), istMidnight(2027, 2, 28), istMidnight(2027, 3, 31)].map((d) => d.getTime()));
    expect(await generateRecurringEntries(u, now)).toBe(0);
    expect((await RecurringRule.findOne({ userId: u }).lean())!.nextRunAt.getTime()).toBe(istMidnight(2027, 4, 30).getTime());
  });
});

describe("account export and deletion (DPDP)", () => {
  it("exports the user's own data only, then erases all of it", async () => {
    const u = await makeUser("leaving@example.com");
    const cat = await createCategory(u, { name: "Mine", kind: "expense", defaultTaxSection: "none" });
    await createExpense(u, { amountPaise: 99_00, categoryId: cat.id, date: istMidnight(2026, 10, 5), paymentMethod: "cash", upiApp: null, taxSection: "none", tags: [], merchant: "@cmd" });
    await createIncome(u, { amountPaise: 1_00_000_00, source: "salary", date: istMidnight(2026, 10, 1) });
    await putReceipt(u, { bytes: new Uint8Array([0xff, 0xd8, 0xff]), contentType: "image/jpeg" });

    const json = await exportAccountJSON(u);
    expect(json.account).toMatchObject({ email: "leaving@example.com" });
    expect(JSON.stringify(json)).not.toContain("passwordHash");
    expect((json.expenses as unknown[]).length).toBe(1);
    expect((json.receipts as unknown[]).length).toBe(1);
    const csv = await exportAccountCSV(u);
    expect(csv).toContain(`"'@cmd"`);

    await expect(deleteAccount(u, "wrong")).rejects.toMatchObject({ code: "VALIDATION" });
    await deleteAccount(u, "Secret123");
    expect(await User.exists({ _id: u })).toBeNull();
    for (const model of [Expense, Income, Receipt]) expect(await (model as typeof Expense).countDocuments({ userId: u })).toBe(0);
    expect(await Category.countDocuments({ userId: u })).toBe(0);
    expect(await Category.countDocuments({ isSystem: true })).toBeGreaterThan(0); // shared ones stay
  });
});
