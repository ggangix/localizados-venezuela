import type { LocalizadoSource, LugarSource } from "@/lib/mongoose-types";
import { toLocalizadoDTO, toLugarDTO } from "@/lib/serializers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createLugarSource(overrides: Partial<LugarSource> = {}): LugarSource {
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

function createLocalizadoSource(
  overrides: Partial<LocalizadoSource> = {}
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

describe("toLugarDTO", () => {
  it("mapea slug, nombre y tipo correctamente", () => {
    const lugar = createLugarSource();
    const dto = toLugarDTO(lugar);

    expect(dto.slug).toBe("hospital-central");
    expect(dto.nombre).toBe("Hospital Central");
    expect(dto.tipo).toBe("hospital");
  });

  it("convierte los campos opcionales null a undefined", () => {
    const lugar = createLugarSource({
      direccion: null,
      ciudad: null,
      estado: null,
    });
    const dto = toLugarDTO(lugar);

    expect(dto.direccion).toBeUndefined();
    expect(dto.ciudad).toBeUndefined();
    expect(dto.estado).toBeUndefined();
  });

  it("convierte los campos opcionales undefined a undefined", () => {
    const lugar = createLugarSource({
      direccion: undefined,
      ciudad: undefined,
      estado: undefined,
    });
    const dto = toLugarDTO(lugar);

    expect(dto.direccion).toBeUndefined();
    expect(dto.ciudad).toBeUndefined();
    expect(dto.estado).toBeUndefined();
  });

  it("usa 0 por defecto para totalLocalizados", () => {
    const lugar = createLugarSource();
    const dto = toLugarDTO(lugar);

    expect(dto.totalLocalizados).toBe(0);
  });

  it("usa el totalLocalizados proporcionado", () => {
    const lugar = createLugarSource();
    const dto = toLugarDTO(lugar, 42);

    expect(dto.totalLocalizados).toBe(42);
  });
});

describe("toLocalizadoDTO", () => {
  const lugar = createLugarSource({
    slug: "lugar-test",
    nombre: "Lugar Test",
  });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mapea todos los campos obligatorios correctamente", () => {
    const localizado = createLocalizadoSource();
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.slug).toBe("juan-perez");
    expect(dto.nombreCompleto).toBe("Juan Perez");
    expect(dto.condicion).toBe("vivo");
    expect(dto.publicadoEn).toBe("2024-01-15T10:30:00.000Z");
  });

  it("convierte los campos opcionales null a undefined", () => {
    const localizado = createLocalizadoSource({
      edad: null,
      cedula: null,
      telefono: null,
      direccion: null,
      observaciones: null,
    });
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.edad).toBeUndefined();
    expect(dto.cedula).toBeUndefined();
    expect(dto.telefono).toBeUndefined();
    expect(dto.direccion).toBeUndefined();
    expect(dto.observaciones).toBeUndefined();
  });

  it("convierte los campos opcionales undefined a undefined", () => {
    const localizado = createLocalizadoSource({
      edad: undefined,
      cedula: undefined,
      telefono: undefined,
      direccion: undefined,
      observaciones: undefined,
    });
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.edad).toBeUndefined();
    expect(dto.cedula).toBeUndefined();
    expect(dto.telefono).toBeUndefined();
    expect(dto.direccion).toBeUndefined();
    expect(dto.observaciones).toBeUndefined();
  });

  it("maneja createdAt como Date y devuelve una cadena ISO", () => {
    const localizado = createLocalizadoSource({
      createdAt: new Date("2024-03-10T08:00:00.000Z"),
    });
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.publicadoEn).toBe("2024-03-10T08:00:00.000Z");
  });

  it("maneja createdAt como cadena", () => {
    const localizado = createLocalizadoSource({
      createdAt: "2024-04-20T14:45:00.000Z" as unknown as Date,
    });
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.publicadoEn).toBe("2024-04-20T14:45:00.000Z");
  });

  it("usa la fecha actual como cadena ISO cuando createdAt falta", () => {
    const localizado = createLocalizadoSource({
      createdAt: undefined,
    });
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.publicadoEn).toBe("2024-06-01T12:00:00.000Z");
  });

  it("usa lugar.slug y lugar.nombre correctamente", () => {
    const localizado = createLocalizadoSource();
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.lugarSlug).toBe("lugar-test");
    expect(dto.lugarNombre).toBe("Lugar Test");
  });

  it("mapea los campos de fuente correctamente", () => {
    const localizado = createLocalizadoSource();
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.fuente.tipo).toBe("manual");
    expect(dto.fuente.nombre).toBe("Test source");
    expect(dto.fuente.url).toBe("https://example.com");
    expect(dto.fuente.notas).toBe("Notas de prueba");
    expect(dto.fuente.fecha).toBe("2024-01-01");
  });

  it("convierte los campos opcionales null de fuente a undefined", () => {
    const localizado = createLocalizadoSource({
      fuente: {
        tipo: "excel",
        nombre: "Excel source",
        url: null,
        notas: null,
        fecha: null,
      },
    });
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.fuente.url).toBeUndefined();
    expect(dto.fuente.notas).toBeUndefined();
    expect(dto.fuente.fecha).toBeUndefined();
  });

  it("convierte los campos opcionales undefined de fuente a undefined", () => {
    const localizado = createLocalizadoSource({
      fuente: {
        tipo: "contribucion",
        nombre: "Contribucion source",
        url: undefined,
        notas: undefined,
        fecha: undefined,
      },
    });
    const dto = toLocalizadoDTO(localizado, lugar);

    expect(dto.fuente.url).toBeUndefined();
    expect(dto.fuente.notas).toBeUndefined();
    expect(dto.fuente.fecha).toBeUndefined();
  });
});
