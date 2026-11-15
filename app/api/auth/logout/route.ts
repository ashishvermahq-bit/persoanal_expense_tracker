import { NextResponse } from "next/server";
import { ok, withApi } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth/cookies";

/**
 * JSON callers get `{ data: { loggedOut: true } }`.
 * A plain HTML form post (the header's Sign out button) gets a 303 to /login,
 * so logout works even before the page has hydrated, and the full navigation
 * drops the previous session's client-side router cache.
 */
export const POST = withApi(async (request) => {
  await clearSessionCookie();
  const type = request.headers.get("content-type") ?? "";
  if (type.startsWith("application/x-www-form-urlencoded") || type.startsWith("multipart/form-data")) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }
  return ok({ loggedOut: true });
});
