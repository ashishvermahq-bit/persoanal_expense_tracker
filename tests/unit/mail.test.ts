import { afterEach, describe, expect, it, vi } from "vitest";
import { emailConfigured, passwordResetMail, sendPasswordResetEmail } from "@/lib/mail";
import { validateServerEnv } from "@/lib/env";

const env = process.env as Record<string, string | undefined>;
const saved = { ...env };
afterEach(() => {
  for (const k of ["RESEND_API_KEY", "EMAIL_FROM", "NODE_ENV", "APP_URL"]) env[k] = saved[k];
  vi.restoreAllMocks();
});

const okFetch = () => vi.fn(async () => new Response(JSON.stringify({ id: "x" }), { status: 200 })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

describe("Resend mailer", () => {
  it("posts the reset email to Resend with the key as a bearer token", async () => {
    env.RESEND_API_KEY = "re_test_123";
    env.EMAIL_FROM = "Paisa <no-reply@paisa.example>";
    const f = okFetch();
    await sendPasswordResetEmail("priya@example.com", "https://paisa.example/reset-password?token=abc", f);
    expect(f).toHaveBeenCalledOnce();
    const [url, init] = f.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_123");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ from: "Paisa <no-reply@paisa.example>", to: ["priya@example.com"], subject: "Reset your Paisa password" });
    expect(body.text).toContain("https://paisa.example/reset-password?token=abc");
  });

  it("throws on a Resend error (the route logs it and answers the same)", async () => {
    env.RESEND_API_KEY = "re_test_123";
    env.EMAIL_FROM = "no-reply@paisa.example";
    const f = vi.fn(async () => new Response('{"message":"domain not verified"}', { status: 403 })) as unknown as typeof fetch;
    await expect(sendPasswordResetEmail("a@b.co", "https://x/y", f)).rejects.toThrow(/403.*domain not verified/);
  });

  it("escapes the link in HTML", () => {
    const m = passwordResetMail("a@b.co", 'https://x/?t="><script>');
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("without Resend: dev prints to the console, production sends nothing and reports unconfigured", async () => {
    delete env.RESEND_API_KEY;
    delete env.EMAIL_FROM;
    const f = okFetch();
    env.NODE_ENV = "development";
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    await sendPasswordResetEmail("a@b.co", "http://localhost/reset", f);
    expect(info).toHaveBeenCalled();
    expect(emailConfigured()).toBe(true);
    env.NODE_ENV = "production";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await sendPasswordResetEmail("a@b.co", "https://x/reset", f);
    expect(f).not.toHaveBeenCalled();
    expect(emailConfigured()).toBe(false);
    expect(emailConfigured({ NODE_ENV: "production", RESEND_API_KEY: "re_x", EMAIL_FROM: "a@b.co" })).toBe(true);
  });
});

describe("email env validation", () => {
  const base = { NODE_ENV: "production", MONGODB_URI: "mongodb://x", CRON_SECRET: "c".repeat(32) } as NodeJS.ProcessEnv;
  it("requires both values, a sane sender, a Resend key and an https APP_URL", () => {
    env.AUTH_SECRET = "unit-test-secret-0123456789abcdef0123456789";
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => validateServerEnv({ ...base, RESEND_API_KEY: "re_x" })).toThrow(/both/);
    expect(() => validateServerEnv({ ...base, RESEND_API_KEY: "re_x", EMAIL_FROM: "not an address", APP_URL: "https://p.example" })).toThrow(/EMAIL_FROM/);
    expect(() => validateServerEnv({ ...base, RESEND_API_KEY: "sk_x", EMAIL_FROM: "a@p.example", APP_URL: "https://p.example" })).toThrow(/Resend key/);
    expect(() => validateServerEnv({ ...base, RESEND_API_KEY: "re_x", EMAIL_FROM: "Paisa <a@p.example>", APP_URL: "http://p.example" })).toThrow(/APP_URL/);
    expect(() => validateServerEnv({ ...base, RESEND_API_KEY: "re_x", EMAIL_FROM: "Paisa <a@p.example>", APP_URL: "https://p.example" })).not.toThrow();
    expect(() => validateServerEnv(base)).not.toThrow();
  });
});
