/**
 * Only same-origin paths. Parsed rather than prefix-checked: browsers read "/\evil.com"
 * (and tab/newline variants) as "//evil.com", an open redirect a prefix check misses.
 */
export function safeNext(next: string | undefined, origin: string = window.location.origin): string {
  if (!next || !next.startsWith("/")) return "/dashboard";
  try {
    const url = new URL(next, origin);
    if (url.origin !== origin) return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/dashboard";
  }
}
