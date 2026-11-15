import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Receipt files, stored in MongoDB (≤ 4 MB each, well under the 16 MB document
 * limit). Served only to their owner by GET /api/receipts/[file]: never from
 * public/, which anyone could fetch and which is read-only on serverless hosts.
 */
export interface IReceipt {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  contentType: string;
  size: number;
  data: Buffer;
  createdAt: Date;
}

const receiptSchema = new Schema<IReceipt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    contentType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Receipt: Model<IReceipt> = (models.Receipt as Model<IReceipt>) ?? model<IReceipt>("Receipt", receiptSchema);
