import { Schema, model, models, type Model } from "mongoose";
import type { ISplitEntry, ISplitGroup, ISplitParticipant, ISplitShare } from "@/types/models";

const participantSchema = new Schema<ISplitParticipant>({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, trim: true, lowercase: true },
  isOwner: { type: Boolean, default: false },
});

const splitGroupSchema = new Schema<ISplitGroup>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    participants: {
      type: [participantSchema],
      validate: [(v: ISplitParticipant[]) => v.length >= 2 && v.length <= 30, "2–30 participants"],
    },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

splitGroupSchema.index({ userId: 1, isArchived: 1 });

const shareSchema = new Schema<ISplitShare>(
  {
    participantId: { type: Schema.Types.ObjectId, required: true },
    amountPaise: { type: Number, required: true, min: 0, validate: [Number.isInteger, "integer paise"] },
  },
  { _id: false }
);

const splitEntrySchema = new Schema<ISplitEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "SplitGroup", required: true },
    expenseId: { type: Schema.Types.ObjectId, ref: "Expense", default: null },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    amountPaise: { type: Number, required: true, min: 1, validate: [Number.isInteger, "integer paise"] },
    paidBy: { type: Schema.Types.ObjectId, required: true },
    shares: { type: [shareSchema], default: [] },
    date: { type: Date, required: true },
    isSettlement: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Shares must add up to the amount exactly (paise arithmetic makes this checkable).
splitEntrySchema.pre("validate", function () {
  const total = this.shares.reduce((s, x) => s + x.amountPaise, 0);
  if (total !== this.amountPaise) {
    throw new Error(`Shares total ${total} paise but entry amount is ${this.amountPaise} paise`);
  }
});

splitEntrySchema.index({ userId: 1, groupId: 1, date: -1 });

export const SplitGroup: Model<ISplitGroup> =
  (models.SplitGroup as Model<ISplitGroup>) ?? model<ISplitGroup>("SplitGroup", splitGroupSchema);

export const SplitEntry: Model<ISplitEntry> =
  (models.SplitEntry as Model<ISplitEntry>) ?? model<ISplitEntry>("SplitEntry", splitEntrySchema);
