import "server-only";
import { Types } from "mongoose";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/cookies";
import { verifiedSession } from "@/lib/auth/verified-session";

/**
 * For Server Components: the authenticated user's id with the DB connected,
 * or a redirect to /login. Pages call this instead of re-implementing auth.
 */
export async function requireUserId(): Promise<Types.ObjectId> {
  const session = await verifiedSession();
  if (session) return session.userId;
  // A validly signed but revoked token (password changed elsewhere, account deleted):
  // the proxy would bounce /login straight back here, so ask it to drop the cookie.
  redirect((await readSession()) ? "/login?reauth=1" : "/login");
}
