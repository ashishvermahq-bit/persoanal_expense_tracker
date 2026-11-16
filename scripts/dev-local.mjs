// `npm run dev:local`: local development without installing MongoDB.
//
// Starts a MongoDB (via mongodb-memory-server) on 127.0.0.1:27017 whose data
// persists in ./.data/mongo, then runs `next dev`. If something is already
// listening on 27017 (a real local MongoDB), it's used as-is.
// The app reads MONGODB_URI / AUTH_SECRET from .env.local as usual.
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { createConnection } from "node:net";
import { createRequire } from "node:module";
import { MongoMemoryServer } from "mongodb-memory-server";

const require = createRequire(import.meta.url);
const PORT = 27017;
const DB_PATH = ".data/mongo";

function portInUse(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("error", () => resolve(false));
  });
}

let mongod = null;
if (await portInUse(PORT)) {
  console.log(`[dev:local] MongoDB already running on :${PORT}, using it.`);
} else {
  mkdirSync(DB_PATH, { recursive: true });
  mongod = await MongoMemoryServer.create({
    instance: { port: PORT, ip: "127.0.0.1", dbPath: DB_PATH, storageEngine: "wiredTiger" },
  });
  console.log(`[dev:local] MongoDB on ${mongod.getUri()} (data in ${DB_PATH})`);
}

const nextBin = require.resolve("next/dist/bin/next");
const next = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], { stdio: "inherit" });

async function shutdown(code = 0) {
  next.kill();
  // doCleanup: false keeps the data directory between runs.
  if (mongod) await mongod.stop({ doCleanup: false });
  process.exit(code);
}
next.on("exit", (code) => void shutdown(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => void shutdown(0));
