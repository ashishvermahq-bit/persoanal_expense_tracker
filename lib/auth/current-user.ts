import "server-only";
import { cache } from "react";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { readSession } from "@/lib/auth/cookies";
import { User } from "@/models/user";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/**
 * The logged-in user for Server Components, or null. Memoised per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;
  await connectDB();
  const user = await User.findById(new Types.ObjectId(session.sub), { name: 1, email: 1 }).lean();
  if (!user) return null;
  return { id: user._id.toHexString(), name: user.name, email: user.email };
});
