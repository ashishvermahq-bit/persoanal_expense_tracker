import "server-only";
import { RateLimit } from "@/models/rate-limit";

export interface RateLimitRule {
  /** Max hits per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfterSeconds: number;
}

/** 10 per 15 min in production. AUTH_RATE_LIMIT_MAX exists only so the e2e server (one IP, many signups) can raise it. */
export const AUTH_RATE_LIMIT: RateLimitRule = {
  limit: Number(process.env.AUTH_RATE_LIMIT_MAX) > 0 ? Number(process.env.AUTH_RATE_LIMIT_MAX) : 10,
  windowSeconds: 15 * 60,
};

/**
 * Failed sign-ins per email (existing account or not, so a lock never reveals
 * whether an address is registered): 5 per 15 minutes, then locked until the window ends.
 */
export const LOGIN_FAILURE_LIMIT: RateLimitRule = { limit: 5, windowSeconds: 15 * 60 };

function windowOf(key: string, rule: RateLimitRule, now: Date) {
  const windowStart = new Date(Math.floor(now.getTime() / (rule.windowSeconds * 1000)) * rule.windowSeconds * 1000);
  const expiresAt = new Date(windowStart.getTime() + rule.windowSeconds * 1000);
  return { windowStart, expiresAt, scopedKey: `${key}:${windowStart.getTime()}` };
}

/**
 * Fixed-window counter keyed by an arbitrary string (e.g. "login:ip:1.2.3.4").
 * Atomic upsert so concurrent requests cannot exceed the limit. State lives in
 * Mongo, so it holds across serverless instances (an in-memory map would not).
 */
export async function hitRateLimit(key: string, rule: RateLimitRule, now: Date = new Date()): Promise<RateLimitResult> {
  const { windowStart, expiresAt, scopedKey } = windowOf(key, rule, now);

  const doc = await RateLimit.findOneAndUpdate(
    { key: scopedKey },
    { $inc: { count: 1 }, $setOnInsert: { windowStart, expiresAt } },
    { upsert: true, returnDocument: "after", lean: true }
  );

  const count = doc?.count ?? 1;
  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
  };
}

/** Current count for `key` without incrementing it. */
export async function peekRateLimit(key: string, rule: RateLimitRule, now: Date = new Date()): Promise<RateLimitResult> {
  const { expiresAt, scopedKey } = windowOf(key, rule, now);
  const doc = await RateLimit.findOne({ key: scopedKey }, { count: 1 }).lean();
  const count = doc?.count ?? 0;
  return {
    allowed: count < rule.limit,
    remaining: Math.max(0, rule.limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
  };
}

/** Forget the current window for `key` (e.g. failures, after a successful sign-in). */
export async function resetRateLimit(key: string, rule: RateLimitRule, now: Date = new Date()): Promise<void> {
  await RateLimit.deleteOne({ key: windowOf(key, rule, now).scopedKey });
}

/**
 * Client IP for rate limiting. Must not be client-controlled:
 * - `x-real-ip`: set by Vercel (and nginx-style proxies) to the connecting client.
 * - else the LAST `x-forwarded-for` hop, the one our own proxy appended. The first
 *   entry is whatever the client sent, so trusting it lets anyone dodge the limit.
 * (Vercel overwrites x-forwarded-for with the real client IP, so both agree there.)
 */
export function clientIp(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean);
  return hops?.at(-1) ?? "unknown";
}
