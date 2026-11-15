import type { ZodError } from "zod";

/**
 * Flatten Zod issues into `{ "path.to.field": message }`, keeping the FIRST
 * issue per field so users see the most fundamental problem (e.g. "too short"
 * before "needs a number"). Shared by the API envelope and client forms.
 */
export function fieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}
