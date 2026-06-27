import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Esta variante solo implementa notificaciones web push (PWA), gratuitas y sin
// servicio de correo. El array queda listo por si en el futuro se añaden canales.
export const NOTIFICATION_CHANNELS = ["webpush"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationSubscriptionStatus = "active" | "unsubscribed";

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
    // webpush: el destino es el JSON de la PushSubscription (endpoint + claves).
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

notificationSubscriptionSchema.index(
  { localizadoId: 1, channel: 1, destinationHash: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
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
