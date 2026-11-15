import { NextResponse } from "next/server";
import { ok, withApi } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth/cookies";

/**
 * JSON callers get `{ data: { loggedOut: true } }`.
 * A plain HTML form post (the header's Sign out button) gets a 303 to /login,
 * so logout works even before the page has hydrated, and the full navigation
 * drops the previous session's client-side router cache.
 *
 * `Clear-Site-Data: "cache"` also empties the browser's HTTP cache for this origin
 * on shared devices. (The service worker only ever caches static build assets.)
 */
const CLEAR = { "Clear-Site-Data": '"cache"' };

export const POST = withApi(async (request) => {
  await clearSessionCookie();
  const type = request.headers.get("content-type") ?? "";
  if (type.startsWith("application/x-www-form-urlencoded") || type.startsWith("multipart/form-data")) {
    return NextResponse.redirect(new URL("/login", request.url), { status: 303, headers: CLEAR });
  }
  return ok({ loggedOut: true }, { headers: CLEAR });
});
