import { ApiError, ok, parseBody, withApi } from "@/lib/api";
import { AUTH_RATE_LIMIT, clientIp, hitRateLimit } from "@/lib/auth/rate-limit";
import { connectDB } from "@/lib/db";
import { redactForLog } from "@/lib/log";
import { appUrl, sendPasswordResetEmail } from "@/lib/mail";
import { createPasswordResetToken } from "@/lib/services/account";
import { forgotPasswordSchema } from "@/lib/validation/auth";

/**
 * Always the same answer, whether or not the email has an account (no enumeration).
 */
export const POST = withApi(async (request) => {
  await connectDB();
  const { email } = await parseBody(request, forgotPasswordSchema);

  const [byIp, byEmail] = await Promise.all([
    hitRateLimit(`forgot:ip:${clientIp(request.headers)}`, AUTH_RATE_LIMIT),
    hitRateLimit(`forgot:email:${email}`, { limit: 3, windowSeconds: 15 * 60 }),
  ]);
  if (!byIp.allowed) {
    throw new ApiError("RATE_LIMITED", "Too many attempts. Please try again later.", undefined, { "Retry-After": String(byIp.retryAfterSeconds) });
  }

  // Per-email limit reached: answer as usual but send nothing more (no inbox flooding).
  if (byEmail.allowed) {
    try {
      const reset = await createPasswordResetToken(email);
      if (reset) await sendPasswordResetEmail(email, `${appUrl(request)}/reset-password?token=${reset.token}`);
    } catch (err) {
      console.error("[forgot] could not issue reset", redactForLog(err));
    }
  }
  return ok({ sent: true });
});
