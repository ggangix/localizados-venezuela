import * as XLSX from "xlsx";
import { normalizeNombre } from "../../src/lib/models/Localizado";
import { makeSlug, makeUniqueSlug } from "../../src/lib/slug";
import type { LugarTipo } from "../../src/lib/types";

export const FUENTE_EXCEL = {
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

export type ExcelRow = {
  nombre: string;
  edad?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  observaciones?: string;
  hospital?: string;
};

export type SeedLugar = {
  slug: string;
  nombre: string;
  tipo: LugarTipo;
};

export type SeedLocalizado = {
  slug: string;
  nombreCompleto: string;
  nombreNormalizado: string;
  lugarSlug: string;
  edad?: string;
  cedula?: string;
  telefono?: string;
  direccion?: string;
  observaciones?: string;
  condicion: "vivo" | "fallecido" | "desconocido";
  fuente: typeof FUENTE_EXCEL;
};

export function detectCondicion(obs?: string): "vivo" | "fallecido" | "desconocido" {
  if (!obs) return "desconocido";
  if (obs.toLowerCase().includes("fallec")) return "fallecido";
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

function mapHeaders(row: Record<string, unknown>): ExcelRow | null {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const field = resolveField(key);
    if (field && value != null && String(value).trim()) {
      mapped[field] = String(value).trim();
    }
  }
  if (!mapped.nombre) return null;
  return mapped as ExcelRow;
}

export function sheetToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  }) as unknown[][];

  if (matrix.length === 0) return [];

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(matrix.length, 15); i++) {
    const cells = (matrix[i] ?? []).map((c) => String(c).trim().toLowerCase());
    if (cells.some((c) => c.includes("apellido") && c.includes("nombre"))) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex === -1) return [];

  const headers = (matrix[headerRowIndex] as unknown[]).map((h) => String(h).trim());
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
): { lugar: string; rows: ExcelRow[] }[] {
  const raw = sheetToRows(sheet);
  if (raw.length === 0) return [];

  const firstKeys = Object.keys(raw[0] ?? {}).map((k) => k.toLowerCase());
  const isHospitalColumn = firstKeys.some((k) => k.includes("hospital"));

  if (isHospitalColumn) {
    const byLugar = new Map<string, ExcelRow[]>();
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

  const rows: ExcelRow[] = [];
  for (const row of raw) {
    const mapped = mapHeaders(row);
    if (mapped) rows.push(mapped);
  }
  return [{ lugar: defaultLugar, rows }];
}

function pickSheets(sheetNames: string[]): string[] {
  const buscar = sheetNames.find((n) => /buscar/i.test(n));
  if (buscar) return [buscar];
  return sheetNames.filter((n) => !/buscar/i.test(n));
}

function lugarTipo(nombre: string): LugarTipo {
  return /hospital|clinica|clínica|cruz roja|seguro social/i.test(nombre)
    ? "hospital"
    : "recinto";
}

export function buildSeedFromWorkbook(wb: XLSX.WorkBook): {
  lugares: SeedLugar[];
  localizados: SeedLocalizado[];
} {
  const lugarMap = new Map<string, SeedLugar>();
  const localizados: SeedLocalizado[] = [];
  const seen = new Set<string>();

  for (const sheetName of pickSheets(wb.SheetNames)) {
    const groups = parseSheet(wb.Sheets[sheetName], sheetName);
    for (const group of groups) {
      const slug = makeSlug(group.lugar);
      if (!lugarMap.has(slug)) {
        lugarMap.set(slug, {
          slug,
          nombre: group.lugar,
          tipo: lugarTipo(group.lugar),
        });
      }

      for (const row of group.rows) {
        const nombreNormalizado = normalizeNombre(row.nombre);
        const dedupe = `${slug}:${nombreNormalizado}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);

        localizados.push({
          slug: makeUniqueSlug(row.nombre, row.cedula),
          nombreCompleto: row.nombre,
          nombreNormalizado,
          lugarSlug: slug,
          edad: row.edad,
          cedula: row.cedula,
          telefono: row.telefono,
          direccion: row.direccion,
          observaciones: row.observaciones,
          condicion: detectCondicion(row.observaciones),
          fuente: FUENTE_EXCEL,
        });
      }
    }
  }

  const lugares = [...lugarMap.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es")
  );
  localizados.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es"));

  return { lugares, localizados };
}

export function buildSeedFromExcelFile(filePath: string) {
  const wb = XLSX.readFile(filePath);
  return buildSeedFromWorkbook(wb);
}
