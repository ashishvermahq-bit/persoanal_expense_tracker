import { beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { csvCell, csvRow, escapeHtml } from "@/lib/csv";
import { isCrossSiteWrite } from "@/lib/auth/origin";
import { clientIp } from "@/lib/auth/rate-limit";
import { cronAuthorized } from "@/lib/auth/cron";
import { sessionCookieOptions } from "@/lib/auth/session";
import { redactText } from "@/lib/log";
import { receiptBytes, sniffReceiptType } from "@/lib/storage";
import { createExpenseSchema, expenseFiltersSchema } from "@/lib/validation/expense";
import { loginSchema, resetPasswordSchema } from "@/lib/validation/auth";
import { firstOccurrence, nextOccurrence } from "@/lib/services/recurring";
import { istMidnight, toInputDate } from "@/lib/dates";
import { validateServerEnv } from "@/lib/env";
import { config as proxyConfig, proxy } from "@/proxy";

beforeAll(() => {
  process.env.AUTH_SECRET = "unit-test-secret-0123456789abcdef0123456789";
});

describe("CSV export cells", () => {
  it.each(["=HYPERLINK(\"http://evil\",\"x\")", "+91 98765", "-2+3", "@SUM(A1)", "\tcmd", "\r=1"])("neutralises formula start %j", (v) => {
    expect(csvCell(v).startsWith(`"'`)).toBe(true);
  });
  it("quotes every cell and doubles inner quotes, so commas/newlines can't shift columns", () => {
    expect(csvRow(['Dosa, "special"', "line1\nline2", 1250])).toBe('"Dosa, ""special""","line1\nline2","1250"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell("1,23,456.78")).toBe('"1,23,456.78"');
  });
  it("escapes HTML for the printable export", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">&'`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&amp;&#39;");
  });
});

describe("CSRF origin check", () => {
  const req = (method: string, headers: Record<string, string>, host = "paisa.app") => ({ method, headers: new Headers({ host, ...headers }), nextUrl: { host } });
  it("refuses cross-site writes", () => {
    expect(isCrossSiteWrite(req("POST", { origin: "https://evil.example" }))).toBe(true);
    expect(isCrossSiteWrite(req("DELETE", { "sec-fetch-site": "cross-site" }))).toBe(true);
    expect(isCrossSiteWrite(req("PATCH", { "sec-fetch-site": "same-site", origin: "https://sub.paisa.app" }))).toBe(true);
    expect(isCrossSiteWrite(req("POST", { origin: "null" }))).toBe(true);
  });
  it("allows same-origin writes, reads, and non-browser clients", () => {
    expect(isCrossSiteWrite(req("POST", { origin: "https://paisa.app", "sec-fetch-site": "same-origin" }))).toBe(false);
    expect(isCrossSiteWrite(req("GET", { origin: "https://evil.example" }))).toBe(false);
    expect(isCrossSiteWrite(req("POST", {}))).toBe(false);
    expect(isCrossSiteWrite(req("POST", { origin: "https://paisa.app", "x-forwarded-host": "paisa.app" }, "internal:3000"))).toBe(false);
  });
});

