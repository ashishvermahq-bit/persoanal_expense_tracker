import { ApiError, ok, parseBody, withApi } from "@/lib/api";
import { bootstrapUser } from "@/lib/auth/bootstrap";
import { createSessionCookie } from "@/lib/auth/cookies";
import { dummyHash, verifyPassword } from "@/lib/auth/password";
import { AUTH_RATE_LIMIT, LOGIN_FAILURE_LIMIT, clientIp, hitRateLimit, peekRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { connectDB } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";
import { User } from "@/models/user";

export const POST = withApi(async (request) => {
  await connectDB();

  const input = await parseBody(request, loginSchema);

  // Limit per IP and per account so one attacker can't lock everyone out and
  // one account can't be sprayed from many IPs.
  const ip = clientIp(request.headers);
  const [byIp, byEmail] = await Promise.all([
    hitRateLimit(`login:ip:${ip}`, AUTH_RATE_LIMIT),
    hitRateLimit(`login:email:${input.email}`, AUTH_RATE_LIMIT),
  ]);
  if (!byIp.allowed || !byEmail.allowed) {
    const retry = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    throw new ApiError("RATE_LIMITED", "Too many attempts. Please try again later.", undefined, {
      "Retry-After": String(retry),
    });
  }

  // Failed attempts are counted per email whether or not an account exists, and checked
  // before the lookup, so "locked" looks identical for registered and unknown addresses.
  const failKey = `login:fail:${input.email}`;
  const failures = await peekRateLimit(failKey, LOGIN_FAILURE_LIMIT);
  if (!failures.allowed) {
    const mins = Math.ceil(failures.retryAfterSeconds / 60);
    throw new ApiError("LOCKED", `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`, undefined, {
      "Retry-After": String(failures.retryAfterSeconds),
    });
  }

  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  // Unknown email: burn the same bcrypt time as a real check so timing doesn't leak existence.
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : (await verifyPassword(input.password, await dummyHash()), false);

  if (!user || !valid) {
    await hitRateLimit(failKey, LOGIN_FAILURE_LIMIT);
    throw new ApiError("UNAUTHORIZED", "Incorrect email or password");
  }

  await Promise.all([
    resetRateLimit(failKey, LOGIN_FAILURE_LIMIT),
    User.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } }),
    bootstrapUser(user._id),
  ]);
  await createSessionCookie(user._id.toHexString(), user.sessionVersion ?? 0);

  return ok({ user: { id: user._id.toHexString(), name: user.name, email: user.email } });
});
