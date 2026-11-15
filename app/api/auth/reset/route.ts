import { ApiError, ok, parseBody, withApi } from "@/lib/api";
import { AUTH_RATE_LIMIT, clientIp, hitRateLimit } from "@/lib/auth/rate-limit";
import { connectDB } from "@/lib/db";
import { resetPasswordWithToken } from "@/lib/services/account";
import { resetPasswordSchema } from "@/lib/validation/auth";

/** Spend a reset token. Every session (on every device) is signed out; the user signs in again. */
export const POST = withApi(async (request) => {
  await connectDB();
  const rl = await hitRateLimit(`reset:ip:${clientIp(request.headers)}`, AUTH_RATE_LIMIT);
  if (!rl.allowed) {
    throw new ApiError("RATE_LIMITED", "Too many attempts. Please try again later.", undefined, { "Retry-After": String(rl.retryAfterSeconds) });
  }
  const input = await parseBody(request, resetPasswordSchema);
  await resetPasswordWithToken(input.token, input.password);
  return ok({ reset: true });
});
