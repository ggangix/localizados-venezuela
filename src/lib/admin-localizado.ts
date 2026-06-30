import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { findLugarByNombre, inferLugarTipo } from "@/lib/lugar-utils";
import { Localizado, normalizeNombre } from "@/lib/models/Localizado";
import { Lugar } from "@/lib/models/Lugar";
import type { OcrRow } from "@/lib/ocr-parser";
import { makeSlug, makeUniqueSlug } from "@/lib/slug";
import type { CondicionPersona, EstadoPublicacion, FuenteInfo } from "@/lib/types";
import { dispatchLocalizadoPublished } from "@/lib/webhooks";

export type PersonaInput = {
  nombreCompleto: string;
  edad?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  observaciones?: string;
  condicion?: CondicionPersona;
  lugarId?: string;
  lugarNombre?: string;
  estado?: EstadoPublicacion;
  fuente?: FuenteInfo;
  contribucionId?: string;
};

export async function resolveLugarId(
  lugarId?: string,
  lugarNombre?: string
): Promise<mongoose.Types.ObjectId> {
  if (lugarId) {
    const found = await Lugar.findById(lugarId).select("_id");
    if (!found) throw new Error("Lugar no encontrado");
    return found._id;
  }

  const nombre = lugarNombre?.trim();
  if (!nombre) throw new Error("lugarId o lugarNombre requerido");

  const lugares = await Lugar.find().lean();
  const existing = findLugarByNombre(lugares, nombre);
  if (existing) return existing._id;

  const created = await Lugar.create({
    slug: makeSlug(nombre),
    nombre,
    tipo: inferLugarTipo(nombre),
  });
  return created._id;
}

export async function createLocalizado(input: PersonaInput) {
  await connectDB();
  const nombreCompleto = input.nombreCompleto.trim();
  if (!nombreCompleto) throw new Error("nombreCompleto requerido");

  const lugarId = await resolveLugarId(input.lugarId, input.lugarNombre);
  const estado = input.estado ?? "pending";

  if (estado === "published") {
    const dup = await Localizado.findOne({
      lugarId,
      nombreNormalizado: normalizeNombre(nombreCompleto),
      estado: "published",
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    });
    if (dup) throw new Error(`Ya existe publicado: ${nombreCompleto}`);
  }

  const doc = await Localizado.create({
    slug: makeUniqueSlug(nombreCompleto, input.cedula),
    nombreCompleto,
    nombreNormalizado: normalizeNombre(nombreCompleto),
    edad: input.edad?.trim() || undefined,
    cedula: input.cedula?.trim() || undefined,
    telefono: input.telefono?.trim() || undefined,
    direccion: input.direccion?.trim() || undefined,
    observaciones: input.observaciones?.trim() || undefined,
    condicion: input.condicion ?? "desconocido",
    lugarId,
    fuente: input.fuente ?? { tipo: "manual", nombre: "Panel admin" },
    estado,
    contribucionId: input.contribucionId
      ? new mongoose.Types.ObjectId(input.contribucionId)
      : undefined,
  });

  // Si nace publicado, avisa al sitio socio (no-op si el webhook no está configurado).
  dispatchLocalizadoPublished(doc);

  return doc;
}

