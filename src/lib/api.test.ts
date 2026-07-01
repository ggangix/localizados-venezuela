import { describe, expect, it } from "vitest";
import { escapeRegex } from "@/lib/api";

describe("escapeRegex", () => {
  it("escapa el punto para que no sea comodín", () => {
    expect(escapeRegex("foo.bar")).toBe("foo\\.bar");
  });

  it("escapa un patrón con backtracking catastrófico", () => {
    expect(escapeRegex("(a+)+b")).toBe("\\(a\\+\\)\\+b");
  });

  it("deja intacto el texto sin metacaracteres", () => {
    expect(escapeRegex("Hospital Domingo Luciani")).toBe("Hospital Domingo Luciani");
  });

  it("neutraliza el punto: el patrón escapado solo matchea el literal", () => {
    const re = new RegExp(`^${escapeRegex("a.c")}$`);
    expect(re.test("a.c")).toBe(true);
    expect(re.test("axc")).toBe(false);
  });

  it("un input malicioso se vuelve literal y no un cuantificador", () => {
    // Sin escapar, "(a+)+$" es un patrón ReDoS; escapado matchea su propio
    // texto y nada más, así que la evaluación es lineal.
    const re = new RegExp(escapeRegex("(a+)+$"));
    expect(re.test("(a+)+$")).toBe(true);
    expect(re.test("aaaaaaaa")).toBe(false);
  });
});
