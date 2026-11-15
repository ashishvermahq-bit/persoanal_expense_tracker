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

export async function createSessionCookie(userId: string): Promise<void> {
  const token = await signSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(new Date(Date.now() + SESSION_TTL_SECONDS * 1000)));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Verified session from the request cookie, or null. */
export async function readSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
