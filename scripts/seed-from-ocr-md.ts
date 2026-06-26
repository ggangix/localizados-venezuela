/**
 * Importa listas OCR desde archivos .md (repo OCR-data_Terremoto_Venezuela_*).
 * Idempotente: reutiliza lugares existentes y omite personas duplicadas
 * (lugarId + nombreNormalizado).
 *
 * Uso:
 *   npm run seed:ocr
 *   npm run seed:ocr -- --dry-run
 *   npm run seed:ocr -- --path ../OCR-data_Terremoto_Venezuela_24062026
 *   MONGODB_URI=mongodb://127.0.0.1:27017/localizados_venezuela npm run seed:ocr
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { Lugar } from "../src/lib/models/Lugar";
import { Localizado, normalizeNombre } from "../src/lib/models/Localizado";
import { recordPublishedLocalizadoEvents } from "../src/lib/notifications";
import { makeSlug, makeUniqueSlug } from "../src/lib/slug";
import { parseMarkdownFile } from "./lib/ocr-md-parser";
import {
  findLugarByNombre,
  inferLugarTipo,
  resolveLugarNombre,
  type LugarRef,
} from "./lib/ocr-lugares";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/localizados_venezuela";

const CONNECT_TIMEOUT_MS = 15_000;
const BATCH_SIZE = 500;

const DRY_RUN = process.argv.includes("--dry-run");
const IMPORT_RUN_ID = `ocr-seed-${new Date().toISOString()}`;
const pathFlagIdx = process.argv.indexOf("--path");
const OCR_PATH = path.resolve(
  process.cwd(),
  pathFlagIdx >= 0 && process.argv[pathFlagIdx + 1]
    ? process.argv[pathFlagIdx + 1]
    : path.join("..", "OCR-data_Terremoto_Venezuela_24062026")
);

function log(msg: string) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}

function maskUri(uri: string) {
  return uri.replace(/:([^:@/]+)@/, ":***@");
}

function elapsed(start: number) {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

function findMdFiles(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdFiles(full, baseDir));
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      entry.name.toLowerCase() !== "readme.md"
    ) {
      results.push(path.relative(baseDir, full));
    }
  }
  return results.sort();
}

async function connectMongo() {
  log(`Conectando a MongoDB (${maskUri(MONGODB_URI)})…`);
  mongoose.set("strictQuery", true);
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
    connectTimeoutMS: CONNECT_TIMEOUT_MS,
  });
}

async function loadLugares(): Promise<LugarRef[]> {
  return Lugar.find().select("slug nombre tipo _id").lean() as Promise<LugarRef[]>;
}

async function loadExistingKeys(): Promise<Set<string>> {
  const rows = await Localizado.find({ estado: "published" })
    .select("nombreNormalizado lugarId")
    .lean();
  return new Set(rows.map((r) => `${String(r.lugarId)}:${r.nombreNormalizado}`));
}

type ResolveStats = { reused: number; created: number };

async function resolveLugar(
  nombre: string,
  lugares: LugarRef[],
  slugCache: Map<string, mongoose.Types.ObjectId>,
  resolvedByNombre: Map<string, mongoose.Types.ObjectId>,
  stats: ResolveStats
): Promise<mongoose.Types.ObjectId> {
  const prev = resolvedByNombre.get(nombre);
  if (prev) return prev;

  const slug = makeSlug(nombre);
  const cached = slugCache.get(slug);
  if (cached) {
    resolvedByNombre.set(nombre, cached);
    stats.reused++;
    return cached;
  }

  const existing = findLugarByNombre(lugares, nombre);
  if (existing) {
    slugCache.set(existing.slug, existing._id);
    slugCache.set(slug, existing._id);
    resolvedByNombre.set(nombre, existing._id);
    stats.reused++;
    return existing._id;
  }

  if (DRY_RUN) {
    const fakeId = new mongoose.Types.ObjectId();
    slugCache.set(slug, fakeId);
    resolvedByNombre.set(nombre, fakeId);
    stats.created++;
    return fakeId;
  }

  const doc = await Lugar.create({
    slug,
    nombre,
    tipo: inferLugarTipo(nombre),
  });

  lugares.push({
    _id: doc._id,
    slug: doc.slug,
    nombre: doc.nombre,
    tipo: doc.tipo,
  });
  slugCache.set(slug, doc._id);
  resolvedByNombre.set(nombre, doc._id);
  stats.created++;
  log(`  + Lugar nuevo: ${nombre}`);
  return doc._id;
}

async function flushBatch(batch: Record<string, unknown>[], label: string) {
  if (batch.length === 0) return;
  const started = Date.now();
  try {
    const res = await Localizado.insertMany(batch, { ordered: false });
    await recordPublishedLocalizadoEvents(res, {
      source: "ocr_seed",
      importRunId: IMPORT_RUN_ID,
      notifySavedSearches: false,
    });
    log(`  ↑ Lote ${label}: ${res.length} insertados (${elapsed(started)})`);
  } catch (err: unknown) {
    const bulk = err as { insertedDocs?: unknown[] };
    if (bulk.insertedDocs) {
      await recordPublishedLocalizadoEvents(
        bulk.insertedDocs as Parameters<typeof recordPublishedLocalizadoEvents>[0],
        {
          source: "ocr_seed",
          importRunId: IMPORT_RUN_ID,
          notifySavedSearches: false,
        }
      );
      const inserted = bulk.insertedDocs.length;
      const dupes = batch.length - inserted;
      log(
        `  ↑ Lote ${label}: ${inserted} insertados, ${dupes} duplicados ignorados (${elapsed(started)})`
      );
      return;
    }
    throw err;
  }
}

async function main() {
  const t0 = Date.now();
  log(`=== Seed OCR Markdown${DRY_RUN ? " (dry-run)" : ""} ===`);
  log(`Directorio OCR: ${OCR_PATH}`);

  if (!fs.existsSync(OCR_PATH)) {
    console.error("✗ Directorio OCR no encontrado:", OCR_PATH);
    process.exit(1);
  }

  const mdFiles = findMdFiles(OCR_PATH, OCR_PATH);
  log(`${mdFiles.length} archivo(s) .md encontrado(s)`);

  if (mdFiles.length === 0) {
    console.error("✗ No hay archivos .md para importar");
    process.exit(1);
  }

  await connectMongo();

  const lugares = await loadLugares();
  log(`${lugares.length} lugares en BD`);
  const existingKeys = await loadExistingKeys();
  log(`${existingKeys.size} registros publicados (claves de dedupe)`);

  const slugCache = new Map<string, mongoose.Types.ObjectId>();
  const resolvedByNombre = new Map<string, mongoose.Types.ObjectId>();
  for (const l of lugares) slugCache.set(l.slug, l._id);

  const lugarStats: ResolveStats = { reused: 0, created: 0 };
  let filesProcessed = 0;
  let tablesFound = 0;
  let rowsParsed = 0;
  let rowsSkippedParse = 0;
  let inserted = 0;
  let skippedDupes = 0;
  let batch: Record<string, unknown>[] = [];
  let batchNum = 0;

  for (const rel of mdFiles) {
    const lugarNombre = resolveLugarNombre(rel);
    if (!lugarNombre) {
      log(`⚠ Sin mapeo de lugar para: ${rel} — omitido`);
      continue;
    }

    const content = fs.readFileSync(path.join(OCR_PATH, rel), "utf8");
    const parsed = parseMarkdownFile(content, rel.replace(/\\/g, "/"), lugarNombre);

    filesProcessed++;
    tablesFound += parsed.tablesFound;
    rowsParsed += parsed.rows.length;
    rowsSkippedParse += parsed.rowsSkipped;

    log(
      `--- ${parsed.relativePath} → ${lugarNombre} (${parsed.rows.length} filas, ${parsed.tablesFound} tablas) ---`
    );

    const lugarId = await resolveLugar(
      lugarNombre,
      lugares,
      slugCache,
      resolvedByNombre,
      lugarStats
    );

    for (const row of parsed.rows) {
      const nombreNormalizado = normalizeNombre(row.nombre);
      const dedupeKey = `${String(lugarId)}:${nombreNormalizado}`;

      if (existingKeys.has(dedupeKey)) {
        skippedDupes++;
        continue;
      }
      existingKeys.add(dedupeKey);

      const doc = {
        slug: makeUniqueSlug(row.nombre, row.cedula),
        nombreCompleto: row.nombre,
        nombreNormalizado,
        edad: row.edad,
        cedula: row.cedula,
        direccion: row.direccion,
        observaciones: row.observaciones,
        condicion: row.condicion,
        lugarId,
        fuente: {
          tipo: "ocr" as const,
          nombre: parsed.relativePath,
          url: parsed.url,
          fecha: parsed.fecha,
        },
        estado: "published" as const,
      };

      if (DRY_RUN) {
        inserted++;
        continue;
      }

      batch.push(doc);
      inserted++;

      if (batch.length >= BATCH_SIZE) {
        batchNum++;
        await flushBatch(batch, `#${batchNum}`);
        batch = [];
      }
    }
  }

  if (!DRY_RUN && batch.length > 0) {
    batchNum++;
    await flushBatch(batch, `#${batchNum} (final)`);
  }

  const totalLugares = DRY_RUN
    ? lugares.length + lugarStats.created
    : await Lugar.countDocuments();
  const totalPublicados = DRY_RUN
    ? existingKeys.size
    : await Localizado.countDocuments({ estado: "published" });

  log("");
  log("=== Resumen OCR ===");
  log(`Archivos procesados:       ${filesProcessed}`);
  log(`Tablas encontradas:        ${tablesFound}`);
  log(`Filas parseadas:           ${rowsParsed}`);
  log(`Filas omitidas (parseo):   ${rowsSkippedParse}`);
  log(`Insertados${DRY_RUN ? " (simulados)" : ""}:            ${inserted}`);
  log(`Omitidos (duplicados):     ${skippedDupes}`);
  log(`Lugares reutilizados:      ${lugarStats.reused}`);
  log(`Lugares nuevos:            ${lugarStats.created}`);
  log(`Total lugares en BD:       ${totalLugares}`);
  log(`Total publicados en BD:    ${totalPublicados}`);
  log(`Tiempo total:              ${elapsed(t0)}`);

  await mongoose.disconnect();
  log("Listo.");
}

main().catch((err) => {
  console.error("\n✗ Seed OCR falló:");
  console.error(err);
  void mongoose.disconnect().finally(() => process.exit(1));
});
