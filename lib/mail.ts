import "server-only";
import { redactText } from "@/lib/log";

/**
 * Outgoing email. No provider is wired up yet (adding one is a deployment decision:
 * see README "Email"). Until then:
 * - development/test: the message is printed to the server console, so the reset
 *   flow can be exercised locally;
 * - production: nothing is sent and a warning is logged (without the link).
 * `emailConfigured()` lets the UI say so honestly instead of promising an email.
 */
export function emailConfigured(): boolean {
  return process.env.NODE_ENV !== "production";
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.info(`[mail:dev] password reset for ${redactText(to)}: ${link}`);
    return;
  }
  console.warn("[mail] password reset requested but no email provider is configured");
}

/**
 * Base URL for links in emails. Production requires APP_URL: deriving it from the
 * request's Host header would let an attacker point reset links at their own site.
 */
export function appUrl(request: Request): string {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") throw new Error("APP_URL must be set in production");
  return new URL(request.url).origin;
}
