import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type WebhookDeliveryStatus = "pending" | "sent" | "failed";

const webhookDeliverySchema = new Schema(
  {
    // null cuando el destino viene del fallback por variable de entorno.
    webhookId: { type: Schema.Types.ObjectId, ref: "Webhook", index: true },
    targetLabel: { type: String, required: true }, // nombre del webhook o "env"
    event: { type: String, required: true, index: true },
    url: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"] satisfies WebhookDeliveryStatus[],
      default: "pending",
      index: true,
    },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    responseStatus: Number,
    error: String,
    // Cuerpo exacto enviado, para reintentar sin recalcular ni perder datos.
    requestBody: { type: String, required: true },
    nextRetryAt: { type: Date, index: true },
    sentAt: Date,
  },
  { timestamps: true }
);

webhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
webhookDeliverySchema.index({ status: 1, nextRetryAt: 1 });

export type WebhookDeliveryDoc = InferSchemaType<typeof webhookDeliverySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WebhookDelivery: Model<WebhookDeliveryDoc> =
  mongoose.models.WebhookDelivery ??
  mongoose.model("WebhookDelivery", webhookDeliverySchema);
