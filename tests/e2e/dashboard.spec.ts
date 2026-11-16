import { expect, test, type Page } from "@playwright/test";

const password = "Secret123";

async function signupFresh(page: Page, name = "Meera Iyer") {
  const email = `e2e-dash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/signup");
  const form = page.getByTestId("signup-form");
  await expect(form).toBeVisible();
  await form.getByLabel("Full name").fill(name);
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByLabel("Confirm password").fill(password);
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

/** Seed through the real API (same cookies as the page). */
async function seed(page: Page) {
  const cats = (await (await page.request.get("/api/categories")).json()).data as { id: string; name: string }[];
  const id = (name: string) => cats.find((c) => c.name === name)!.id;
  const today = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
  const post = (path: string, data: object) => page.request.post(path, { data }).then((r) => expect(r.ok()).toBeTruthy());
  await post("/api/expenses", { amountPaise: 18_000_00, categoryId: id("Rent"), date: today, paymentMethod: "net_banking" });
  await post("/api/expenses", { amountPaise: 850_00, categoryId: id("Food & Dining"), date: today, paymentMethod: "upi" });
  await post("/api/budgets", { categoryId: id("Food & Dining"), amountPaise: 1_000_00, year: null, month: null });
  return { rentId: id("Rent") };
}

test("dashboard: hero answers spent / on track / attention, chips deep-link", async ({ page }) => {
  await signupFresh(page);
  // Brand-new: friendly empty state, not a page of zeros.
  await expect(page.getByText("Your month starts here")).toBeVisible();

  const { rentId } = await seed(page);
  await page.reload();

  await expect(page.getByTestId("month-spent")).toHaveText("₹18,850");
  // ₹1,000 budget − ₹850 spent = ₹150 left, spread over the days left.
  await expect(page.getByTestId("safe-to-spend")).toContainText("a day is safe to spend");
  await expect(page.getByTestId("safe-to-spend")).toContainText("₹150 left in budgets");

  const chips = page.getByTestId("insight-chip");
  await expect(chips.filter({ hasText: "1 budget near limit" })).toBeVisible();
  await expect(chips.filter({ hasText: "Biggest: ₹18,000 Rent" })).toBeVisible();
  await expect(chips.filter({ hasText: "Rent paid" })).toBeVisible();

  // Budget glance shows the near-limit one with its label (not colour alone).
  await expect(page.getByTestId("budget-meter")).toHaveAttribute("data-status", "warning");
  await expect(page.getByTestId("budget-meter").getByText("85% used")).toBeVisible();

  // Recent activity lists today's expenses.
  await expect(page.getByTestId("expense-row")).toHaveCount(2);

  // Chips are links into the filtered list.
  await chips.filter({ hasText: "Biggest" }).click();
  await expect(page).toHaveURL(new RegExp(`/expenses\\?from=\\d{4}-\\d{2}-01&to=\\d{4}-\\d{2}-\\d{2}&categoryId=${rentId}$`));
  // Client-side navigation: Next keeps the dashboard alive (hidden) in <Activity>,
  // so count only the rows on screen.
  await expect(page.getByTestId("expense-row").filter({ visible: true })).toHaveCount(1);
  await expect(page.getByTestId("list-summary").filter({ visible: true })).toContainText("₹18,000");
});

test("trends are collapsed until asked for, one chart at a time with a table twin", async ({ page }) => {
  await signupFresh(page);
  await seed(page);
  await page.reload();

  const toggle = page.getByTestId("trends-toggle");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("trends-period")).toHaveCount(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByTestId("trends-period").getByRole("radio", { name: "FY" }).click();
  await expect(page.getByRole("img", { name: /^Spending per month, FY/ })).toBeVisible();
  await page.getByText("Show as table").click();
  await expect(page.getByRole("table")).toContainText("₹18,850");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("FAB opens quick add as a sheet; saving updates the hero in place", async ({ page }) => {
    await signupFresh(page);
    await seed(page);
    await page.reload();
    await expect(page.getByTestId("month-spent")).toHaveText("₹18,850");

    // Before hydration the FAB is a plain link to /add (by design); wait until it opens the sheet.
    await expect(page.getByTestId("nav-add")).toHaveAttribute("data-sheet", "ready");
    await page.getByTestId("nav-add").click();
    const sheet = page.getByTestId("quick-add-sheet");
    await expect(sheet).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard$/); // no navigation

    await sheet.getByTestId("amount").fill("150");
    await sheet.getByRole("button", { name: "Food & Dining" }).click();
    await sheet.getByTestId("save-expense").click();
    await expect(page.getByTestId("quick-add-success")).toBeVisible();

    await expect(sheet).toBeHidden();
    await expect(page.getByTestId("month-spent")).toHaveText("₹19,000");
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});

test("expense list: delete without a dialog, then undo within 5s", async ({ page }) => {
  await signupFresh(page);
  await seed(page);
  await page.goto("/expenses");
  await expect(page.getByTestId("expense-row")).toHaveCount(2);
  await expect(page.getByTestId("list-summary")).toContainText("₹18,850");

  // Keyboard path: focusing Delete slides the row open; Enter deletes.
  const del = page.getByRole("button", { name: "Delete Food & Dining" });
  await del.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
  await expect(page.getByTestId("list-summary")).toContainText("₹18,000");

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Expense restored")).toBeVisible();
  await expect(page.getByTestId("expense-row")).toHaveCount(2);
  await expect(page.getByTestId("list-summary")).toContainText("₹18,850");
});
