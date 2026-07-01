import { describe, expect, it } from "vitest";
import { escapeRegex } from "@/lib/api";

describe("escapeRegex", () => {
  it("escapa el punto", () => {
    expect(escapeRegex("foo.bar")).toBe("foo\\.bar");
  });

  it("escapa el signo +", () => {
    expect(escapeRegex("a+b")).toBe("a\\+b");
  });

  it("escapa patrón ReDoS", () => {
    expect(escapeRegex("(a+)+b")).toBe("\\(a\\+\\)\\+b");
  });

  it("escapa todos los caracteres especiales", () => {
    expect(escapeRegex(".*+?^${}()|[]\\")).toBe(
      "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\"
    );
  });

  it("no modifica string sin caracteres especiales", () => {
    expect(escapeRegex("hola mundo")).toBe("hola mundo");
  });

  it("escapa string vacío", () => {
    expect(escapeRegex("")).toBe("");
  });
});
