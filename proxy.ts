import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { isCrossSiteWrite } from "@/lib/auth/origin";

/**
 * Optimistic auth gate. Verifies the session JWT signature/expiry only (no DB)
 * and redirects: guests away from the app, signed-in users away from auth pages.
 * Route handlers under /api re-check auth themselves via `withAuth` (which also
 * checks the session hasn't been revoked).
 *
 * Also the CSRF guard: a state-changing /api request whose Origin (or
 * Sec-Fetch-Site) says it came from another site is refused before any handler
 * runs. SameSite=Lax already keeps the session cookie off cross-site POSTs; this
 * also covers login/signup (no cookie needed) and same-site subdomains.
 */
/** Signed-in users are sent on to the app from these. */
const AUTH_PAGES = new Set(["/login", "/signup"]);
/** Reachable signed in or out. */
const OPEN_PAGES = new Set(["/privacy", "/terms", "/forgot-password", "/reset-password"]);
/** No session needed: auth endpoints, the health probe and cron (which checks CRON_SECRET itself). */
const PUBLIC_API = /^\/api\/(auth\/(login|signup|logout|forgot|reset)|health|cron\/[a-z-]+)$/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (isCrossSiteWrite(request)) {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Cross-site request refused" } }, { status: 403 });
    }
    if (PUBLIC_API.test(pathname)) return NextResponse.next();
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in" } }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (OPEN_PAGES.has(pathname)) return NextResponse.next();

  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (AUTH_PAGES.has(pathname)) {
    // ?reauth=1: the app found this (validly signed) session revoked; drop it and show the form.
    if (request.nextUrl.searchParams.has("reauth")) {
      const res = NextResponse.next();
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    if (session) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL(session ? "/dashboard" : "/login", request.url));
  }

  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    const res = NextResponse.redirect(login);
    // Drop an invalid/expired cookie so we don't keep re-checking it.
    if (request.cookies.has(SESSION_COOKIE)) res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static files. The service worker, manifest and
  // icons must stay public: browsers refuse a SW served via a redirect, and the PWA
  // install prompt fetches the manifest/icons signed out.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js$|manifest\\.json$|robots\\.txt$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest|woff2?)$).*)",
  ],
};
