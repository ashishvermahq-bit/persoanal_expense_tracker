import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Single-use password reset tokens. Only a SHA-256 of the token is stored, so a
 * database leak can't be replayed into resets. A TTL index deletes expired rows.
 */
export interface IPasswordResetToken {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

const passwordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetToken: Model<IPasswordResetToken> =
  (models.PasswordResetToken as Model<IPasswordResetToken>) ?? model<IPasswordResetToken>("PasswordResetToken", passwordResetTokenSchema);