export async function createLocalizadosFromOcr(
  rows: OcrRow[],
  opts: {
    lugarId?: string;
    lugarNombre?: string;
    estado?: EstadoPublicacion;
    fuente: FuenteInfo;
    contribucionId?: string;
  }
) {
  const created: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  for (const row of rows) {
    try {
      const doc = await createLocalizado({
        nombreCompleto: row.nombre,
        edad: row.edad,
        cedula: row.cedula,
        direccion: row.direccion,
        observaciones: row.observaciones,
        condicion: row.condicion,
        lugarId: opts.lugarId,
        lugarNombre: opts.lugarNombre,
        estado: opts.estado ?? "pending",
        fuente: opts.fuente,
        contribucionId: opts.contribucionId,
      });
      created.push(String(doc._id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      if (msg.startsWith("Ya existe")) skipped.push(row.nombre);
      else errors.push(`${row.nombre}: ${msg}`);
    }
  }

  return { created: created.length, skipped, errors };
}

export async function updateLocalizado(
  id: string,
  patch: Partial<PersonaInput> & { restore?: boolean }
) {
  await connectDB();
  const doc = await Localizado.findById(id);
  if (!doc) throw new Error("Persona no encontrada");

  if (patch.restore) {
    doc.deletedAt = undefined;
    doc.deletedBy = undefined;
  }

  if (patch.nombreCompleto) {
    doc.nombreCompleto = patch.nombreCompleto.trim();
    doc.nombreNormalizado = normalizeNombre(doc.nombreCompleto);
  }
  if (patch.edad !== undefined) doc.edad = patch.edad.trim() || undefined;
  if (patch.cedula !== undefined) doc.cedula = patch.cedula.trim() || undefined;
  if (patch.telefono !== undefined) doc.telefono = patch.telefono.trim() || undefined;
  if (patch.direccion !== undefined)
    doc.direccion = patch.direccion.trim() || undefined;
  if (patch.observaciones !== undefined) {
    doc.observaciones = patch.observaciones.trim() || undefined;
  }
  if (patch.condicion) doc.condicion = patch.condicion;
  if (patch.estado) doc.estado = patch.estado;

  if (patch.lugarId || patch.lugarNombre) {
    doc.lugarId = await resolveLugarId(patch.lugarId, patch.lugarNombre);
  }

  if (doc.estado === "published" && !doc.deletedAt) {
    const dup = await Localizado.findOne({
      _id: { $ne: doc._id },
      lugarId: doc.lugarId,
      nombreNormalizado: doc.nombreNormalizado,
      estado: "published",
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    });
    if (dup)
      throw new Error(
        "Conflicto: ya existe otra persona publicada con ese nombre en el lugar"
      );
  }

  await doc.save();

  // Publicar (incluye la acción masiva "publish" y aprobar contribución) avisa al socio.
  if (patch.estado === "published") dispatchLocalizadoPublished(doc);

  return doc;
}

export async function softDeleteLocalizados(ids: string[], by = "admin") {
  await connectDB();
  const result = await Localizado.updateMany(
    { _id: { $in: ids } },
    { $set: { deletedAt: new Date(), deletedBy: by } }
  );
  return result.modifiedCount;
}

export async function restoreLocalizados(ids: string[]) {
  await connectDB();
  const result = await Localizado.updateMany(
    { _id: { $in: ids } },
    { $unset: { deletedAt: "", deletedBy: "" } }
  );
  return result.modifiedCount;
}

export type BulkActionResult = { id: string; ok: boolean; error?: string };

/**
 * Cambia el estado de varios localizados en una sola operación `bulkWrite`,
 * devolviendo un reporte granular por registro. Valida duplicados publicados
 * (incluyendo duplicados dentro de la misma selección) antes de escribir.
 */
export async function setEstadoLocalizados(
  ids: string[],
  estado: EstadoPublicacion
): Promise<{ results: BulkActionResult[]; affected: number; total: number }> {
  await connectDB();

  const docs = await Localizado.find({ _id: { $in: ids } });
  const byId = new Map(docs.map((doc) => [String(doc._id), doc]));

  const results: BulkActionResult[] = [];
  const ops: Parameters<typeof Localizado.bulkWrite>[0] = [];
  const seenPublished = new Set<string>();

  for (const id of ids) {
    const doc = byId.get(id);
    if (!doc) {
      results.push({ id, ok: false, error: "Persona no encontrada" });
      continue;
    }

    if (estado === "published" && !doc.deletedAt) {
      const key = `${doc.lugarId}|${doc.nombreNormalizado}`;
      if (seenPublished.has(key)) {
        results.push({ id, ok: false, error: "Duplicado dentro de la selección" });
        continue;
      }
      const dup = await Localizado.findOne({
        _id: { $ne: doc._id },
        lugarId: doc.lugarId,
        nombreNormalizado: doc.nombreNormalizado,
        estado: "published",
        $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
      });
      if (dup) {
        results.push({
          id,
          ok: false,
          error:
            "Conflicto: ya existe otra persona publicada con ese nombre en el lugar",
        });
        continue;
      }
      seenPublished.add(key);
    }

    ops.push({
      updateOne: { filter: { _id: doc._id }, update: { $set: { estado } } },
    });
    results.push({ id, ok: true });
  }

  if (ops.length) {
    await Localizado.bulkWrite(ops);
  }

  const affected = results.filter((r) => r.ok).length;
  return { results, affected, total: ids.length };
}

export async function moveLocalizados(ids: string[], lugarId: string) {
  await connectDB();
  const lugar = await Lugar.findById(lugarId);
  if (!lugar) throw new Error("Lugar no encontrado");

  let moved = 0;
  for (const id of ids) {
    try {
      await updateLocalizado(id, { lugarId });
      moved++;
    } catch {
      // skip conflicts
    }
  }
  return moved;
}
