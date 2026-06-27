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
      enum: ["active", "unsubscribed"] satisfies NotificationSubscriptionStatus[],
      default: "active",
      index: true,
    },
    consentedAt: { type: Date, required: true },
    unsubscribedAt: Date,
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
    partialFilterExpression: { status: "active" },
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
