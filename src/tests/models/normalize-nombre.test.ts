import { describe, expect, it } from "vitest";
import { normalizeNombre } from "@/lib/models/Localizado";

describe("normalizeNombre", () => {
  it("elimina tildes y mayusculiza", () => {
    expect(normalizeNombre("José María")).toBe("JOSE MARIA");
  });

  it("colapsa espacios múltiples", () => {
    expect(normalizeNombre("  Juan   Carlos  ")).toBe("JUAN CARLOS");
  });

  it("elimina diacríticos", () => {
    expect(normalizeNombre("ÁÉÍÓÚÜÑ")).toBe("AEIOUUN");
  });

  it("maneja string vacío", () => {
    expect(normalizeNombre("")).toBe("");
  });

  it("maneja solo espacios", () => {
    expect(normalizeNombre("   ")).toBe("");
  });
});
