import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

const O = "https://paisa.example";
const BS = "\\"; // one backslash

describe("post-login redirect (?next=)", () => {
  it.each(["/expenses?from=2026-11-01", "/dashboard#top", "/budgets"])("keeps same-origin path %s", (p) => expect(safeNext(p, O)).toBe(p));

  it.each([
    "//evil.example",
    `/${BS}evil.example`, // browsers read "/\" as "//"
    `/${BS}/evil.example`,
    `/${BS}${BS}evil.example`,
    "/\t/evil.example",
    "/\n/evil.example",
    "https://evil.example/x",
    "javascript:alert(1)",
    "",
    undefined,
  ])("refuses %j", (p) => {
    const out = safeNext(p, O);
    expect(out === "/dashboard" || new URL(out, O).origin === O).toBe(true);
    expect(out.startsWith("//")).toBe(false);
  });

  it("never yields another origin", () => {
    for (const p of ["//evil.example", `/${BS}/evil.example`, "/\t/evil.example"]) expect(safeNext(p, O)).toBe("/dashboard");
  });
});
