/**
 * Stateless session: a signed JWT (HS256, `jose`) in an HTTP-only cookie.
 * This module is edge-safe (no Node-only imports) so `proxy.ts` can verify
 * tokens; the cookie read/write helpers that need `next/headers` live in
 * `./cookies.ts`.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const SESSION_COOKIE = "session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  /** User id (ObjectId hex). */
  sub: string;
  /** Issued-at, seconds. */
  iat: number;
  /** Expiry, seconds. */
  exp: number;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set and at least 32 characters long");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(userId: string, now: Date = new Date()): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_TTL_SECONDS)
    .sign(secretKey());
}

/** Returns the payload or null for a missing/invalid/expired token. Never throws. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (!isSessionPayload(payload)) return null;
    return payload;
  } catch {
    return null;
  }
}

function isSessionPayload(p: JWTPayload): p is SessionPayload & JWTPayload {
  return typeof p.sub === "string" && /^[0-9a-f]{24}$/.test(p.sub) && typeof p.exp === "number" && typeof p.iat === "number";
}

export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}
