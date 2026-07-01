import { describe, expect, it } from "vitest";
import { toLugarDTO, toLocalizadoDTO } from "@/lib/serializers";
import type { LugarSource, LocalizadoSource } from "@/lib/mongoose-types";

describe("toLugarDTO", () => {
  it("mapea todos los campos", () => {
    const lugar: LugarSource = {
      slug: "hospital-central",
      nombre: "Hospital Central",
      tipo: "hospital",
      direccion: "Av. Principal",
      ciudad: "Caracas",
      estado: "Distrito Capital",
    };
    const dto = toLugarDTO(lugar, 42);
    expect(dto).toEqual({
      slug: "hospital-central",
      nombre: "Hospital Central",
      tipo: "hospital",
      direccion: "Av. Principal",
      ciudad: "Caracas",
      estado: "Distrito Capital",
      totalLocalizados: 42,
    });
  });

  it("usa totalLocalizados default 0", () => {
    const lugar: LugarSource = { slug: "x", nombre: "X", tipo: "recinto" };
    const dto = toLugarDTO(lugar);
    expect(dto.totalLocalizados).toBe(0);
  });

  it("maneja campos opcionales ausentes", () => {
    const lugar: LugarSource = { slug: "x", nombre: "X", tipo: "recinto" };
    const dto = toLugarDTO(lugar);
    expect(dto.direccion).toBeUndefined();
    expect(dto.ciudad).toBeUndefined();
    expect(dto.estado).toBeUndefined();
  });
});

describe("toLocalizadoDTO", () => {
  const baseLugar: LugarSource = {
    slug: "hospital-x",
    nombre: "Hospital X",
    tipo: "hospital",
  };

  const baseLocalizado: LocalizadoSource = {
    slug: "juan-perez",
    nombreCompleto: "Juan Pérez",
    condicion: "vivo",
    fuente: { tipo: "manual", nombre: "Admin" },
    createdAt: new Date("2025-01-15T10:00:00Z"),
  };

  it("mapea todos los campos", () => {
    const localizado: LocalizadoSource = {
      ...baseLocalizado,
      edad: "30",
      cedula: "V-12345678",
      telefono: "0412-1234567",
      direccion: "Calle 1",
      observaciones: "Estable",
    };
    const dto = toLocalizadoDTO(localizado, baseLugar);
    expect(dto).toMatchObject({
      slug: "juan-perez",
      nombreCompleto: "Juan Pérez",
      edad: "30",
      cedula: "V-12345678",
      telefono: "0412-1234567",
      direccion: "Calle 1",
      observaciones: "Estable",
      condicion: "vivo",
      lugarSlug: "hospital-x",
      lugarNombre: "Hospital X",
    });
  });

  it("serializa publicadoEn desde Date", () => {
    const dto = toLocalizadoDTO(baseLocalizado, baseLugar);
    expect(dto.publicadoEn).toBe("2025-01-15T10:00:00.000Z");
  });

  it("serializa publicadoEn desde string", () => {
    const localizado = {
      ...baseLocalizado,
      createdAt: "2025-06-01T00:00:00.000Z" as never,
    };
    const dto = toLocalizadoDTO(localizado, baseLugar);
    expect(dto.publicadoEn).toBe("2025-06-01T00:00:00.000Z");
  });

  it("convierte campos opcionales ausentes a undefined", () => {
    const dto = toLocalizadoDTO(baseLocalizado, baseLugar);
    expect(dto.edad).toBeUndefined();
    expect(dto.cedula).toBeUndefined();
    expect(dto.telefono).toBeUndefined();
    expect(dto.direccion).toBeUndefined();
    expect(dto.observaciones).toBeUndefined();
  });

  it("incluye fuente completa con opcionales", () => {
    const localizado: LocalizadoSource = {
      ...baseLocalizado,
      fuente: {
        tipo: "contribucion",
        nombre: "Test",
        url: "https://example.com",
        notas: "nota",
        fecha: "2025-01-01",
      },
    };
    const dto = toLocalizadoDTO(localizado, baseLugar);
    expect(dto.fuente).toEqual({
      tipo: "contribucion",
      nombre: "Test",
      url: "https://example.com",
      notas: "nota",
      fecha: "2025-01-01",
    });
  });
});
