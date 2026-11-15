import "server-only";
import { Types } from "mongoose";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/cookies";
import { connectDB } from "@/lib/db";

/**
 * For Server Components: the authenticated user's id with the DB connected,
 * or a redirect to /login. Pages call this instead of re-implementing auth.
 */
export async function requireUserId(): Promise<Types.ObjectId> {
  const session = await readSession();
  if (!session) redirect("/login");
  await connectDB();
  return new Types.ObjectId(session.sub);
}
