import { expect, test, type Page } from "@playwright/test";

const password = "Secret123";

async function signupFresh(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/signup");
  const form = page.getByTestId("signup-form");
  await expect(form).toBeVisible();
  await form.getByLabel("Full name").fill("Rahul Verma");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByLabel("Confirm password").fill(password);
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("quick-add: amount → category → save, then it shows in the list and dashboard", async ({ page }) => {
  await signupFresh(page);

  await page.goto("/add");
  const form = page.getByTestId("quick-add-form");
  await expect(form).toBeVisible();

  // Three interactions: type amount, tap a category, tap save. UPI is pre-selected.
  await form.getByTestId("amount").fill("450.50");
  await form.getByRole("button", { name: "Food & Dining" }).click();
  await expect(form.getByTestId("pay-upi")).toHaveAttribute("aria-pressed", "true");
  await form.getByTestId("save-expense").click();

  // Toast confirms with Indian formatting, and the form resets for the next one.
  await expect(page.getByText("₹450.50 · Food & Dining")).toBeVisible();
  await expect(form.getByTestId("amount")).toHaveValue("");

  // Second expense in a different category, paid by cash.
  await form.getByTestId("amount").fill("18000");
  await form.getByRole("button", { name: "Rent" }).click();
  await form.getByTestId("pay-cash").click();
  await form.getByTestId("save-expense").click();
  await expect(page.getByText("₹18,000 · Rent")).toBeVisible();

  // List shows both, grouped, with the total in lakh/thousand grouping.
  await page.goto("/expenses");
  const rows = page.getByTestId("expense-row");
  await expect(rows).toHaveCount(2);
  await expect(page.getByTestId("list-summary")).toContainText("₹18,450.50");
  // Rent inherits the HRA tag from its category.
  await expect(rows.filter({ hasText: "Rent" })).toContainText("HRA");

  // Dashboard summary reflects the recompute.
  await page.goto("/dashboard");
  await expect(page.getByTestId("month-spent")).toHaveText("₹18,450.50");
});

test("search, filter, edit and delete an expense", async ({ page }) => {
  await signupFresh(page);

  // Create via the detailed form with merchant + tags.
  await page.goto("/expenses/new");
  const form = page.getByTestId("expense-form");
  await expect(form).toBeVisible();
  await form.getByTestId("amount").fill("299");
  await form.getByTestId("category").selectOption({ label: "Food & Dining" });
  await form.getByLabel("Description").fill("Friday dinner");
  await form.getByLabel("Merchant / payee").fill("Swiggy");
  await form.getByLabel("Tags").fill("Family, weekend");
  await form.getByTestId("save-expense").click();
  await expect(page).toHaveURL(/\/expenses\/[0-9a-f]{24}$/);

  // Another one that should NOT match the search.
  await page.goto("/add");
  await page.getByTestId("amount").fill("120");
  await page.getByRole("button", { name: "Fuel" }).click();
  await page.getByTestId("save-expense").click();
  await expect(page.getByText("₹120 · Fuel")).toBeVisible();

  // Substring search finds Swiggy by a partial, case-insensitive query.
  await page.goto("/expenses?q=swig");
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
  await expect(page.getByTestId("expense-row")).toContainText("Friday dinner");

  // Payment filter via URL.
  await page.goto("/expenses?paymentMethod=cash");
  await expect(page.getByText("No expenses match")).toBeVisible();

  // Edit: change amount, verify list.
  await page.goto("/expenses?q=swiggy");
  await page.getByTestId("expense-row").click();
  await expect(page.getByTestId("expense-form")).toBeVisible();
  await page.getByTestId("amount").fill("349");
  await page.getByTestId("save-expense").click();
  await expect(page).toHaveURL(/\/expenses$/);
  await expect(page.getByTestId("list-summary")).toContainText("₹469");

  // Delete with confirmation.
  await page.getByTestId("expense-row").filter({ hasText: "Friday dinner" }).click();
  await page.getByTestId("delete-expense").click();
  await page.getByTestId("confirm").click();
  await expect(page).toHaveURL(/\/expenses$/);
  await expect(page.getByTestId("expense-row")).toHaveCount(1);
  await expect(page.getByTestId("list-summary")).toContainText("₹120");
});

test("income and custom categories", async ({ page }) => {
  await signupFresh(page);

  await page.goto("/income");
  const incomeForm = page.getByTestId("income-form");
  await incomeForm.getByTestId("income-amount").fill("60,000");
  await incomeForm.getByTestId("save-income").click();
  await expect(page.getByTestId("income-row")).toHaveCount(1);
  await expect(page.getByTestId("income-row")).toContainText("+₹60,000");

  await page.goto("/categories");
  await page.getByTestId("new-category").click();
  await page.getByTestId("category-name").fill("Society maintenance");
  await page.getByTestId("save-category").click();
  await expect(page.getByTestId("category-item").filter({ hasText: "Society maintenance" })).toBeVisible();

  // Duplicate (case-insensitive, against a system name) is rejected inline.
  await page.getByTestId("new-category").click();
  await page.getByTestId("category-name").fill("rent");
  await page.getByTestId("save-category").click();
  await expect(page.getByText("Already exists")).toBeVisible();
});
