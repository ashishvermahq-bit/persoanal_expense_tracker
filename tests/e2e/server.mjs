// Starts MongoDB (in-memory unless E2E_MONGODB_URI is set) and then Next on the
// given port. Used as Playwright's webServer command.
//
// E2E_MODE=prod builds once and serves with `next start`: no on-demand route
// compiles mid-test, so timings are stable (slow machines / CI). Default: `next dev`.
//
// It uses its own distDir (.next-e2e) so it can run alongside a developer's
// `npm run dev`, which holds a lock on .next.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";

const require = createRequire(import.meta.url);
const port = process.argv[2] ?? "3100";
let mongod = null;
let uri = process.env.E2E_MONGODB_URI;

if (!uri) {
  mongod = await MongoMemoryServer.create();
  uri = mongod.getUri("expense_tracker_e2e");
}

const prod = process.env.E2E_MODE === "prod";

const env = {
  ...process.env,
  MONGODB_URI: uri,
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-secret-not-for-production-0123456789abcdef",
  NEXT_DIST_DIR: prod ? ".next-e2e-prod" : ".next-e2e",
  // Every spec signs up from 127.0.0.1; the production limit (10/15 min) would trip mid-suite.
  AUTH_RATE_LIMIT_MAX: "1000",
  APP_URL: `http://localhost:${port}`,
  NODE_ENV: prod ? "production" : "development",
};

// Spawn Next's bin directly with node: no shell, works on Windows and POSIX.
const nextBin = require.resolve("next/dist/bin/next");
if (prod) {
  const build = spawn(process.execPath, [nextBin, "build"], { env, stdio: "inherit" });
  const code = await new Promise((resolve) => build.on("exit", resolve));
  if (code !== 0) {
    if (mongod) await mongod.stop();
    process.exit(code ?? 1);
  }
}
const next = spawn(process.execPath, [nextBin, prod ? "start" : "dev", "-p", port], { env, stdio: "inherit" });

async function shutdown(code = 0) {
  next.kill();
  if (mongod) await mongod.stop();
  process.exit(code);
}

next.on("exit", (code) => void shutdown(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => void shutdown(0));
