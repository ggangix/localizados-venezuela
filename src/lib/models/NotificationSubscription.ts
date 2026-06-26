import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const NOTIFICATION_CHANNELS = ["email", "sms", "whatsapp"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationSubscriptionStatus = "pending" | "active" | "unsubscribed";

const notificationSubscriptionSchema = new Schema(
  {
    localizadoId: {
      type: Schema.Types.ObjectId,
      ref: "Localizado",
      required: true,
      index: true,
    },
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

notificationSubscriptionSchema.index(
  { localizadoId: 1, channel: 1, destinationHash: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "active"] } },
    name: "unique_active_subscription_target",
  }
);

export type NotificationSubscriptionDoc = InferSchemaType<
  typeof notificationSubscriptionSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const NotificationSubscription: Model<NotificationSubscriptionDoc> =
  mongoose.models.NotificationSubscription ??
  mongoose.model("NotificationSubscription", notificationSubscriptionSchema);
