import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { ContribucionTipo, EstadoPublicacion } from "@/lib/types";

const contribucionSchema = new Schema(
  {
    tipo: {
      type: String,
      enum: ["persona", "lista_imagen"] satisfies ContribucionTipo[],
      required: true,
    },
    estado: {
      type: String,
      enum: ["pending", "published", "rejected"] satisfies EstadoPublicacion[],
      default: "pending",
      index: true,
    },
    // Datos de persona suelta (fase 1: se guardan, no se publican)
    persona: {
      nombreCompleto: String,
      edad: String,
      cedula: String,
      telefono: String,
      direccion: String,
      observaciones: String,
      lugarNombre: String,
      lugarSlug: String,
    },
    // Lista/imagen
    fuenteNombre: { type: String, required: true },
    fuenteUrl: String,
    fuenteNotas: String,
    imagenPath: String,
    imagenNombreOriginal: String,
    contacto: String,
    ipHash: String,
    moderadoEn: Date,
    moderadoPor: String,
    notasModeracion: String,
  },
  { timestamps: true }
);

export type ContribucionDoc = InferSchemaType<typeof contribucionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Contribucion: Model<ContribucionDoc> =
  mongoose.models.Contribucion ?? mongoose.model("Contribucion", contribucionSchema);
