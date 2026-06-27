import type { LugarTipo } from "@/lib/types";

export function normalizeLugarKey(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\bH\b/g, "HOSPITAL")
    .replace(/\bDR\b/g, "DOCTOR")
    .replace(/\bLG\b/g, "LA GUAIRA")
    .replace(/\bJM\b/g, "JOSE MARIA")
    .replace(/\s+/g, " ")
    .trim();
}

export type LugarRef = {
  _id: import("mongoose").Types.ObjectId;
  slug: string;
  nombre: string;
  tipo: string;
};

export function findLugarByNombre(
  lugares: LugarRef[],
  nombre: string
): LugarRef | undefined {
  const exact = lugares.find((l) => l.nombre === nombre);
  if (exact) return exact;
  const key = normalizeLugarKey(nombre);
  return lugares.find((l) => normalizeLugarKey(l.nombre) === key);
}

export function inferLugarTipo(nombre: string): LugarTipo {
  return /hospital|clinica|clínica|cruz roja|seguro social|periférico|periferico/i.test(
    nombre
  )
    ? "hospital"
    : "recinto";
}
