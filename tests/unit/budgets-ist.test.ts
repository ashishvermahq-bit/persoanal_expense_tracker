import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { istMidnight } from "@/lib/dates";
import { seedSystemCategories } from "@/lib/seed/categories";
import { getBudgetForCategory, listBudgetsWithSpend } from "@/lib/services/budgets";
import { Budget } from "@/models/budget";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";

let mongod: MongoMemoryServer;
const userId = new Types.ObjectId();
let food: Types.ObjectId;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedSystemCategories();
  food = (await Category.findOne({ name: "Food & Dining" }).lean())!._id;
  await Budget.create({ userId, categoryId: food, amountPaise: 1000_00, year: null, month: null });
  await Expense.insertMany([
    // 1 Dec 00:30 IST (= 30 Nov 19:00Z): December, not November.
    { userId, categoryId: food, amountPaise: 300_00, date: new Date("2026-11-30T19:00:00Z"), paymentMethod: "upi" },
    // 30 Nov 23:30 IST (= 30 Nov 18:00Z): November.
    { userId, categoryId: food, amountPaise: 200_00, date: new Date("2026-11-30T18:00:00Z"), paymentMethod: "upi" },
    { userId, categoryId: food, amountPaise: 100_00, date: istMidnight(2026, 11, 1), paymentMethod: "upi" },
  ]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("budget spend uses IST month boundaries", () => {
  it("files spend by the IST calendar month", async () => {
    const nov = await listBudgetsWithSpend(userId, 2026, 11);
    const dec = await listBudgetsWithSpend(userId, 2026, 12);
    expect(nov[0]!.spendPaise).toBe(300_00); // 100 + 200
    expect(dec[0]!.spendPaise).toBe(300_00); // the 00:30 IST entry
  });

  it("single-category lookup agrees", async () => {
    const dec = await getBudgetForCategory(userId, food.toString(), 2026, 12);
    expect(dec?.spendPaise).toBe(300_00);
    expect(dec?.status).toBe("ok");
  });
});
