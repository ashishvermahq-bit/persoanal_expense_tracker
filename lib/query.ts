/**
 * Turn URLSearchParams (or Next's searchParams object) into a plain record
 * Zod can parse: repeated keys become arrays, blanks are dropped.
 */
export type SearchParamsLike = URLSearchParams | Record<string, string | string[] | undefined>;

export function searchParamsToObject(sp: SearchParamsLike): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const entries: [string, string | string[] | undefined][] =
    sp instanceof URLSearchParams ? Array.from(sp.keys()).map((k) => [k, sp.getAll(k)]) : Object.entries(sp);
  for (const [k, v] of entries) {
    if (v === undefined) continue;
    const arr = (Array.isArray(v) ? v : [v]).filter((s) => s !== "");
    if (arr.length === 0) continue;
    out[k] = arr.length === 1 ? arr[0]! : arr;
  }
  return out;
}
