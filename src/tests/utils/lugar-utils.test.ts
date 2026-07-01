import { describe, expect, it } from "vitest";
import {
  normalizeLugarKey,
  findLugarByNombre,
  inferLugarTipo,
} from "@/lib/lugar-utils";
import type { LugarRef } from "@/lib/lugar-utils";

describe("normalizeLugarKey", () => {
  it("elimina tildes y mayusculiza", () => {
    expect(normalizeLugarKey("José María")).toBe("JOSE MARIA");
  });

  it("reemplaza H por HOSPITAL", () => {
    expect(normalizeLugarKey("H ULA")).toBe("HOSPITAL ULA");
  });

  it("reemplaza DR por DOCTOR", () => {
    expect(normalizeLugarKey("Dr. JM")).toBe("DOCTOR JOSE MARIA");
  });

  it("reemplaza LG por LA GUAIRA", () => {
    expect(normalizeLugarKey("LG")).toBe("LA GUAIRA");
  });

  it("reemplaza JM por JOSE MARIA", () => {
    expect(normalizeLugarKey("JM")).toBe("JOSE MARIA");
  });

  it("colapsa espacios múltiples", () => {
    expect(normalizeLugarKey("Hospital   Central")).toBe("HOSPITAL CENTRAL");
  });

  it("remueve caracteres no alfanuméricos excepto espacios", () => {
    expect(normalizeLugarKey("Clínica #1 (El Valle)")).toBe("CLINICA 1 EL VALLE");
  });
});

describe("findLugarByNombre", () => {
  const lugares: LugarRef[] = [
    {
      _id: "id1" as never,
      slug: "hospital-central",
      nombre: "Hospital Central",
      tipo: "hospital",
    },
    {
      _id: "id2" as never,
      slug: "clinica-el-valle",
      nombre: "Clínica El Valle",
      tipo: "recinto",
    },
  ];

  it("encuentra por nombre exacto", () => {
    const found = findLugarByNombre(lugares, "Hospital Central");
    expect(found?.slug).toBe("hospital-central");
  });

  it("encuentra por nombre normalizado (sin tilde)", () => {
    const found = findLugarByNombre(lugares, "Clinica El Valle");
    expect(found?.slug).toBe("clinica-el-valle");
  });

  it("retorna undefined si no hay match", () => {
    const found = findLugarByNombre(lugares, "Inexistente");
    expect(found).toBeUndefined();
  });

  it("retorna undefined con lista vacía", () => {
    const found = findLugarByNombre([], "Hospital Central");
    expect(found).toBeUndefined();
  });
});

describe("inferLugarTipo", () => {
  it("detecta hospital por nombre", () => {
    expect(inferLugarTipo("Hospital Central")).toBe("hospital");
    expect(inferLugarTipo("Clínica Popular")).toBe("hospital");
    expect(inferLugarTipo("Cruz Roja")).toBe("hospital");
    expect(inferLugarTipo("Seguro Social")).toBe("hospital");
    expect(inferLugarTipo("Periférico")).toBe("hospital");
  });

  it("default a recinto si no parece hospital", () => {
    expect(inferLugarTipo("Gimnasio Municipal")).toBe("recinto");
    expect(inferLugarTipo("Escuela")).toBe("recinto");
  });
});
