import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

// Eventos que un webhook puede recibir. Por ahora solo "localizado publicado".
export const WEBHOOK_EVENTS = ["localizado.published"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const webhookSchema = new Schema(
  {
    nombre: { type: String, required: true },
    url: { type: String, required: true },
    // Secreto opcional para firmar el cuerpo con HMAC-SHA256 (cabecera X-LV-Signature).
    secret: String,
    events: {
      type: [String],
      enum: WEBHOOK_EVENTS,
      default: ["localizado.published"],
    },
    active: { type: Boolean, default: true, index: true },
    createdBy: String,
    lastStatus: { type: String, enum: ["sent", "failed", null], default: null },
    lastError: String,
    lastDeliveryAt: Date,
  },
  { timestamps: true }
);

export type WebhookDoc = InferSchemaType<typeof webhookSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Webhook: Model<WebhookDoc> =
  mongoose.models.Webhook ?? mongoose.model("Webhook", webhookSchema);
