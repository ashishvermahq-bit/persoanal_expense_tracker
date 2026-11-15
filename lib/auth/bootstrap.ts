import "server-only";
import type { Types } from "mongoose";
import { UserPreferences } from "@/models/user-preferences";
import { seedSystemCategories } from "@/lib/seed/categories";

/**
 * Make sure a user has everything they need after signup / first login:
 * default preferences and the shared system categories.
 */
export async function bootstrapUser(userId: Types.ObjectId): Promise<void> {
  await Promise.all([
    UserPreferences.updateOne({ userId }, { $setOnInsert: { userId } }, { upsert: true }),
    seedSystemCategories(),
  ]);
}
