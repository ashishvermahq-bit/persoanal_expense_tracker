import { describe, it, expect } from "vitest";
import { getBudgetStatus } from "@/lib/services/budgets";

describe("Budget Status", () => {
  it("should return 'ok' when spend is below 80%", () => {
    const status = getBudgetStatus(5000, 10000); // 50%
    expect(status).toBe("ok");
  });

  it("should return 'warning' when spend is 80-100% of budget", () => {
    let status = getBudgetStatus(8000, 10000); // 80%
    expect(status).toBe("warning");

    status = getBudgetStatus(9999, 10000); // 99.99%
    expect(status).toBe("warning");
  });

  it("should return 'over' when spend is 100% or more", () => {
    let status = getBudgetStatus(10000, 10000); // 100%
    expect(status).toBe("over");

    status = getBudgetStatus(15000, 10000); // 150%
    expect(status).toBe("over");
  });

  it("should handle zero budget", () => {
    const status = getBudgetStatus(1, 0);
    expect(status).toBe("over");
  });

  it("should handle zero spend", () => {
    const status = getBudgetStatus(0, 10000);
    expect(status).toBe("ok");
  });
});
