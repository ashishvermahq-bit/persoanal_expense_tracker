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
 * Fixed-window counter keyed by an arbitrary string (e.g. "login:ip:1.2.3.4").
 * Atomic upsert so concurrent requests cannot exceed the limit.
 */
export async function hitRateLimit(key: string, rule: RateLimitRule, now: Date = new Date()): Promise<RateLimitResult> {
  const windowStart = new Date(Math.floor(now.getTime() / (rule.windowSeconds * 1000)) * rule.windowSeconds * 1000);
  const expiresAt = new Date(windowStart.getTime() + rule.windowSeconds * 1000);
  const scopedKey = `${key}:${windowStart.getTime()}`;

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

/** Best-effort client IP behind common proxies. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
