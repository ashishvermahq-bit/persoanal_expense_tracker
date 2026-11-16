import "server-only";
import { escapeHtml } from "@/lib/csv";
import { redactText } from "@/lib/log";

/**
 * Outgoing email via Resend's HTTP API (plain fetch, no SDK dependency).
 *
 * - RESEND_API_KEY + EMAIL_FROM set: mail is sent through Resend (any environment).
 * - Not set, development/test: the message is printed to the server console so the
 *   reset flow can be exercised locally.
 * - Not set, production: nothing is sent; `/forgot-password` says email isn't set up.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function resendConfig(env: NodeJS.ProcessEnv = process.env): { apiKey: string; from: string } | null {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.EMAIL_FROM?.trim();
  return apiKey && from ? { apiKey, from } : null;
}

/** True when a reset email can actually reach someone (or be read from the dev console). */
export function emailConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return resendConfig(env) !== null || env.NODE_ENV !== "production";
}

/** Throws on failure (callers log it and still answer the user the same way). */
export async function sendMail(mail: Mail, fetchImpl: typeof fetch = fetch): Promise<void> {
  const config = resendConfig();
  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail:dev] to ${redactText(mail.to)}: ${mail.subject}\n${mail.text}`);
      return;
    }
    console.warn("[mail] not sent: RESEND_API_KEY / EMAIL_FROM are not configured");
    return;
  }
  const res = await fetchImpl(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.from, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    // Resend's error body names the problem (bad key, unverified domain); it never echoes the key.
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend responded ${res.status}: ${redactText(detail.slice(0, 300))}`);
  }
}

export function passwordResetMail(to: string, link: string): Mail {
  const text = [
    "Someone (hopefully you) asked to reset the password for your Paisa account.",
    "",
    `Set a new password: ${link}`,
    "",
    "The link works once and expires in 30 minutes. If you didn't ask for this, ignore this email; your password stays the same.",
  ].join("\n");
  const safeLink = escapeHtml(link);
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0b0b0b">
<p>Someone (hopefully you) asked to reset the password for your Paisa account.</p>
<p><a href="${safeLink}" style="display:inline-block;padding:10px 16px;border-radius:8px;background:#2a78d6;color:#ffffff;text-decoration:none;font-weight:600">Set a new password</a></p>
<p style="font-size:13px;color:#52514e">Or paste this link into your browser:<br>${safeLink}</p>
<p style="font-size:13px;color:#52514e">The link works once and expires in 30 minutes. If you didn't ask for this, ignore this email; your password stays the same.</p>
</body></html>`;
  return { to, subject: "Reset your Paisa password", text, html };
}

/** Throws on failure; the forgot route logs it (redacted) and answers the user identically either way. */
export async function sendPasswordResetEmail(to: string, link: string, fetchImpl?: typeof fetch): Promise<void> {
  await sendMail(passwordResetMail(to, link), fetchImpl);
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
