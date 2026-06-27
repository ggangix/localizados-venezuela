/**
 * Importa datos desde seed/*.json (incluidos en el repo para desarrollo).
 *
 *   npm run seed              # dataset completo en seed/
 *   npm run seed -- --sample  # subset rápido en seed/sample/
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Lugar } from "../src/lib/models/Lugar";
import { Localizado } from "../src/lib/models/Localizado";
import { recordPublishedLocalizadoEvents } from "../src/lib/notifications";
import type { SeedLocalizado, SeedLugar } from "./lib/excel-seed";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/localizados_venezuela";

const FORCE_SAMPLE = process.argv.includes("--sample");
const BATCH_SIZE = 500;
const IMPORT_RUN_ID = `json-seed-${new Date().toISOString()}`;

function log(msg: string) {
  console.log(`[seed] ${msg}`);
}

function resolveSeedDir(): { dir: string; label: string } {
  const fullDir = path.join(process.cwd(), "seed");
  const sampleDir = path.join(fullDir, "sample");
  const fullOk =
    fs.existsSync(path.join(fullDir, "lugares.json")) &&
    fs.existsSync(path.join(fullDir, "localizados.json"));

  if (FORCE_SAMPLE) return { dir: sampleDir, label: "sample" };
  if (fullOk) return { dir: fullDir, label: "completo" };
  if (
    fs.existsSync(path.join(sampleDir, "lugares.json")) &&
    fs.existsSync(path.join(sampleDir, "localizados.json"))
  ) {
    log("⚠ seed/lugares.json no encontrado — usando seed/sample/");
    log("  Para dataset completo: npm run seed:export && git add seed/");
    return { dir: sampleDir, label: "sample (fallback)" };
  }
  throw new Error(
    "No hay seed JSON. Ejecuta npm run seed:export o usa npm run seed:sample"
  );
}

async function main() {
  const { dir, label } = resolveSeedDir();
  const lugaresPath = path.join(dir, "lugares.json");
  const localizadosPath = path.join(dir, "localizados.json");

  const lugares = JSON.parse(fs.readFileSync(lugaresPath, "utf8")) as SeedLugar[];
  const localizados = JSON.parse(
    fs.readFileSync(localizadosPath, "utf8")
  ) as SeedLocalizado[];

  log(`${label}: ${lugares.length} lugares, ${localizados.length} localizados`);

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });

  const slugToId = new Map<string, mongoose.Types.ObjectId>();

  for (const lugar of lugares) {
    const doc = await Lugar.findOneAndUpdate(
      { slug: lugar.slug },
      { $set: lugar },
      { upsert: true, new: true }
    );
    slugToId.set(lugar.slug, doc._id);
  }
  log(`${lugares.length} lugares upserted`);

  const existing = await Localizado.find({ estado: "published" })
    .select("lugarId nombreNormalizado")
    .lean();
  const seen = new Set(
    existing.map((r) => `${String(r.lugarId)}:${r.nombreNormalizado}`)
  );

  let inserted = 0;
  let skipped = 0;
  let batch: Record<string, unknown>[] = [];

  for (const row of localizados) {
    const lugarId = slugToId.get(row.lugarSlug);
    if (!lugarId) {
      log(`⚠ lugarSlug desconocido: ${row.lugarSlug}`);
      continue;
    }

    const key = `${String(lugarId)}:${row.nombreNormalizado}`;
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);

    batch.push({
      slug: row.slug,
      nombreCompleto: row.nombreCompleto,
      nombreNormalizado: row.nombreNormalizado,
      edad: row.edad,
      cedula: row.cedula,
      telefono: row.telefono,
      direccion: row.direccion,
      observaciones: row.observaciones,
      condicion: row.condicion,
      lugarId,
      fuente: row.fuente,
      estado: "published",
    });
    inserted++;

    if (batch.length >= BATCH_SIZE) {
      const docs = await Localizado.insertMany(batch, { ordered: false });
      await recordPublishedLocalizadoEvents(docs, {
        source: "json_seed",
        importRunId: IMPORT_RUN_ID,
        notifySavedSearches: false,
      });
      batch = [];
    }
  }

  if (batch.length > 0) {
    const docs = await Localizado.insertMany(batch, { ordered: false });
    await recordPublishedLocalizadoEvents(docs, {
      source: "json_seed",
      importRunId: IMPORT_RUN_ID,
      notifySavedSearches: false,
    });
  }

  log(`Insertados: ${inserted} | Omitidos: ${skipped}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  void mongoose.disconnect().finally(() => process.exit(1));
});
