/**
 * Importa el Excel consolidado de hospitales como datos iniciales publicados.
 *
 * Uso:
 *   npm run seed
 *   MONGODB_URI=mongodb://127.0.0.1:27017/localizados_venezuela npm run seed
 *   npm run seed -- ../localizados-venezuela-docs/archivo.xlsx
 */
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import * as XLSX from "xlsx";
import { Lugar } from "../src/lib/models/Lugar";
import { Localizado, normalizeNombre } from "../src/lib/models/Localizado";
import { makeSlug, makeUniqueSlug } from "../src/lib/slug";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/localizados_venezuela";

const CONNECT_TIMEOUT_MS = 15_000;
const BATCH_SIZE = 500;
const PROGRESS_EVERY = 100;

const FUENTE = {
  tipo: "excel" as const,
  nombre: "25JUN26 11PM Pacientes Consolidados Hospitales Venezuela.xlsx",
  fecha: "25JUN26 23:30 (Venezuela)",
  notas: "Registro maestro consolidado — sismo Venezuela 2026",
};

const HEADER_MAP: Record<string, string> = {
  "apellidos y nombres": "nombre",
  edad: "edad",
  "cedula / id": "cedula",
  "cédula / id": "cedula",
  telefono: "telefono",
  teléfono: "telefono",
  direccion: "direccion",
  dirección: "direccion",
  observaciones: "observaciones",
  hospital: "hospital",
};

type Row = {
  nombre: string;
  edad?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  observaciones?: string;
  hospital?: string;
};

function log(msg: string) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}

function maskUri(uri: string): string {
  return uri.replace(/:([^:@/]+)@/, ":***@");
}

function elapsed(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

function detectCondicion(obs?: string): "vivo" | "fallecido" | "desconocido" {
  if (!obs) return "desconocido";
  const lower = obs.toLowerCase();
  if (lower.includes("fallec")) return "fallecido";
  return "desconocido";
}

function resolveField(header: string): string | null {
  const norm = header.trim().toLowerCase();
  if (HEADER_MAP[norm]) return HEADER_MAP[norm];
  if (norm.includes("apellido") && norm.includes("nombre")) return "nombre";
  if (norm.includes("cedula") || norm.includes("cédula")) return "cedula";
  if (norm.includes("telefono") || norm.includes("teléfono")) return "telefono";
  if (norm.includes("direccion") || norm.includes("dirección")) return "direccion";
  if (norm.includes("observacion")) return "observaciones";
  if (norm === "hospital") return "hospital";
  if (norm === "edad") return "edad";
  return null;
}

function mapHeaders(row: Record<string, unknown>): Row | null {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const field = resolveField(key);
    if (field && value != null && String(value).trim()) {
      mapped[field] = String(value).trim();
    }
  }
  if (!mapped.nombre) return null;
  return mapped as Row;
}

/** El Excel tiene fila 1 = título; encabezados reales en fila 2+. */
function sheetToRows(
  sheet: XLSX.WorkSheet,
  sheetName: string
): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  if (matrix.length === 0) {
    log(`  ⚠ Hoja «${sheetName}»: vacía`);
    return [];
  }

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(matrix.length, 15); i++) {
    const cells = (matrix[i] ?? []).map((c) => String(c).trim().toLowerCase());
    if (cells.some((c) => c.includes("apellido") && c.includes("nombre"))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    log(`  ⚠ Hoja «${sheetName}»: sin fila de encabezados reconocida`);
    log(`    Primera fila: ${JSON.stringify(matrix[0]?.slice(0, 6))}`);
    return [];
  }

  const headers = (matrix[headerRowIndex] as unknown[]).map((h) => String(h).trim());
  log(
    `  Encabezados (fila ${headerRowIndex + 1}): ${headers.filter(Boolean).join(" | ")}`
  );

  const rows: Record<string, unknown>[] = [];
  for (let i = headerRowIndex + 1; i < matrix.length; i++) {
    const line = matrix[i] as unknown[];
    if (!line?.length || line.every((c) => !String(c).trim())) continue;

    const obj: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      if (header) obj[header] = line[idx] ?? "";
    });
    rows.push(obj);
  }

  return rows;
}

