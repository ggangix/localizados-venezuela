import type { LocalizadoDoc } from "@/lib/models/Localizado";
import type { LugarDoc } from "@/lib/models/Lugar";
import type { LocalizadoDTO, LugarDTO } from "@/lib/types";

export function toLugarDTO(lugar: LugarDoc, totalLocalizados = 0): LugarDTO {
  return {
    slug: lugar.slug,
    nombre: lugar.nombre,
    tipo: lugar.tipo,
    direccion: lugar.direccion ?? undefined,
    ciudad: lugar.ciudad ?? undefined,
    estado: lugar.estado ?? undefined,
    totalLocalizados,
  };
}

export function toLocalizadoDTO(
  localizado: LocalizadoDoc,
  lugar: LugarDoc
): LocalizadoDTO {
  return {
    slug: localizado.slug,
    nombreCompleto: localizado.nombreCompleto,
    edad: localizado.edad ?? undefined,
    cedula: localizado.cedula ?? undefined,
    telefono: localizado.telefono ?? undefined,
    direccion: localizado.direccion ?? undefined,
    observaciones: localizado.observaciones ?? undefined,
    condicion: localizado.condicion,
    lugarSlug: lugar.slug,
    lugarNombre: lugar.nombre,
    fuente: {
      tipo: localizado.fuente.tipo,
      nombre: localizado.fuente.nombre,
      url: localizado.fuente.url ?? undefined,
      notas: localizado.fuente.notas ?? undefined,
      fecha: localizado.fuente.fecha ?? undefined,
    },
    publicadoEn: localizado.createdAt?.toISOString?.() ?? new Date().toISOString(),
  };
}
