import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type LocalizadoChangeEventType =
  | "published"
  | "updated"
  | "rejected"
  | "soft_deleted"
  | "restored"
  | "moved";

export type LocalizadoChangeSource =
  | "admin"
  | "contribution"
  | "ocr_upload"
  | "excel_import"
  | "json_seed"
  | "ocr_seed"
  | "merge_script"
  | "system";

const localizadoChangeEventSchema = new Schema(
  {
    entityType: {
      type: String,
      enum: ["localizado"],
      default: "localizado",
      required: true,
      index: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      ref: "Localizado",
      required: true,
      index: true,
    },
    slugSnapshot: { type: String, required: true, index: true },
    eventType: {
      type: String,
      enum: [
        "published",
        "updated",
        "rejected",
        "soft_deleted",
        "restored",
        "moved",
      ] satisfies LocalizadoChangeEventType[],
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: [
        "admin",
        "contribution",
        "ocr_upload",
        "excel_import",
        "json_seed",
        "ocr_seed",
        "merge_script",
        "system",
      ] satisfies LocalizadoChangeSource[],
      default: "admin",
      index: true,
    },
    actor: {
      type: { type: String, enum: ["admin", "script", "system"], default: "admin" },
      id: String,
    },
    requestId: String,
    importRunId: { type: String, index: true },
    contributionId: { type: Schema.Types.ObjectId, ref: "Contribucion", index: true },
    lugarIdBefore: { type: Schema.Types.ObjectId, ref: "Lugar" },
    lugarIdAfter: { type: Schema.Types.ObjectId, ref: "Lugar" },
    estadoBefore: String,
    estadoAfter: String,
    changedFields: [{ type: String }],
    notificationKey: { type: String, index: true },
    personSnapshot: {
      nombreCompleto: String,
      nombreNormalizado: String,
      slug: String,
      lugarId: { type: Schema.Types.ObjectId, ref: "Lugar" },
      estado: String,
      condicion: String,
      edad: String,
    },
    redactionVersion: { type: Number, default: 1 },
    schemaVersion: { type: Number, default: 1 },
    processedForNotificationsAt: Date,
    notificationStatus: {
      type: String,
      enum: ["pending", "processed", "skipped", "failed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

localizadoChangeEventSchema.index({ entityId: 1, createdAt: -1 });
localizadoChangeEventSchema.index({ createdAt: -1 });
localizadoChangeEventSchema.index({ notificationStatus: 1, createdAt: 1 });
localizadoChangeEventSchema.index({ notificationKey: 1, createdAt: -1 });
localizadoChangeEventSchema.index({ importRunId: 1, createdAt: 1 });

export type LocalizadoChangeEventDoc = InferSchemaType<
  typeof localizadoChangeEventSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const LocalizadoChangeEvent: Model<LocalizadoChangeEventDoc> =
  mongoose.models.LocalizadoChangeEvent ??
  mongoose.model("LocalizadoChangeEvent", localizadoChangeEventSchema);
