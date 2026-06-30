import { describe, expect, it } from "vitest";
import { buildSuggestionFilter } from "@/lib/queries";

describe("buildSuggestionFilter", () => {
  it("coincide con fragmentos iniciales de nombres, apellidos y datos de contacto", () => {
    const filter = buildSuggestionFilter("alb mat");

    expect(filter).toEqual({
      estado: "published",
      deletedAt: { $exists: false },
      $or: [
        { nombreCompleto: { $regex: "(^|\\s)alb mat", $options: "i" } },
        { nombreNormalizado: { $regex: "(^|\\s)alb mat", $options: "i" } },
      ],
    });
  });

  it("añade coincidencias por cédula o teléfono cuando el texto es numérico", () => {
    const filter = buildSuggestionFilter("0414");

    expect(filter).toEqual({
      estado: "published",
      deletedAt: { $exists: false },
      $or: [
        { nombreCompleto: { $regex: "(^|\\s)0414", $options: "i" } },
        { nombreNormalizado: { $regex: "(^|\\s)0414", $options: "i" } },
        { cedula: { $regex: "^0414", $options: "i" } },
        { telefono: { $regex: "^0414", $options: "i" } },
      ],
    });
  });

  it("devuelve null cuando el término está vacío", () => {
    expect(buildSuggestionFilter("   ")).toBeNull();
  });
});
