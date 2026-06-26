import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { NOTIFICATION_CHANNELS } from "@/lib/models/NotificationSubscription";

export type NotificationDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

const notificationDeliverySchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "LocalizadoChangeEvent",
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "NotificationSubscription",
      index: true,
    },
    savedSearchSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "SavedSearchSubscription",
      index: true,
    },
    channel: {
      type: String,
      enum: NOTIFICATION_CHANNELS,
      required: true,
      index: true,
    },
    destinationHash: { type: String, required: true, index: true },
    kind: {
      type: String,
      enum: ["confirmation", "event"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "sent",
        "failed",
        "skipped",
      ] satisfies NotificationDeliveryStatus[],
      default: "pending",
      index: true,
    },
    provider: String,
    providerMessageId: String,
    error: String,
    sentAt: Date,
    payload: {
      subject: String,
      text: String,
      url: String,
      unsubscribeUrl: String,
    },
  },
  { timestamps: true }
);

notificationDeliverySchema.index({ subscriptionId: 1, createdAt: -1 });
notificationDeliverySchema.index({ savedSearchSubscriptionId: 1, createdAt: -1 });

export type NotificationDeliveryDoc = InferSchemaType<
  typeof notificationDeliverySchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const NotificationDelivery: Model<NotificationDeliveryDoc> =
  mongoose.models.NotificationDelivery ??
  mongoose.model("NotificationDelivery", notificationDeliverySchema);
