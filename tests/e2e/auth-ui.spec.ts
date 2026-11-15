import { expect, test } from "@playwright/test";

test.describe("auth screens", () => {
  test("signup: one toggle reveals both passwords; checklist tracks the rules", async ({ page }) => {
    await page.goto("/signup");
    const form = page.getByTestId("signup-form");
    await expect(form).toBeVisible();
    const pw = form.getByLabel("Password", { exact: true });
    const confirm = form.getByLabel("Confirm password");
    const toggle = form.getByRole("button", { name: "Show password" });

    await expect(pw).toHaveAttribute("type", "password");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(pw).toHaveAttribute("type", "text");
    await expect(confirm).toHaveAttribute("type", "text");

    const needs = form.getByRole("list", { name: "Password needs" });
    await expect(needs).toContainText("8+ characters (needed)");
    await pw.fill("paisa2026");
    await expect(needs).toContainText("8+ characters (done)");
    await expect(needs).toContainText("a number (done)");
  });

  test("login: a failed sign-in keeps what was typed", async ({ page }) => {
    await page.goto("/login");
    const form = page.getByTestId("login-form");
    await expect(form).toBeVisible();
    await form.getByLabel("Email").fill("nobody@example.com");
    await form.getByLabel("Password", { exact: true }).fill("Wrong999x");
    await form.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("form-error")).toHaveText("Incorrect email or password");
    await expect(form.getByLabel("Email")).toHaveValue("nobody@example.com");
    await expect(form.getByLabel("Password", { exact: true })).toHaveValue("Wrong999x");
  });

  test("desktop: brand panel's sample ledger is labelled as an example; email is focused", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");
    await expect(page.getByRole("img", { name: /^Example only, not your data/ })).toBeVisible();
    await expect(page.getByTestId("login-form").getByLabel("Email")).toBeFocused();
  });

  test("phone: no brand panel, no autofocus, form above the fold", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto("/signup");
    await expect(page.getByTestId("signup-form")).toBeVisible();
    await expect(page.getByRole("img", { name: /^Example only/ })).toBeHidden();
    await expect(page.getByTestId("signup-form").getByLabel("Full name")).not.toBeFocused();
    const box = await page.getByRole("button", { name: "Create account" }).boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    await ctx.close();
  });
});
