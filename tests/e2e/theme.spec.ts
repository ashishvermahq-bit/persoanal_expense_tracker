import { expect, test, type Page } from "@playwright/test";

const password = "Secret123";

async function signupFresh(page: Page) {
  const email = `e2e-theme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/signup");
  const form = page.getByTestId("signup-form");
  await expect(form).toBeVisible();
  await form.getByLabel("Full name").fill("Priya Nair");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByLabel("Confirm password").fill(password);
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

const html = (page: Page) => page.locator("html");

test.describe("theme", () => {
  test("follows the OS by default, before hydration", async ({ browser }) => {
    for (const scheme of ["dark", "light"] as const) {
      const ctx = await browser.newContext({ colorScheme: scheme });
      const page = await ctx.newPage();
      // Boot script runs in <head>, so data-theme is right even with JS hydration pending.
      await page.goto("/login", { waitUntil: "commit" });
      await expect(html(page)).toHaveAttribute("data-theme", scheme);
      await ctx.close();
    }
  });

  test("header toggle switches instantly and survives a reload", async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: "light" });
    const page = await ctx.newPage();
    await signupFresh(page);
    await expect(html(page)).toHaveAttribute("data-theme", "light");

    await page.getByTestId("theme-toggle").click();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");
    // Dark tokens are live: the page plane is the dark charcoal, not black.
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(13, 13, 13)");

    await page.reload();
    await expect(html(page)).toHaveAttribute("data-theme", "dark");

    // "System" on the preferences page hands control back to the OS (light here).
    await page.getByTestId("nav-preferences").click();
    await expect(page).toHaveURL(/\/preferences$/);
    await page.getByTestId("theme-segmented").getByRole("radio", { name: "System" }).click();
    await expect(html(page)).toHaveAttribute("data-theme", "light");
    await expect(page.getByTestId("theme-segmented").getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
    await ctx.close();
  });

  test("reduced motion collapses animations", async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto("/login");
    const duration = await page.locator("form").first().evaluate((el) => {
      const card = el.closest(".animate-slide-up") ?? el;
      return getComputedStyle(card).animationDuration;
    });
    expect(parseFloat(duration)).toBeLessThan(0.01);
    await ctx.close();
  });
});

test("budgets: set a limit, see the warning state, then delete it", async ({ page }) => {
  await signupFresh(page);

  // Spend ₹850 on food.
  await page.goto("/add");
  const quick = page.getByTestId("quick-add-form");
  await quick.getByTestId("amount").fill("850");
  await quick.getByRole("button", { name: "Food & Dining" }).click();
  await quick.getByTestId("save-expense").click();
  await expect(page.getByText("₹850 · Food & Dining")).toBeVisible();

  // ₹1,000 limit → 85% → warning, labelled in text (not colour alone).
  await page.goto("/budgets");
  await page.getByTestId("new-budget").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Category").selectOption({ label: "Food & Dining" });
  await dialog.getByTestId("budget-amount").fill("1000");
  await dialog.getByTestId("save-budget").click();

  const meter = page.getByTestId("budget-meter");
  await expect(meter).toHaveCount(1);
  await expect(meter).toHaveAttribute("data-status", "warning");
  await expect(meter.getByText("85% used")).toBeVisible();
  await expect(meter.getByRole("meter")).toHaveAttribute("aria-valuenow", "85");

  // Dashboard shows the same meter.
  await page.goto("/dashboard");
  await expect(page.getByTestId("budget-meter")).toHaveAttribute("data-status", "warning");

  // Delete (exercises /api/budgets/[id], which previously crashed on load).
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Delete Food & Dining budget" }).click();
  await page.getByTestId("confirm").click();
  await expect(page.getByText("Budget deleted")).toBeVisible();
  await expect(page.getByTestId("budget-meter")).toHaveCount(0);
});
