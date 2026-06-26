import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { CondicionPersona, EstadoPublicacion, FuenteTipo } from "@/lib/types";

const fuenteSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: ["excel", "contribucion", "ocr", "manual"] satisfies FuenteTipo[],
      required: true,
    },
    nombre: { type: String, required: true },
    url: String,
    notas: String,
    fecha: String,
  },
  { _id: false }
);

const localizadoSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    nombreCompleto: { type: String, required: true, index: true },
    nombreNormalizado: { type: String, required: true, index: true },
    edad: String,
    cedula: { type: String, index: true },
    telefono: String,
    direccion: String,
    observaciones: String,
    condicion: {
      type: String,
      enum: ["vivo", "fallecido", "desconocido"] satisfies CondicionPersona[],
      default: "desconocido",
    },
    lugarId: { type: Schema.Types.ObjectId, ref: "Lugar", required: true, index: true },
    fuente: { type: fuenteSchema, required: true },
    estado: {
      type: String,
      enum: ["published", "pending", "rejected"] satisfies EstadoPublicacion[],
      default: "published",
      index: true,
    },
    contribucionId: { type: Schema.Types.ObjectId, ref: "Contribucion" },
    deletedAt: { type: Date, index: true },
    deletedBy: String,
  },
  { timestamps: true }
);

localizadoSchema.index(
  { nombreCompleto: "text", cedula: "text", observaciones: "text" },
  {
    name: "localizado_text",
    default_language: "spanish",
    // El nombre pesa más que la cédula, y ambos más que las observaciones,
    // para que los aciertos por nombre suban primero al ordenar por textScore.
    weights: { nombreCompleto: 10, cedula: 5, observaciones: 1 },
  }
);

// Consultas frecuentes en runtime
localizadoSchema.index({ estado: 1, slug: 1 });
localizadoSchema.index({ estado: 1, lugarId: 1, nombreCompleto: 1 });
localizadoSchema.index({ estado: 1, cedula: 1 });

// Deduplicación en seed y moderación (solo publicados)
localizadoSchema.index(
  { lugarId: 1, nombreNormalizado: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: "published" },
    name: "dedupe_publicado",
  }
);

export type LocalizadoDoc = InferSchemaType<typeof localizadoSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Localizado: Model<LocalizadoDoc> =
  mongoose.models.Localizado ?? mongoose.model("Localizado", localizadoSchema);

export function normalizeNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}
