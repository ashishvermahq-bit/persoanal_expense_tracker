import { ApiError, ok, parseBody, withAuth } from "@/lib/api";
import { createSessionCookie } from "@/lib/auth/cookies";
import { AUTH_RATE_LIMIT, hitRateLimit } from "@/lib/auth/rate-limit";
import { changePassword } from "@/lib/services/account";
import { changePasswordSchema } from "@/lib/validation/auth";

/** Change password; every other device is signed out, this one stays signed in. */
export const POST = withAuth(async (request, _ctx, { userId }) => {
  const rl = await hitRateLimit(`password:user:${userId.toHexString()}`, AUTH_RATE_LIMIT);
  if (!rl.allowed) {
    throw new ApiError("RATE_LIMITED", "Too many attempts. Please try again later.", undefined, { "Retry-After": String(rl.retryAfterSeconds) });
  }
  const input = await parseBody(request, changePasswordSchema);
  const sessionVersion = await changePassword(userId, input.currentPassword, input.newPassword);
  await createSessionCookie(userId.toHexString(), sessionVersion);
  return ok({ changed: true });
});
