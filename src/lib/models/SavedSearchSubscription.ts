import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import {
  NOTIFICATION_CHANNELS,
  type NotificationSubscriptionStatus,
} from "@/lib/models/NotificationSubscription";

const savedSearchSubscriptionSchema = new Schema(
  {
    queryName: { type: String, required: true },
    queryNameNormalized: { type: String, required: true, index: true },
    cedulaHash: { type: String, index: true },
    age: String,
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNELS,
      required: true,
      index: true,
    },
    destination: { type: String, required: true },
    destinationHash: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "unsubscribed",
      ] satisfies NotificationSubscriptionStatus[],
      default: "pending",
      index: true,
    },
    consentedAt: { type: Date, required: true },
    confirmedAt: Date,
    unsubscribedAt: Date,
    confirmationTokenHash: { type: String, required: true, index: true },
    ipHash: String,
  },
  { timestamps: true }
);

savedSearchSubscriptionSchema.index({
  status: 1,
  queryNameNormalized: 1,
  cedulaHash: 1,
});

savedSearchSubscriptionSchema.index(
  { channel: 1, destinationHash: 1, queryNameNormalized: 1, cedulaHash: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "active"] } },
    name: "unique_active_saved_search_target",
  }
);

export type SavedSearchSubscriptionDoc = InferSchemaType<
  typeof savedSearchSubscriptionSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const SavedSearchSubscription: Model<SavedSearchSubscriptionDoc> =
  mongoose.models.SavedSearchSubscription ??
  mongoose.model("SavedSearchSubscription", savedSearchSubscriptionSchema);
