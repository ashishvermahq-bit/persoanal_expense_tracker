/**
 * Server log hygiene: never write passwords, tokens or full email addresses.
 * Emails become "a***@example.com"; long hex/base64url runs (tokens, secrets) are cut.
 */
const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const TOKEN = /\b[A-Za-z0-9_-]{40,}\b/g;

export function redactText(s: string): string {
  return s.replace(EMAIL, "$1***@$2").replace(TOKEN, (t) => `${t.slice(0, 6)}…[redacted]`);
}

/** A loggable summary of an unknown error: name, code, redacted message and stack. */
export function redactForLog(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    const code = (err as { code?: unknown }).code;
    return {
      name: err.name,
      ...(code !== undefined ? { code } : {}),
      message: redactText(err.message),
      stack: err.stack ? redactText(err.stack) : undefined,
    };
  }
  return { error: redactText(String(err)) };
}
