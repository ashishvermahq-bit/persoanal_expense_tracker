// Starts MongoDB (in-memory unless E2E_MONGODB_URI is set) and then `next dev`
// on the given port. Used as Playwright's webServer command.
import { spawn } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";

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
  NODE_ENV: "development",
};

const next = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "dev", "-p", port], {
  env,
  stdio: "inherit",
  shell: process.platform === "win32",
});

async function shutdown(code = 0) {
  next.kill();
  if (mongod) await mongod.stop();
  process.exit(code);
}

next.on("exit", (code) => void shutdown(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => void shutdown(0));
