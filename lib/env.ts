import { assertAuthSecret } from "@/lib/auth/session";

/**
 * Configuration checks run once at server start (instrumentation.ts), so a missing
 * or weak secret fails the deploy loudly instead of surfacing later as every
 * session silently failing to verify.
 */
export function validateServerEnv(env: NodeJS.ProcessEnv = process.env): void {
  assertAuthSecret();
  if (!env.MONGODB_URI) throw new Error("MONGODB_URI must be set");

  // Email (Resend): both or neither; a sender must look like `Name <addr@domain>` or `addr@domain`.
  const key = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  if (Boolean(key) !== Boolean(from)) throw new Error("Set both RESEND_API_KEY and EMAIL_FROM (or neither)");
  if (from && !/^([^<>]+<)?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/.test(from)) throw new Error("EMAIL_FROM must be an address, e.g. Paisa <no-reply@example.com>");
  if (key && !key.startsWith("re_")) throw new Error("RESEND_API_KEY doesn't look like a Resend key (re_…)");
  if (env.NODE_ENV === "production") {
    if (env.CRON_SECRET !== undefined && env.CRON_SECRET !== "" && env.CRON_SECRET.length < 32) {
      throw new Error("CRON_SECRET must be at least 32 characters (or unset to disable /api/cron/*)");
    }
    // Reset links are built from APP_URL, never the request's Host header.
    if (key && !/^https:\/\/[^/]+/.test(env.APP_URL ?? "")) throw new Error("APP_URL must be the site's https:// URL when email is enabled");
    if (!key) console.warn("[env] RESEND_API_KEY/EMAIL_FROM not set: password reset emails are disabled.");
    if (!env.CRON_SECRET) console.warn("[env] CRON_SECRET is not set: /api/cron/* is disabled and recurring entries won't be generated automatically.");
  }
}
