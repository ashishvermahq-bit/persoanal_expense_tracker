import { describe, expect, it } from "vitest";
import { createExpenseSchema, expenseFiltersSchema, updateExpenseSchema } from "@/lib/validation/expense";
import { createIncomeSchema } from "@/lib/validation/income";

const cat = "64b7f0c2e1a2b3c4d5e6f789";

describe("createExpenseSchema", () => {
  it("accepts a human-typed rupee amount and normalises to paise", () => {
    const r = createExpenseSchema.safeParse({ amount: "1,250.50", categoryId: cat, date: "2026-11-15", tags: "Food, SWIGGY ,food" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.amountPaise).toBe(125050);
      expect(r.data.paymentMethod).toBe("upi");
      expect(r.data.taxSection).toBe("none");
      expect(r.data.tags).toEqual(["food", "swiggy"]);
      expect(r.data.date.toISOString()).toBe("2026-11-14T18:30:00.000Z");
    }
  });
  it("accepts integer paise directly", () => {
    const r = createExpenseSchema.safeParse({ amountPaise: 45000, categoryId: cat, date: "2026-11-15" });
    expect(r.success && r.data.amountPaise).toBe(45000);
  });
  it("clears upiApp when payment is not UPI", () => {
    const r = createExpenseSchema.safeParse({ amount: 10, categoryId: cat, date: "2026-11-15", paymentMethod: "cash", upiApp: "gpay" });
    expect(r.success && r.data.upiApp).toBeNull();
  });
  it("rejects zero, garbage, fractional paise and missing amount", () => {
    for (const bad of [{ amount: "0" }, { amount: "abc" }, { amountPaise: 10.5 }, {}]) {
      const r = createExpenseSchema.safeParse({ ...bad, categoryId: cat, date: "2026-11-15" });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues.some((i) => i.path[0] === "amount" || i.path[0] === "amountPaise")).toBe(true);
    }
  });
  it("rejects bad ids and dates", () => {
    expect(createExpenseSchema.safeParse({ amount: 10, categoryId: "nope", date: "2026-11-15" }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ amount: 10, categoryId: cat, date: "2026-02-30" }).success).toBe(false);
  });
});

describe("updateExpenseSchema", () => {
  it("requires at least one field and allows partial updates", () => {
    expect(updateExpenseSchema.safeParse({}).success).toBe(false);
    const r = updateExpenseSchema.safeParse({ amount: "99" });
    expect(r.success && r.data).toEqual({ amountPaise: 9900 });
  });
});

describe("expenseFiltersSchema", () => {
  it("parses query-string style input", () => {
    const r = expenseFiltersSchema.safeParse({
      from: "2026-11-01",
      to: "2026-12-01",
      categoryId: `${cat},${cat}`,
      paymentMethod: "upi,cash",
      minAmount: "100",
      page: "2",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.categoryId).toHaveLength(2);
      expect(r.data.paymentMethod).toEqual(["upi", "cash"]);
      expect(r.data.minAmount).toBe(100);
      expect(r.data.page).toBe(2);
      expect(r.data.pageSize).toBe(25);
      expect(r.data.sort).toBe("date_desc");
    }
  });
  it("caps page size", () => {
    expect(expenseFiltersSchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});

describe("createIncomeSchema", () => {
  it("normalises salary input", () => {
    const r = createIncomeSchema.safeParse({ source: "salary", amount: "₹60,000", date: "2026-11-01" });
    expect(r.success && r.data.amountPaise).toBe(60000_00);
  });
});
