import { expect, test, type APIRequestContext, type PlaywrightWorkerArgs } from "@playwright/test";

const password = "Secret123";
const uniqueEmail = () => `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

/** A signed-in API client (its own cookie jar). Same-origin header, like the browser sends. */
async function signedIn(playwright: PlaywrightWorkerArgs["playwright"], baseURL: string, email = uniqueEmail()) {
  const ctx = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL } });
  const res = await ctx.post("/api/auth/signup", { data: { name: "Sec Tester", email, password, confirmPassword: password } });
  expect(res.status()).toBe(201);
  return { ctx, email };
}

async function firstExpenseCategory(ctx: APIRequestContext): Promise<string> {
  const res = await ctx.get("/api/categories?kind=expense");
  return (await res.json()).data[0].id;
}

test("security headers are set on pages", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["content-security-policy"]).toContain("object-src 'none'");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["permissions-policy"]).toContain("camera=()");
  expect(h["x-powered-by"]).toBeUndefined();
  if (process.env.E2E_MODE === "prod") expect(h["content-security-policy"]).not.toContain("unsafe-eval");
});

test("signed out: PWA files, legal pages and the health probe are reachable", async ({ request }) => {
  for (const path of ["/manifest.json", "/sw.js", "/icon-192.png", "/icon.svg", "/privacy", "/terms", "/forgot-password"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(200);
  }
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
});

test("cron route requires the secret", async ({ request }) => {
  const res = await request.get("/api/cron/recurring");
  // 404 when CRON_SECRET isn't configured (the e2e server), 401 when it is: never 200 without it.
  expect([401, 404]).toContain(res.status());
});

test("cross-site writes are refused (CSRF), same-origin ones work", async ({ request, baseURL }) => {
  const evil = await request.post("/api/auth/login", { headers: { origin: "https://evil.example" }, data: { email: "a@b.co", password: "x" } });
  expect(evil.status()).toBe(403);
  const same = await request.post("/api/auth/login", { headers: { origin: baseURL! }, data: { email: "nobody@example.com", password: "Wrong999x" } });
  expect(same.status()).toBe(401);
});

test("session cookie flags", async ({ page }) => {
  const email = uniqueEmail();
  await page.goto("/signup");
  const form = page.getByTestId("signup-form");
  await form.getByLabel("Full name").fill("Cookie Check");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill(password);
  await form.getByLabel("Confirm password").fill(password);
  await form.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const cookie = (await page.context().cookies()).find((c) => c.name === "session")!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Lax");
  expect(cookie.path).toBe("/");
});

test("IDOR: another user's expense can't be read, edited or deleted", async ({ playwright, baseURL }) => {
  const alice = await signedIn(playwright, baseURL!);
  const bob = await signedIn(playwright, baseURL!);
  const created = await alice.ctx.post("/api/expenses", {
    data: { amount: "450", categoryId: await firstExpenseCategory(alice.ctx), date: "2026-11-02", paymentMethod: "upi", description: "Alice only" },
  });
  expect(created.status()).toBe(201);
  const id = (await created.json()).data.id;

  expect((await bob.ctx.get(`/api/expenses/${id}`)).status()).toBe(404);
  expect((await bob.ctx.patch(`/api/expenses/${id}`, { data: { amount: "1" } })).status()).toBe(404);
  expect((await bob.ctx.delete(`/api/expenses/${id}`)).status()).toBe(404);
  const list = await (await bob.ctx.get("/api/expenses")).json();
  expect(list.data.items.map((e: { id: string }) => e.id)).not.toContain(id);

  // Operator injection in a body is a validation error, not a query.
  const inj = await bob.ctx.post("/api/expenses", { data: { amount: "1", categoryId: { $ne: null }, date: "2026-11-02" } });
  expect(inj.status()).toBe(400);

  expect((await alice.ctx.get(`/api/expenses/${id}`)).status()).toBe(200);
  await Promise.all([alice.ctx.dispose(), bob.ctx.dispose()]);
});

test("changing the password signs out other sessions, keeps this one", async ({ playwright, baseURL }) => {
  const a = await signedIn(playwright, baseURL!);
  const other = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL! } });
  expect((await other.post("/api/auth/login", { data: { email: a.email, password } })).status()).toBe(200);
  expect((await other.get("/api/auth/me")).status()).toBe(200);

  const changed = await a.ctx.post("/api/account/password", { data: { currentPassword: password, newPassword: "Changed456", confirmPassword: "Changed456" } });
  expect(changed.status()).toBe(200);
  expect((await a.ctx.get("/api/auth/me")).status()).toBe(200);
  expect((await other.get("/api/auth/me")).status()).toBe(401);
  await Promise.all([a.ctx.dispose(), other.dispose()]);
});

test("forgot password answers the same for known and unknown emails", async ({ playwright, baseURL }) => {
  const a = await signedIn(playwright, baseURL!);
  const known = await a.ctx.post("/api/auth/forgot", { data: { email: a.email } });
  const unknown = await a.ctx.post("/api/auth/forgot", { data: { email: uniqueEmail() } });
  expect(known.status()).toBe(200);
  expect(unknown.status()).toBe(200);
  expect(await known.json()).toEqual(await unknown.json());
  await a.ctx.dispose();
});

test("account export, then deletion ends the session", async ({ playwright, baseURL }) => {
  const a = await signedIn(playwright, baseURL!);
  const json = await a.ctx.get("/api/account/export?format=json");
  expect(json.status()).toBe(200);
  expect(json.headers()["content-disposition"]).toContain("attachment");
  expect((await json.json()).account.email).toBe(a.email);

  expect((await a.ctx.delete("/api/account", { data: { password, confirm: "nope" } })).status()).toBe(400);
  expect((await a.ctx.delete("/api/account", { data: { password, confirm: "DELETE" } })).status()).toBe(200);
  expect((await a.ctx.get("/api/auth/me")).status()).toBe(401);
  const relogin = await a.ctx.post("/api/auth/login", { data: { email: a.email, password } });
  expect(relogin.status()).toBe(401);
  await a.ctx.dispose();
});

test("a revoked session lands on sign-in with a notice (no redirect loop)", async ({ page, playwright, baseURL }) => {
  const email = uniqueEmail();
  const signup = await page.request.post("/api/auth/signup", { headers: { origin: baseURL! }, data: { name: "Revoked Tab", email, password, confirmPassword: password } });
  expect(signup.status()).toBe(201);
  await page.goto("/dashboard");
  await expect(page.getByTestId("greeting")).toBeVisible();

  // Password changed on another device.
  const other = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { origin: baseURL! } });
  expect((await other.post("/api/auth/login", { data: { email, password } })).status()).toBe(200);
  expect((await other.post("/api/account/password", { data: { currentPassword: password, newPassword: "Rotated789", confirmPassword: "Rotated789" } })).status()).toBe(200);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?reauth=1/);
  await expect(page.getByRole("status").filter({ hasText: "Your session ended" })).toBeVisible();
  // The stale cookie was dropped, so the old password page stays put and the new one works.
  const form = page.getByTestId("login-form");
  await form.getByLabel("Email").fill(email);
  await form.getByLabel("Password", { exact: true }).fill("Rotated789");
  await form.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await other.dispose();
});
