import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

const rateLimitSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: false }
);

export type RateLimitDoc = InferSchemaType<typeof rateLimitSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RateLimit: Model<RateLimitDoc> =
  mongoose.models.RateLimit ?? mongoose.model("RateLimit", rateLimitSchema);
