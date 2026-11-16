import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * `Authorization: Bearer <CRON_SECRET>`, compared in constant time. Both sides are
 * hashed first so the comparison never depends on (or leaks) the secret's length.
 */
export function cronAuthorized(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
