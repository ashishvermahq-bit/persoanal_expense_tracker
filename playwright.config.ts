import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  // Runs against `next dev`: Turbopack compiles each route on first hit and
  // bcrypt runs at full cost, so a single signup→dashboard hop can take 15s+
  // on a slow machine. The "setup" project warms every route first; generous
  // timeouts keep the suite deterministic.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Boots an in-memory MongoDB and then `next dev` with the right env, so the
    // suite is self-contained. Set E2E_MONGODB_URI to use a real database instead.
    command: `node tests/e2e/server.mjs ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