function parseSheet(
  sheet: XLSX.WorkSheet,
  defaultLugar: string
): { lugar: string; rows: Row[] }[] {
  const raw = sheetToRows(sheet, defaultLugar);
  if (raw.length === 0) return [];

  const firstKeys = Object.keys(raw[0] ?? {}).map((k) => k.toLowerCase());
  const isHospitalColumn = firstKeys.some((k) => k.includes("hospital"));

  if (isHospitalColumn) {
    const byLugar = new Map<string, Row[]>();
    for (const row of raw) {
      const mapped = mapHeaders(row);
      if (!mapped) continue;
      const lugar = mapped.hospital || defaultLugar;
      const { hospital: _h, ...rest } = mapped;
      const list = byLugar.get(lugar) ?? [];
      list.push(rest);
      byLugar.set(lugar, list);
    }
    return [...byLugar.entries()].map(([lugar, rows]) => ({ lugar, rows }));
  }

  const rows: Row[] = [];
  for (const row of raw) {
    const mapped = mapHeaders(row);
    if (mapped) rows.push(mapped);
  }
  return [{ lugar: defaultLugar, rows }];
}

async function connectMongo(): Promise<void> {
  log(`Conectando a MongoDB (${maskUri(MONGODB_URI)})…`);
  log(`Timeout de conexión: ${CONNECT_TIMEOUT_MS / 1000}s`);

  const started = Date.now();
  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: CONNECT_TIMEOUT_MS,
      connectTimeoutMS: CONNECT_TIMEOUT_MS,
    });
    log(`Conectado a MongoDB en ${elapsed(started)}`);
  } catch (err) {
    console.error("\n✗ No se pudo conectar a MongoDB.");
    console.error("  URI:", maskUri(MONGODB_URI));
    console.error(
      "  Si corres el seed desde tu PC, prueba:\n" +
        "    MONGODB_URI=mongodb://127.0.0.1:27017/localizados_venezuela npm run seed\n" +
        "  Desde el contenedor Docker:\n" +
        "    MONGODB_URI=mongodb://gg:***@mongo:27017/localizados_venezuela?authSource=admin npm run seed"
    );
    throw err;
  }
}

async function preloadLugarCache(
  cache: Map<string, mongoose.Types.ObjectId>
): Promise<void> {
  const started = Date.now();
  const rows = await Lugar.find().select("slug _id").lean();
  for (const row of rows) cache.set(row.slug, row._id);
  log(`${rows.length} lugares precargados (${elapsed(started)})`);
}

async function loadExistingKeys(): Promise<Set<string>> {
  log("Cargando claves de deduplicación…");
  const started = Date.now();
  const rows = await Localizado.find({ estado: "published" })
    .select("nombreNormalizado lugarId")
    .lean();
  const keys = new Set(rows.map((r) => `${String(r.lugarId)}:${r.nombreNormalizado}`));
  log(`${keys.size} registros ya publicados (${elapsed(started)})`);
  return keys;
}

function pickSheets(sheetNames: string[]): string[] {
  const buscar = sheetNames.find((n) => /buscar/i.test(n));
  if (buscar) {
    log(
      `Hoja consolidada «${buscar}» detectada — omitiendo hojas por hospital (evita duplicar ~2× trabajo)`
    );
    return [buscar];
  }
  return sheetNames.filter((n) => !/buscar/i.test(n));
}

async function ensureLugar(
  nombre: string,
  cache: Map<string, mongoose.Types.ObjectId>
): Promise<mongoose.Types.ObjectId> {
  const slug = makeSlug(nombre);
  const cached = cache.get(slug);
  if (cached) return cached;

  let lugar = await Lugar.findOne({ slug });
  if (!lugar) {
    const tipo = /hospital|clinica|clínica|cruz roja|seguro social/i.test(nombre)
      ? "hospital"
      : "recinto";
    lugar = await Lugar.create({ slug, nombre, tipo });
    log(`  + Lugar nuevo: ${nombre} (${tipo})`);
  }
  cache.set(slug, lugar._id);
  return lugar._id;
}

