import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Optimistic auth gate. Verifies the session JWT signature/expiry only (no DB)
 * and redirects: guests away from the app, signed-in users away from auth pages.
 * Route handlers under /api re-check auth themselves via `withAuth`.
 */
const PUBLIC_PATHS = new Set(["/login", "/signup"]);
const PUBLIC_API_PREFIX = "/api/auth/";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith(PUBLIC_API_PREFIX) && pathname !== "/api/auth/me") return NextResponse.next();
    if (!session) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in" } }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.has(pathname)) {
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
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)"],
};
