import { z } from "zod";

/**
 * Zod with its JIT disabled. By default Zod v4 probes `new Function` for a faster
 * object parser; our CSP has no 'unsafe-eval', so in the browser that probe raises a
 * CSP violation on every form page (Zod then falls back anyway). Every schema module
 * imports `z` from here so the setting is applied before the first parse.
 */
z.config({ jitless: true });

export { z };
