import "server-only";
import { cache } from "react";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/user";
import { readSession } from "./cookies";

export interface VerifiedSession {
  userId: Types.ObjectId;
  name: string;
  email: string;
  sessionVersion: number;
}

/**
 * The signed-in user, checked against the database: the account still exists and
 * the token's session version is current (a password change or reset revokes older
 * tokens). `proxy.ts` only checks the signature; everything that reads or writes
 * user data goes through this. Memoised per request in Server Components.
 */
export const verifiedSession = cache(async (): Promise<VerifiedSession | null> => {
  const session = await readSession();
  if (!session) return null;
  await connectDB();
  const user = await User.findById(new Types.ObjectId(session.sub), { name: 1, email: 1, sessionVersion: 1 }).lean();
  if (!user || (user.sessionVersion ?? 0) !== session.sv) return null;
  return { userId: user._id, name: user.name, email: user.email, sessionVersion: user.sessionVersion ?? 0 };
});