async function flushBatch(batch: Record<string, unknown>[], label: string) {
  if (batch.length === 0) return;
  const started = Date.now();
  try {
    const res = await Localizado.insertMany(batch, { ordered: false });
    log(`  ↑ Lote ${label}: ${res.length} insertados (${elapsed(started)})`);
  } catch (err: unknown) {
    const bulk = err as { insertedDocs?: unknown[]; writeErrors?: unknown[] };
    if (bulk.insertedDocs) {
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
  log("=== Seed localizados-venezuela ===");

  const fileArg =
    process.argv[2] ??
    path.join(
      "..",
      "localizados-venezuela-docs",
      "25JUN26 11PM Pacientes Consolidados Hospitales Venezuela.xlsx"
    );
  const filePath = path.resolve(process.cwd(), fileArg);

  log(`Directorio de trabajo: ${process.cwd()}`);
  log(`Archivo Excel: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error("✗ Archivo no encontrado:", filePath);
    process.exit(1);
  }

  const fileSizeMb = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
  log(`Tamaño del archivo: ${fileSizeMb} MB`);

  await connectMongo();

  log("Leyendo Excel…");
  const readStarted = Date.now();
  const wb = XLSX.readFile(filePath);
  log(
    `${wb.SheetNames.length} hojas leídas en ${elapsed(readStarted)}: ${wb.SheetNames.join(", ")}`
  );

  const lugarCache = new Map<string, mongoose.Types.ObjectId>();
  await preloadLugarCache(lugarCache);
  const existingKeys = await loadExistingKeys();

  const sheetsToProcess = pickSheets(wb.SheetNames);
  log(`Procesando ${sheetsToProcess.length} hoja(s)`);

  let total = 0;
  let skipped = 0;
  let batch: Record<string, unknown>[] = [];
  let batchNum = 0;

  for (const sheetName of sheetsToProcess) {
    const sheetStarted = Date.now();
    log(`--- Hoja «${sheetName}» ---`);
    const groups = parseSheet(wb.Sheets[sheetName], sheetName);
    const rowCount = groups.reduce((n, g) => n + g.rows.length, 0);
    log(`  → ${groups.length} lugar(es), ${rowCount} fila(s) válida(s)`);

    if (rowCount === 0) {
      log(`  ⚠ Sin datos importables en esta hoja`);
      continue;
    }

    for (const group of groups) {
      if (group.rows.length === 0) continue;

      const lugarId = await ensureLugar(group.lugar, lugarCache);
      let processed = 0;

      for (const row of group.rows) {
        processed++;
        const nombreNormalizado = normalizeNombre(row.nombre);
        const dedupeKey = `${String(lugarId)}:${nombreNormalizado}`;

        if (existingKeys.has(dedupeKey)) {
          skipped++;
          if (processed % PROGRESS_EVERY === 0) {
            log(
              `  … ${group.lugar}: ${processed}/${group.rows.length} (${skipped} omitidos hasta ahora)`
            );
          }
          continue;
        }

        existingKeys.add(dedupeKey);
        batch.push({
          slug: makeUniqueSlug(row.nombre, row.cedula),
          nombreCompleto: row.nombre,
          nombreNormalizado,
          edad: row.edad,
          cedula: row.cedula,
          telefono: row.telefono,
          direccion: row.direccion,
          observaciones: row.observaciones,
          condicion: detectCondicion(row.observaciones),
          lugarId,
          fuente: FUENTE,
          estado: "published",
        });
        total++;

        if (batch.length >= BATCH_SIZE) {
          batchNum++;
          await flushBatch(batch, `#${batchNum}`);
          batch = [];
        }

        if (processed % PROGRESS_EVERY === 0) {
          log(
            `  … ${group.lugar}: ${processed}/${group.rows.length} (${total} nuevos, ${skipped} omitidos)`
          );
        }
      }

      log(
        `  ✓ ${group.lugar}: ${group.rows.length} filas procesadas (${elapsed(sheetStarted)})`
      );
    }
  }

  if (batch.length > 0) {
    batchNum++;
    await flushBatch(batch, `#${batchNum} (final)`);
  }

  const lugares = await Lugar.countDocuments();
  const publicados = await Localizado.countDocuments({ estado: "published" });

  log("");
  log("=== Resumen ===");
  log(`Importados en esta corrida: ${total}`);
  log(`Omitidos (duplicados):     ${skipped}`);
  log(`Total lugares en BD:       ${lugares}`);
  log(`Total publicados en BD:    ${publicados}`);
  log(`Tiempo total:              ${elapsed(t0)}`);

  log("Desconectando…");
  await mongoose.disconnect();
  log("Listo.");
}

main().catch((err) => {
  console.error("\n✗ Seed falló:");
  console.error(err);
  void mongoose.disconnect().finally(() => process.exit(1));
});
