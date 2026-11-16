/**
 * CSRF check for state-changing requests (edge-safe: used by proxy.ts).
 *
 * Browsers send `Origin` on every cross-origin request and on same-origin
 * POST/PATCH/PUT/DELETE, and modern ones send `Sec-Fetch-Site`. A write is refused
 * when either says another site sent it. Requests with neither header are not
 * from a browser (curl, server-to-server) and can't carry a victim's cookies, so
 * they pass; the route's own auth still applies.
 */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isCrossSiteWrite(request: { method: string; headers: Headers; nextUrl: { host: string } }): boolean {
  if (SAFE_METHODS.has(request.method)) return false;

  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (origin === "null") return true; // sandboxed iframes, file://, some redirects
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return true;
  }
  // Behind nginx the public host (with any non-default port) arrives as x-forwarded-host.
  const allowed = [request.nextUrl.host, request.headers.get("host"), request.headers.get("x-forwarded-host")];
  return !allowed.some((h) => h && h.split(",")[0]!.trim() === host);
}
