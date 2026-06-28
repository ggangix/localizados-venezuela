import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

const adminSessionSchema = new Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 },
  },
  { timestamps: false }
);

export type AdminSessionDoc = InferSchemaType<typeof adminSessionSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AdminSession: Model<AdminSessionDoc> =
  mongoose.models.AdminSession ?? mongoose.model("AdminSession", adminSessionSchema);
