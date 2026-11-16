import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  sessionCookieOptions,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "./session";

/** `sessionVersion` must be the user's current value (see models/user.ts). */
export async function createSessionCookie(userId: string, sessionVersion: number): Promise<void> {
  const token = await signSessionToken(userId, sessionVersion);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(new Date(Date.now() + SESSION_TTL_SECONDS * 1000)));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  // Same attributes as when set, so every browser matches and drops it.
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions(new Date(0)), maxAge: 0 });
}

/** Signature/expiry-checked session from the request cookie, or null. No DB check: see verified-session.ts. */
export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
