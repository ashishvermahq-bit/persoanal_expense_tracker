import { assertAuthSecret } from "@/lib/auth/session";

/**
 * Configuration checks run once at server start (instrumentation.ts), so a missing
 * or weak secret fails the deploy loudly instead of surfacing later as every
 * session silently failing to verify.
 */
export function validateServerEnv(env: NodeJS.ProcessEnv = process.env): void {
  assertAuthSecret();
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI must be set");
  if (env.NODE_ENV === "production") {
    if (env.CRON_SECRET !== undefined && env.CRON_SECRET !== "" && env.CRON_SECRET.length < 32) {
      throw new Error("CRON_SECRET must be at least 32 characters (or unset to disable /api/cron/*)");
    }
    if (!env.CRON_SECRET) console.warn("[env] CRON_SECRET is not set: /api/cron/* is disabled and recurring entries won't be generated automatically.");
  }
}
