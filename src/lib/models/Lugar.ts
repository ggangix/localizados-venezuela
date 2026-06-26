import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { LugarTipo } from "@/lib/types";

const lugarSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    nombre: { type: String, required: true, index: true },
    tipo: {
      type: String,
      enum: ["hospital", "recinto", "direccion", "otro"] satisfies LugarTipo[],
      default: "hospital",
    },
    direccion: String,
    ciudad: String,
    estado: String,
    notas: String,
  },
  { timestamps: true }
);

export type LugarDoc = InferSchemaType<typeof lugarSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Lugar: Model<LugarDoc> =
  mongoose.models.Lugar ?? mongoose.model("Lugar", lugarSchema);
