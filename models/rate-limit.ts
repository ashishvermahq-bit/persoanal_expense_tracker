import { Schema, model, models, type Model } from "mongoose";

/**
 * Fixed-window rate-limit counters. Works across serverless instances because
 * state lives in Mongo; a TTL index removes expired windows automatically.
 */
export interface IRateLimit {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

const rateLimitSchema = new Schema<IRateLimit>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0 },
    windowStart: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false, versionKey: false }
);

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimit: Model<IRateLimit> =
  (models.RateLimit as Model<IRateLimit>) ?? model<IRateLimit>("RateLimit", rateLimitSchema);
