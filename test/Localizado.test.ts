import { normalizeNombre } from "@/lib/models/Localizado";
import { describe, expect, it } from "vitest";

describe("normalizeNombre", () => {
  it("converts to uppercase", () => {
    expect(normalizeNombre("juan perez")).toBe("JUAN PEREZ");
  });

  it("removes accents/diacritics", () => {
    expect(normalizeNombre("María José")).toBe("MARIA JOSE");
  });

  it("removes diaeresis (ü)", () => {
    expect(normalizeNombre("Argüelles")).toBe("ARGUELLES");
  });

  it("converts Ñ to N via NFD decomposition (intentional — used for deduplication)", () => {
    // NFD descompone «Ñ» en «N» más la tilde combinatoria y, a continuación, se elimina la tilde combinatoria.
    // «CARREÑO» y «CARRENO» dan como resultado el mismo «normalizadoNombre», lo cual es el
    // comportamiento deseado para que la detección de duplicados no tenga en cuenta los acentos.
    expect(normalizeNombre("Carreño")).toBe("CARRENO");
  });

  it("collapses multiple internal spaces into one", () => {
    expect(normalizeNombre("pedro   gonzalez")).toBe("PEDRO GONZALEZ");
  });

  it("trims leading and trailing spaces", () => {
    expect(normalizeNombre("   Ana  ")).toBe("ANA");
  });

  it("handles a combination of all cases", () => {
    expect(normalizeNombre("  maría   de los Ángeles  ")).toBe("MARIA DE LOS ANGELES");
  });
});
