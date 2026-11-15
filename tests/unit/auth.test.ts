import { beforeAll, describe, expect, it } from "vitest";
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "@/lib/auth/session";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

beforeAll(() => {
  process.env.AUTH_SECRET = "unit-test-secret-0123456789abcdef0123456789";
});

describe("session tokens", () => {
  const userId = "64b7f0c2e1a2b3c4d5e6f789";

  it("round-trips a user id", async () => {
    const token = await signSessionToken(userId);
    const payload = await verifySessionToken(token);
    expect(payload?.sub).toBe(userId);
    expect(payload!.exp - payload!.iat).toBe(SESSION_TTL_SECONDS);
  });

  it("rejects tampered, expired and missing tokens", async () => {
    const token = await signSessionToken(userId);
    expect(await verifySessionToken(token.slice(0, -2) + "xx")).toBeNull();
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken("")).toBeNull();
    const old = await signSessionToken(userId, new Date(Date.now() - (SESSION_TTL_SECONDS + 120) * 1000));
    expect(await verifySessionToken(old)).toBeNull();
  });

  it("rejects tokens signed with another secret", async () => {
    const token = await signSessionToken(userId);
    process.env.AUTH_SECRET = "a-different-secret-0123456789abcdef0123456789";
    expect(await verifySessionToken(token)).toBeNull();
    process.env.AUTH_SECRET = "unit-test-secret-0123456789abcdef0123456789";
  });
});

describe("auth validation", () => {
  it("normalises email and enforces password rules", () => {
    const ok = signupSchema.safeParse({
      name: " Priya ",
      email: "  Priya@Example.COM ",
      password: "Secret123",
      confirmPassword: "Secret123",
    });
    expect(ok.success).toBe(true);
    if (ok.success) {
      expect(ok.data.email).toBe("priya@example.com");
      expect(ok.data.name).toBe("Priya");
    }

    const weak = signupSchema.safeParse({ name: "P", email: "nope", password: "abcdefgh", confirmPassword: "x" });
    expect(weak.success).toBe(false);
    if (!weak.success) {
      const paths = weak.error.issues.map((i) => i.path.join("."));
      expect(paths).toEqual(expect.arrayContaining(["name", "email", "password", "confirmPassword"]));
    }
  });

  it("login requires a non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
  });
});
