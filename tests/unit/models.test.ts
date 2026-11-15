import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Budget } from "@/models/budget";
import { Category } from "@/models/category";
import { Expense } from "@/models/expense";
import { SplitEntry, SplitGroup } from "@/models/split";
import { DEFAULT_CATEGORIES, seedSystemCategories } from "@/lib/seed/categories";

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

describe("category seed", () => {
  it("inserts all defaults once and is idempotent", async () => {
    const first = await seedSystemCategories();
    expect(first.inserted).toBe(DEFAULT_CATEGORIES.length);
    const second = await seedSystemCategories();
    expect(second.inserted).toBe(0);
    const rent = await Category.findOne({ isSystem: true, name: "Rent" }).lean();
    expect(rent?.defaultTaxSection).toBe("HRA");
  });
  it("rejects a system category with a userId", async () => {
    await expect(
      Category.create({ userId: new Types.ObjectId(), isSystem: true, name: "Bad" })
    ).rejects.toThrow(/System categories/);
  });
});

describe("expense", () => {
  it("stores integer paise only", async () => {
    const userId = new Types.ObjectId();
    const cat = await Category.findOne({ isSystem: true }).lean();
    const ok = await Expense.create({
      userId,
      categoryId: cat!._id,
      amountPaise: 45050,
      date: new Date(),
    });
    expect(ok.amountPaise).toBe(45050);
    expect(ok.paymentMethod).toBe("upi");
    expect(ok.currency).toBe("INR");
    await expect(
      Expense.create({ userId, categoryId: cat!._id, amountPaise: 450.5, date: new Date() })
    ).rejects.toThrow(/integer/);
    await expect(
      Expense.create({ userId, categoryId: cat!._id, amountPaise: 0, date: new Date() })
    ).rejects.toThrow(/at least 1 paisa/);
  });
});

describe("budget", () => {
  it("requires year/month to be both set or both null", async () => {
    const base = { userId: new Types.ObjectId(), categoryId: new Types.ObjectId(), amountPaise: 1000_00 };
    await expect(Budget.create({ ...base, year: 2026, month: null })).rejects.toThrow(/both/);
    const def = await Budget.create({ ...base });
    expect(def.year).toBeNull();
  });
});

describe("split entry", () => {
  it("enforces shares summing to the amount", async () => {
    const userId = new Types.ObjectId();
    const group = await SplitGroup.create({
      userId,
      name: "Flat 302",
      participants: [{ name: "Me", isOwner: true }, { name: "Rahul" }, { name: "Priya" }],
    });
    const [me, rahul, priya] = group.participants;
    await expect(
      SplitEntry.create({
        userId,
        groupId: group._id,
        description: "Wifi",
        amountPaise: 1000_00,
        paidBy: me._id,
        date: new Date(),
        shares: [
          { participantId: me._id, amountPaise: 333_33 },
          { participantId: rahul._id, amountPaise: 333_33 },
          { participantId: priya._id, amountPaise: 333_33 },
        ],
      })
    ).rejects.toThrow(/Shares total/);
    const okEntry = await SplitEntry.create({
      userId,
      groupId: group._id,
      description: "Wifi",
      amountPaise: 1000_00,
      paidBy: me._id,
      date: new Date(),
      shares: [
        { participantId: me._id, amountPaise: 333_34 },
        { participantId: rahul._id, amountPaise: 333_33 },
        { participantId: priya._id, amountPaise: 333_33 },
      ],
    });
    expect(okEntry.shares).toHaveLength(3);
  });
});
