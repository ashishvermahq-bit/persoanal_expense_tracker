import { test as setup } from "@playwright/test";

/**
 * `next dev` compiles each route on first request. Hitting every route once
 * before the real specs run keeps per-test timing predictable on slow machines
 * and stops cold compiles from masquerading as test failures.
 */
const PAGES = ["/login", "/signup", "/dashboard", "/add", "/expenses", "/expenses/new", "/income", "/categories"];
const APIS = ["/api/auth/me", "/api/expenses", "/api/income", "/api/categories", "/api/summary/2026/1"];

setup("warm up dev server routes", async ({ request }) => {
  setup.setTimeout(10 * 60_000);
  // Unauthenticated: pages redirect to /login (still compiles them), APIs 401.
  for (const path of [...PAGES, ...APIS]) {
    await request.get(path, { maxRedirects: 0, failOnStatusCode: false });
  }
  // Compile the auth POST handlers too.
  await request.post("/api/auth/login", { data: { email: "warm@example.com", password: "x" }, failOnStatusCode: false });
  await request.post("/api/auth/signup", { data: {}, failOnStatusCode: false });
  await request.post("/api/auth/logout", { failOnStatusCode: false });
});
