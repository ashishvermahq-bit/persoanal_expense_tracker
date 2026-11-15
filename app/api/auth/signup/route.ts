import { ApiError, ok, parseBody, withApi } from "@/lib/api";
import { bootstrapUser } from "@/lib/auth/bootstrap";
import { createSessionCookie } from "@/lib/auth/cookies";
import { hashPassword } from "@/lib/auth/password";
import { AUTH_RATE_LIMIT, clientIp, hitRateLimit } from "@/lib/auth/rate-limit";
import { connectDB } from "@/lib/db";
import { signupSchema } from "@/lib/validation/auth";
import { User } from "@/models/user";

export const POST = withApi(async (request) => {
  await connectDB();

  const ip = clientIp(request.headers);
  const rl = await hitRateLimit(`signup:ip:${ip}`, AUTH_RATE_LIMIT);
  if (!rl.allowed) {
    throw new ApiError("RATE_LIMITED", "Too many attempts. Please try again later.", undefined, {
      "Retry-After": String(rl.retryAfterSeconds),
    });
  }

  const input = await parseBody(request, signupSchema);

  const exists = await User.exists({ email: input.email });
  if (exists) {
    throw new ApiError("CONFLICT", "An account with this email already exists", {
      email: "An account with this email already exists",
    });
  }

  const passwordHash = await hashPassword(input.password);
  let user;
  try {
    user = await User.create({ name: input.name, email: input.email, passwordHash, lastLoginAt: new Date() });
  } catch (err) {
    // Race with a concurrent signup for the same email.
    if (isDuplicateKey(err)) {
      throw new ApiError("CONFLICT", "An account with this email already exists", {
        email: "An account with this email already exists",
      });
    }
    throw err;
  }

  await bootstrapUser(user._id);
  await createSessionCookie(user._id.toHexString(), 0);

  return ok({ user: { id: user._id.toHexString(), name: user.name, email: user.email } }, { status: 201 });
});

function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}
