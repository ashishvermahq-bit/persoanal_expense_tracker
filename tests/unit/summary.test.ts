import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { istMidnight } from "@/lib/dates";
import { seedSystemCategories } from "@/lib/seed/categories";
import { getOrComputeSummary, recomputeForDates, recomputeMonthlySummary } from "@/lib/summary/recompute";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";
import { Income } from "@/models/income";
import { MonthlySummary } from "@/models/monthly-summary";

let mongod: MongoMemoryServer;
const userId = new Types.ObjectId();
const otherUser = new Types.ObjectId();
let food: Types.ObjectId;
let rent: Types.ObjectId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedSystemCategories();
  food = (await Category.findOne({ name: "Food & Dining" }).lean())!._id;
  rent = (await Category.findOne({ name: "Rent" }).lean())!._id;

  await Expense.insertMany([
    // Nov 2026
    { userId, categoryId: food, amountPaise: 450_00, date: istMidnight(2026, 11, 3), paymentMethod: "upi", upiApp: "gpay" },
    { userId, categoryId: food, amountPaise: 250_00, date: istMidnight(2026, 11, 3), paymentMethod: "cash" },
    { userId, categoryId: rent, amountPaise: 18000_00, date: istMidnight(2026, 11, 1), paymentMethod: "net_banking", taxSection: "HRA" },
    // 30 Nov 23:30 IST is still November even though it's 1 Dec in UTC terms? (18:00Z on 30 Nov) — yes, Nov.
    { userId, categoryId: food, amountPaise: 100_00, date: new Date("2026-11-30T18:00:00Z"), paymentMethod: "upi" },
    // 1 Dec 00:30 IST = 30 Nov 19:00Z -> must land in December
    { userId, categoryId: food, amountPaise: 999_00, date: new Date("2026-11-30T19:00:00Z"), paymentMethod: "upi" },
    // soft-deleted, must be ignored
    { userId, categoryId: food, amountPaise: 5000_00, date: istMidnight(2026, 11, 10), deletedAt: new Date() },
    // another user's data, must be ignored
    { userId: otherUser, categoryId: food, amountPaise: 7777_00, date: istMidnight(2026, 11, 10) },
    // Oct 2026 for the delta
    { userId, categoryId: rent, amountPaise: 18000_00, date: istMidnight(2026, 10, 1), paymentMethod: "net_banking", taxSection: "HRA" },
    { userId, categoryId: food, amountPaise: 2000_00, date: istMidnight(2026, 10, 15) },
  ]);
  await Income.create({ userId, source: "salary", amountPaise: 60000_00, date: istMidnight(2026, 11, 1) });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("recomputeMonthlySummary", () => {
  it("aggregates totals, breakdowns and IST daily buckets for one month", async () => {
    await recomputeMonthlySummary(userId, { year: 2026, month: 10 });
    const s = await recomputeMonthlySummary(userId, { year: 2026, month: 11 });

    expect(s.totalExpensePaise).toBe(450_00 + 250_00 + 18000_00 + 100_00);
    expect(s.expenseCount).toBe(4);
    expect(s.largestExpensePaise).toBe(18000_00);
    expect(s.averageExpensePaise).toBe(Math.round(18800_00 / 4));
    expect(s.totalIncomePaise).toBe(60000_00);
    expect(s.savingsPaise).toBe(60000_00 - 18800_00);
    expect(s.savingsRate).toBeCloseTo((60000_00 - 18800_00) / 60000_00, 4);

    const byCat = Object.fromEntries(s.byCategory.map((c) => [c.name, c.totalPaise]));
    expect(byCat).toEqual({ Rent: 18000_00, "Food & Dining": 800_00 });
    expect(s.byCategory[0].name).toBe("Rent"); // sorted desc

    const byPm = Object.fromEntries(s.byPaymentMethod.map((p) => [p.paymentMethod, p.totalPaise]));
    expect(byPm).toEqual({ net_banking: 18000_00, upi: 550_00, cash: 250_00 });

    expect(s.byTaxSection).toEqual([{ taxSection: "HRA", totalPaise: 18000_00, count: 1 }]);

    expect(s.dailyTotalsPaise).toHaveLength(31);
    expect(s.dailyTotalsPaise[0]).toBe(18000_00); // 1 Nov
    expect(s.dailyTotalsPaise[2]).toBe(700_00); // 3 Nov
    expect(s.dailyTotalsPaise[29]).toBe(100_00); // 30 Nov 23:30 IST
    expect(s.dailyTotalsPaise[30]).toBe(0);

    // Oct was 20000; Nov is 18800 → -6%
    expect(s.changeFromPreviousMonth).toBeCloseTo(-0.06, 4);
  });

  it("puts the 00:30 IST expense into December", async () => {
    const dec = await recomputeMonthlySummary(userId, { year: 2026, month: 12 });
    expect(dec.totalExpensePaise).toBe(999_00);
    expect(dec.dailyTotalsPaise[0]).toBe(999_00);
    expect(dec.totalIncomePaise).toBe(0);
    expect(dec.savingsRate).toBeNull();
    // Delta vs Nov (18800)
    expect(dec.changeFromPreviousMonth).toBeCloseTo((999_00 - 18800_00) / 18800_00, 4);
  });

  it("refreshes the next month's delta when a month changes", async () => {
    await Expense.create({ userId, categoryId: food, amountPaise: 1200_00, date: istMidnight(2026, 11, 20) });
    await recomputeForDates(userId, [istMidnight(2026, 11, 20)]);
    const nov = await MonthlySummary.findOne({ userId, year: 2026, month: 11 }).lean();
    const dec = await MonthlySummary.findOne({ userId, year: 2026, month: 12 }).lean();
    expect(nov!.totalExpensePaise).toBe(20000_00);
    expect(dec!.changeFromPreviousMonth).toBeCloseTo((999_00 - 20000_00) / 20000_00, 4);
  });

  it("getOrComputeSummary computes on first access and is user-scoped", async () => {
    const s = await getOrComputeSummary(otherUser, { year: 2026, month: 11 });
    expect(s.totalExpensePaise).toBe(7777_00);
    expect(s.expenseCount).toBe(1);
    const empty = await getOrComputeSummary(otherUser, { year: 2025, month: 1 });
    expect(empty.totalExpensePaise).toBe(0);
    expect(empty.changeFromPreviousMonth).toBeNull();
  });
});
