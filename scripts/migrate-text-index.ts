/**
 * Recrea el índice de texto `localizado_text` con pesos.
 *
 * MongoDB solo permite un índice de texto por colección y no altera sus
 * opciones in-place, así que hay que dropear el índice viejo y dejar que
 * Mongoose lo recree desde el schema (con los `weights` nuevos).
 *
 *   npm run migrate:text-index
 */
import mongoose from "mongoose";
import { Localizado } from "../src/lib/models/Localizado";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/localizados_venezuela";

function log(msg: string) {
  console.log(`[migrate:text-index] ${msg}`);
}

async function main() {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });

  const indexes = await Localizado.collection.indexes();
  const hasTextIndex = indexes.some((i) => i.name === "localizado_text");

  if (hasTextIndex) {
    await Localizado.collection.dropIndex("localizado_text");
    log("Índice `localizado_text` eliminado.");
  } else {
    log("No existía `localizado_text` (se creará desde el schema).");
  }

  // Recrea todos los índices definidos en el schema, incluido el de texto con pesos.
  await Localizado.syncIndexes();
  log("Índices sincronizados desde el schema.");

  const after = await Localizado.collection.indexes();
  const text = after.find((i) => i.name === "localizado_text");
  log(`Pesos actuales: ${JSON.stringify(text?.weights ?? {})}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  void mongoose.disconnect().finally(() => process.exit(1));
});
