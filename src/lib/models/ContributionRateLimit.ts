import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const contributionRateLimitSchema = new Schema(
  {
    key: { type: String, required: true, index: true },
    windowStart: { type: Date, required: true },
    resetAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    count: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

contributionRateLimitSchema.index(
  { key: 1, windowStart: 1 },
  { unique: true, name: "contribution_rate_limit_bucket" }
);

export type ContributionRateLimitDoc = InferSchemaType<
  typeof contributionRateLimitSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const ContributionRateLimit: Model<ContributionRateLimitDoc> =
  mongoose.models.ContributionRateLimit ??
  mongoose.model("ContributionRateLimit", contributionRateLimitSchema);
