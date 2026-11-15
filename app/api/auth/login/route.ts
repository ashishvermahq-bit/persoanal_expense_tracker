import { ApiError, ok, parseBody, withApi } from "@/lib/api";
import { bootstrapUser } from "@/lib/auth/bootstrap";
import { createSessionCookie } from "@/lib/auth/cookies";
import { dummyHash, verifyPassword } from "@/lib/auth/password";
import { AUTH_RATE_LIMIT, clientIp, hitRateLimit } from "@/lib/auth/rate-limit";
import { connectDB } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";
import { User } from "@/models/user";

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;

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

  const user = await User.findOne({ email: input.email }).select("+passwordHash");
  const invalid = new ApiError("UNAUTHORIZED", "Incorrect email or password");

  if (!user) {
    // Burn the same bcrypt time as a real check so timing doesn't leak existence.
    await verifyPassword(input.password, await dummyHash());
    throw invalid;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    throw new ApiError("LOCKED", `Account temporarily locked. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    const failed = user.failedLoginCount + 1;
    await User.updateOne(
      { _id: user._id },
      failed >= MAX_FAILED_LOGINS
        ? { $set: { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) } }
        : { $set: { failedLoginCount: failed } }
    );
    throw invalid;
  }

  await Promise.all([
    User.updateOne({ _id: user._id }, { $set: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() } }),
    bootstrapUser(user._id),
  ]);
  await createSessionCookie(user._id.toHexString());

  return ok({ user: { id: user._id.toHexString(), name: user.name, email: user.email } });
});
