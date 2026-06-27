import { describe, expect, it } from "vitest";
import { makeSlug, makeUniqueSlug } from "@/lib/slug";

describe("makeSlug", () => {
  it("convierte texto a slug", () => {
    expect(makeSlug("José María")).toBe("jose-maria");
  });

  it("usa hint si se proporciona", () => {
    expect(makeSlug("nombre", "hint")).toBe("nombre-hint");
  });

  it("genera fallback cuando base es vacía", () => {
    const slug = makeSlug("");
    expect(slug).toMatch(/^registro-[a-z0-9]{6}$/);
  });

  it("genera fallback cuando hint es vacío", () => {
    const slug = makeSlug("");
    expect(slug.length).toBeGreaterThan(0);
  });

  it("slugify translitera caracteres especiales a palabras", () => {
    const slug = makeSlug("Nombre @ # $ %");
    expect(slug).toContain("nombre");
  });
});

describe("makeUniqueSlug", () => {
  it("retorna slug con suffix aleatorio", () => {
    const slug = makeUniqueSlug("José María");
    expect(slug).toMatch(/^jose-maria-[a-z0-9]{6}$/);
  });

  it("genera slugs diferentes en llamadas sucesivas", () => {
    const a = makeUniqueSlug("test");
    const b = makeUniqueSlug("test");
    expect(a).not.toBe(b);
  });

  it("usa hint si se proporciona", () => {
    const slug = makeUniqueSlug("nombre", "hint");
    expect(slug).toMatch(/^nombre-hint-[a-z0-9]{6}$/);
  });
});
