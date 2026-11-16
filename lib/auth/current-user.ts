import "server-only";
import { cache } from "react";
import { verifiedSession } from "./verified-session";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/**
 * The logged-in user for Server Components, or null (no cookie, revoked session or
 * deleted account). Memoised per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const s = await verifiedSession();
  return s ? { id: s.userId.toHexString(), name: s.name, email: s.email } : null;
});
