import "server-only";
import { Types } from "mongoose";
import { UserPreferences } from "@/models/user-preferences";
import type { PreferencesDTO } from "@/types/dto";
import { toPreferencesDTO } from "./serialize";
import { compact } from "./compact";

/** Preferences for a user, created with defaults if missing. */
export async function getPreferences(userId: Types.ObjectId | string): Promise<PreferencesDTO> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const doc = await UserPreferences.findOneAndUpdate(
    { userId: userObjectId },
    { $setOnInsert: { userId: userObjectId } },
    { upsert: true, returnDocument: "after", lean: true }
  );
  return toPreferencesDTO(doc!);
}

export async function updatePreferences(
  userId: Types.ObjectId | string,
  data: Partial<Omit<PreferencesDTO, "currency">>
): Promise<PreferencesDTO> {
  const userObjectId = typeof userId === "string" ? new Types.ObjectId(userId) : userId;
  const payload = compact(data);

  const doc = await UserPreferences.findOneAndUpdate(
    { userId: userObjectId },
    { $set: payload },
    { returnDocument: "after", lean: true }
  );

  if (!doc) throw new Error("Preferences not found");
  return toPreferencesDTO(doc);
}
