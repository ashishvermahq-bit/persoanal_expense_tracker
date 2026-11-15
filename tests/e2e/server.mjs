// Starts MongoDB (in-memory unless E2E_MONGODB_URI is set) and then `next dev`
// on the given port. Used as Playwright's webServer command.
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

const env = {
  ...process.env,
  MONGODB_URI: uri,
  AUTH_SECRET: process.env.AUTH_SECRET ?? "e2e-only-secret-not-for-production-0123456789abcdef",
  NEXT_DIST_DIR: ".next-e2e",
  NODE_ENV: "development",
};

// Spawn Next's bin directly with node: no shell, works on Windows and POSIX.
const nextBin = require.resolve("next/dist/bin/next");
const next = spawn(process.execPath, [nextBin, "dev", "-p", port], { env, stdio: "inherit" });

async function shutdown(code = 0) {
  next.kill();
  if (mongod) await mongod.stop();
  process.exit(code);
}

next.on("exit", (code) => void shutdown(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => void shutdown(0));
