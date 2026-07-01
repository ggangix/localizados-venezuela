import { describe, expect, it } from "vitest";
import { isSafeRedirect } from "@/lib/url";

describe("isSafeRedirect", () => {
  it("permite ruta relativa simple", () => {
    expect(isSafeRedirect("/admin")).toBe(true);
  });

  it("permite ruta relativa con query params", () => {
    expect(isSafeRedirect("/admin?next=/dashboard")).toBe(true);
  });

  it("rechaza protocol-relative URL", () => {
    expect(isSafeRedirect("//evil.com")).toBe(false);
  });

  it("rechaza URL absoluta externa", () => {
    expect(isSafeRedirect("https://evil.com")).toBe(false);
  });

  it("rechaza URL relativa con @", () => {
    expect(isSafeRedirect("/@evil.com")).toBe(false);
  });

  it("rechaza string vacío", () => {
    expect(isSafeRedirect("")).toBe(false);
  });

  it("permite misma origen cuando se especifica allowedOrigin", () => {
    expect(isSafeRedirect("https://example.com/page", "https://example.com")).toBe(
      true
    );
  });

  it("rechaza origen diferente cuando se especifica allowedOrigin", () => {
    expect(isSafeRedirect("https://evil.com", "https://example.com")).toBe(false);
  });

  it("rechaza URL inválida con allowedOrigin", () => {
    expect(isSafeRedirect("not-a-url", "https://example.com")).toBe(false);
  });

  it("rechaza ruta que solo tiene //", () => {
    expect(isSafeRedirect("//")).toBe(false);
  });

  it("rechaza solo una barra sin más contenido", () => {
    expect(isSafeRedirect("/")).toBe(true);
  });
});
