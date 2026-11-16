// `npm run test:e2e:prod`: the e2e suite against a production build (see server.mjs).
// A launcher rather than `E2E_MODE=prod playwright test`, which doesn't work in npm scripts on Windows.
import { spawnSync } from "node:child_process";

const result = spawnSync("npx", ["playwright", "test", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: true,
  env: { ...process.env, E2E_MODE: "prod" },
});
process.exit(result.status ?? 1);