describe("client IP for rate limits", () => {
  it("prefers the proxy-set x-real-ip", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1, 203.0.113.9" }))).toBe("203.0.113.9");
  });
  it("uses the last x-forwarded-for hop, never the client-supplied first one", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("cron secret", () => {
  const secret = "s".repeat(40);
  it("accepts only the exact bearer secret", () => {
    expect(cronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
    expect(cronAuthorized(`Bearer ${secret}x`, secret)).toBe(false);
    expect(cronAuthorized(secret, secret)).toBe(false);
    expect(cronAuthorized(null, secret)).toBe(false);
    expect(cronAuthorized("Bearer ", "")).toBe(false);
  });
});

describe("session cookie", () => {
  it("is HttpOnly, SameSite=Lax, Path=/ and Secure in production", () => {
    const env = process.env as Record<string, string | undefined>;
    const before = env.NODE_ENV;
    env.NODE_ENV = "production";
    const opts = sessionCookieOptions(new Date());
    env.NODE_ENV = before;
    expect(opts).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", secure: true });
  });
});

describe("boot-time env validation", () => {
  it("rejects a missing or short AUTH_SECRET", () => {
    const saved = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "short";
    expect(() => validateServerEnv({ ...process.env, MONGODB_URI: "mongodb://x" })).toThrow(/AUTH_SECRET/);
    process.env.AUTH_SECRET = saved;
    expect(() => validateServerEnv({ ...process.env, MONGODB_URI: "mongodb://x" })).not.toThrow();
    expect(() => validateServerEnv({ ...process.env, MONGODB_URI: "" })).toThrow(/MONGODB_URI/);
  });
});

describe("log redaction", () => {
  it("never logs full emails or tokens", () => {
    const s = redactText('E11000 duplicate key { email: "priya.sharma@example.com" } token=AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcdef');
    expect(s).not.toContain("priya.sharma@");
    expect(s).toContain("p***@example.com");
    expect(s).not.toContain("AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcdef");
  });
});

describe("receipts", () => {
  it("trusts file bytes, not the claimed type", () => {
    expect(sniffReceiptType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffReceiptType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    expect(sniffReceiptType(new TextEncoder().encode("%PDF-1.7"))).toBe("application/pdf");
    expect(sniffReceiptType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(sniffReceiptType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffReceiptType(new TextEncoder().encode("<html>"))).toBeNull();
  });
  it("copies exactly the stored bytes (never Node's shared buffer pool)", () => {
    const small = Buffer.from([1, 2, 3]);
    expect(new Uint8Array(receiptBytes(small))).toEqual(new Uint8Array([1, 2, 3]));
    expect(receiptBytes(small).byteLength).toBe(3);
    expect(new Uint8Array(receiptBytes({ buffer: new Uint8Array([9, 8]) }))).toEqual(new Uint8Array([9, 8]));
  });
  it("expenses only accept receipt URLs this app issued", () => {
    const base = { categoryId: "64b7f0c2e1a2b3c4d5e6f789", date: "2026-11-01", amount: "10" };
    expect(createExpenseSchema.safeParse({ ...base, receiptUrl: "/api/receipts/64b7f0c2e1a2b3c4d5e6f789.png" }).success).toBe(true);
    for (const bad of ["javascript:alert(1)", "https://evil.example/x.png", "/api/receipts/../../etc.png", "//evil.example/a.pdf"]) {
      expect(createExpenseSchema.safeParse({ ...base, receiptUrl: bad }).success).toBe(false);
    }
  });
});

describe("NoSQL operator injection is rejected at validation", () => {
  it("login, expense body and filters accept only plain values", () => {
    expect(loginSchema.safeParse({ email: { $gt: "" }, password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: { $ne: null } }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ categoryId: { $ne: null }, date: "2026-11-01", amount: "10" }).success).toBe(false);
    expect(createExpenseSchema.safeParse({ categoryId: "64b7f0c2e1a2b3c4d5e6f789", date: "2026-11-01", amountPaise: { $gt: 0 } }).success).toBe(false);
    expect(expenseFiltersSchema.safeParse({ q: { $regex: ".*" } }).success).toBe(false);
    expect(expenseFiltersSchema.safeParse({ categoryId: ["$ne"] }).success).toBe(false);
  });
  it("reset tokens must be the exact issued shape", () => {
    expect(resetPasswordSchema.safeParse({ token: { $ne: "" }, password: "Secret123", confirmPassword: "Secret123" }).success).toBe(false);
  });
});

describe("recurring schedule (IST, month ends)", () => {
  const ymd = (d: Date) => toInputDate(d);
  it("a 31st rule clamps in short months and returns to the 31st", () => {
    const rule = { frequency: "monthly" as const, dayOfMonth: 31 };
    let d = istMidnight(2027, 1, 31);
    const seen = [];
    for (let i = 0; i < 4; i++) {
      d = nextOccurrence(rule, d);
      seen.push(ymd(d));
    }
    expect(seen).toEqual(["2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31"]);
  });
  it("handles leap years, quarters, years and weeks", () => {
    expect(ymd(nextOccurrence({ frequency: "monthly", dayOfMonth: 30 }, istMidnight(2028, 1, 30)))).toBe("2028-02-29");
    expect(ymd(nextOccurrence({ frequency: "quarterly", dayOfMonth: 31 }, istMidnight(2026, 11, 30)))).toBe("2027-02-28");
    expect(ymd(nextOccurrence({ frequency: "yearly", dayOfMonth: 29 }, istMidnight(2028, 2, 29)))).toBe("2029-02-28");
    expect(ymd(nextOccurrence({ frequency: "weekly", dayOfMonth: 1 }, istMidnight(2027, 3, 29)))).toBe("2027-04-05");
  });
  it("first run is on/after the start date in IST (not server time)", () => {
    // 31 Mar 2027 20:00 UTC is already 1 Apr 01:30 IST.
    expect(ymd(firstOccurrence({ frequency: "monthly", dayOfMonth: 1 }, new Date("2027-03-31T20:00:00Z")))).toBe("2027-04-01");
    expect(ymd(firstOccurrence({ frequency: "monthly", dayOfMonth: 5 }, istMidnight(2027, 3, 10)))).toBe("2027-04-05");
    expect(ymd(firstOccurrence({ frequency: "monthly", dayOfMonth: 31 }, istMidnight(2027, 2, 1)))).toBe("2027-02-28");
  });
});

describe("proxy", () => {
  // Next compiles the matcher with path-to-regexp; this one is a plain regex group.
  const matcher = new RegExp(`^${proxyConfig.matcher[0]}$`);
  it.each(["/manifest.json", "/sw.js", "/icon-192.png", "/icon.svg", "/apple-touch-icon.png", "/favicon.ico", "/robots.txt", "/_next/static/chunks/a.js"])(
    "never runs on static file %s (so it can't redirect it to /login)",
    (path) => expect(matcher.test(path)).toBe(false)
  );
  it.each(["/dashboard", "/api/expenses", "/login"])("runs on %s", (path) => expect(matcher.test(path)).toBe(true));

  const run = (path: string, init?: { method?: string; headers?: Record<string, string> }) =>
    proxy(new NextRequest(`http://localhost:3000${path}`, init as ConstructorParameters<typeof NextRequest>[1]));

  it("lets guests reach the public pages and probes", async () => {
    for (const p of ["/privacy", "/terms", "/forgot-password", "/reset-password", "/login"]) {
      expect((await run(p)).headers.get("location")).toBeNull();
    }
    expect((await run("/api/health")).status).toBe(200);
    expect((await run("/api/cron/recurring")).status).toBe(200);
  });
  it("blocks guests from app pages and private APIs", async () => {
    expect((await run("/dashboard")).headers.get("location")).toContain("/login?next=%2Fdashboard");
    expect((await run("/api/expenses")).status).toBe(401);
    expect((await run("/api/receipts/64b7f0c2e1a2b3c4d5e6f789.pdf")).status).toBe(401);
  });
  it("refuses a cross-site POST before any handler runs (incl. login CSRF)", async () => {
    const res = await run("/api/auth/login", { method: "POST", headers: { origin: "https://evil.example" } });
    expect(res.status).toBe(403);
  });
});
