import "server-only";
import type { Types } from "mongoose";
import { UserPreferences } from "@/models/user-preferences";
import type { PreferencesDTO } from "@/types/dto";
import { toPreferencesDTO } from "./serialize";

/** Preferences for a user, created with defaults if missing. */
export async function getPreferences(userId: Types.ObjectId): Promise<PreferencesDTO> {
  const doc = await UserPreferences.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, returnDocument: "after", lean: true }
  );
  return toPreferencesDTO(doc!);
}
