import { expect, test, type Page } from "@playwright/test";

const password = "Secret123";

function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

// Locators are scoped to the form so a stale form from the previous route
// during a client-side transition can't cause strict-mode collisions.
async function signup(page: Page, email: string, name = "Priya Sharma") {
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

async function login(page: Page, email: string, pw: string) {
  const form = page.getByTestId("login-form");
  await expect(form).toBeVisible();
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(pw);
  await form.getByRole("button", { name: "Sign in" }).click();
}

async function logout(page: Page) {
  await page.getByTestId("logout").click();
  await expect(page).toHaveURL(/\/login$/);
}

test("guest visiting the app is sent to login with a return path", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("signup → dashboard → logout → login round trip", async ({ page }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await expect(page.getByTestId("greeting")).toHaveText("Namaste, Priya");

  // Logged-in users are bounced away from auth pages.
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);

  await logout(page);
  await login(page, email, password);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByTestId("user-name")).toHaveText("Priya Sharma");
});

test("wrong password shows an error and stays on login", async ({ page }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await logout(page);

  await login(page, email, "Wrong999");
  await expect(page.getByTestId("form-error")).toHaveText("Incorrect email or password");
  await expect(page).toHaveURL(/\/login$/);
});

test("duplicate email and weak password are rejected", async ({ page }) => {
  const email = uniqueEmail();
  await signup(page, email);
  await logout(page);

  await page.goto("/signup");
  const form = page.getByTestId("signup-form");
  await expect(form).toBeVisible();
  await form.getByLabel("Full name").fill("Dup User");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill("short");
  await form.getByLabel("Confirm password").fill("short");
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(form.getByText("Password must be at least 8 characters")).toBeVisible();

  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByLabel("Confirm password").fill(password);
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(form.getByText("An account with this email already exists")).toBeVisible();
  await expect(page).toHaveURL(/\/signup$/);
});

test("protected API returns 401 JSON for guests", async ({ request }) => {
  const res = await request.get("/api/auth/me");
  expect(res.status()).toBe(401);
  const body = await res.json();
  expect(body.error.code).toBe("UNAUTHORIZED");
});
