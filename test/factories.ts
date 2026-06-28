import mongoose from "mongoose";
import type {
  CondicionPersona,
  EstadoPublicacion,
  FuenteTipo,
  LugarTipo,
} from "@/lib/types";
import type { LocalizadoSource, LugarSource } from "@/lib/mongoose-types";

// ---------------------------------------------------------------------------
// Mongoose doc factories (queries, aggregation tests, etc.)
// ---------------------------------------------------------------------------

export type TestLugar = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  nombre: string;
  tipo: LugarTipo;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  notas: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TestLocalizado = {
  _id: mongoose.Types.ObjectId;
  slug: string;
  nombreCompleto: string;
  nombreNormalizado: string;
  edad: string | null;
  cedula: string | null;
  telefono: string | null;
  direccion: string | null;
  observaciones: string;
  condicion: CondicionPersona;
  lugarId: mongoose.Types.ObjectId;
  fuente: {
    tipo: FuenteTipo;
    nombre: string;
    url: string | null;
    notas: string | null;
    fecha: string | null;
  };
  estado: EstadoPublicacion;
  contribucionId: mongoose.Types.ObjectId | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LugarFactoryOverrides = {
  _id?: mongoose.Types.ObjectId;
  slug?: string;
  nombre?: string;
  tipo?: LugarTipo;
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  notas?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type LocalizadoFactoryOverrides = {
  _id?: mongoose.Types.ObjectId;
  slug?: string;
  nombreCompleto?: string;
  nombreNormalizado?: string;
  edad?: string | null;
  cedula?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  observaciones?: string | null;
  condicion?: CondicionPersona;
  lugarId?: mongoose.Types.ObjectId;
  fuente?: {
    tipo: FuenteTipo;
    nombre: string;
    url: string | null;
    notas: string | null;
    fecha: string | null;
  };
  estado?: EstadoPublicacion;
  contribucionId?: mongoose.Types.ObjectId;
  deletedAt?: Date | null;
  deletedBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function createLugar(overrides: LugarFactoryOverrides = {}): TestLugar {
  return {
    _id: overrides._id ?? new mongoose.Types.ObjectId(),
    slug: overrides.slug ?? "hospital-central",
    nombre: overrides.nombre ?? "Hospital Central",
    tipo: overrides.tipo ?? ("hospital" as LugarTipo),
    direccion: overrides.direccion ?? "Av. Principal",
    ciudad: overrides.ciudad ?? "Caracas",
    estado: overrides.estado ?? "Distrito Capital",
    notas: overrides.notas ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

export function createLocalizado(
  overrides: LocalizadoFactoryOverrides = {}
): TestLocalizado {
  return {
    _id: overrides._id ?? new mongoose.Types.ObjectId(),
    slug: overrides.slug ?? "juan-perez",
    nombreCompleto: overrides.nombreCompleto ?? "Juan Perez",
    nombreNormalizado:
      overrides.nombreNormalizado ??
      (overrides.nombreCompleto ?? "Juan Perez")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/\s+/g, " ")
        .trim(),
    edad: overrides.edad ?? "30",
    cedula: overrides.cedula ?? "12345678",
    telefono: overrides.telefono ?? "5551234",
    direccion: overrides.direccion ?? "Calle 1",
    observaciones: overrides.observaciones ?? "",
    condicion: overrides.condicion ?? ("vivo" as CondicionPersona),
    lugarId: overrides.lugarId ?? new mongoose.Types.ObjectId(),
    fuente: overrides.fuente ?? {
      tipo: "manual" as FuenteTipo,
      nombre: "Test source",
      url: null,
      notas: null,
      fecha: null,
    },
    estado: overrides.estado ?? ("published" as EstadoPublicacion),
    contribucionId: overrides.contribucionId ?? null,
    deletedAt: overrides.deletedAt ?? null,
    deletedBy: overrides.deletedBy ?? null,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

// ---------------------------------------------------------------------------
// Source factories (serializer tests — plain objects, no Mongoose types)
// ---------------------------------------------------------------------------

export type LugarSourceFactoryOverrides = Partial<LugarSource>;

export type LocalizadoSourceFactoryOverrides = Partial<LocalizadoSource>;

export function createLugarSource(
  overrides: LugarSourceFactoryOverrides = {}
): LugarSource {
  return {
    slug: "hospital-central",
    nombre: "Hospital Central",
    tipo: "hospital",
    direccion: "Av. Principal",
    ciudad: "Caracas",
    estado: "Distrito Capital",
    ...overrides,
  };
}

export function createLocalizadoSource(
  overrides: LocalizadoSourceFactoryOverrides = {}
): LocalizadoSource {
  return {
    slug: "juan-perez",
    nombreCompleto: "Juan Perez",
    edad: "30",
    cedula: "12345678",
    telefono: "5551234",
    direccion: "Calle 1",
    observaciones: "Observacion de prueba",
    condicion: "vivo",
    fuente: {
      tipo: "manual",
      nombre: "Test source",
      url: "https://example.com",
      notas: "Notas de prueba",
      fecha: "2024-01-01",
    },
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    ...overrides,
  };
}
