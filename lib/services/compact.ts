/**
 * Drop `null`/`undefined` values before `Model.create()`. Validation emits
 * `null` for cleared optional text (meaningful in a PATCH `$set`), but on
 * insert "absent" is what we want and what Mongoose's create() types accept.
 */
export function compact<T extends Record<string, unknown>>(obj: T): { [K in keyof T]: Exclude<T[K], null | undefined> } {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== null && v !== undefined) out[k] = v;
  return out as { [K in keyof T]: Exclude<T[K], null | undefined> };
}
