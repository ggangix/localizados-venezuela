import { describe, expect, it } from "vitest";
import { shouldSubmitSearch } from "@/lib/search";

describe("shouldSubmitSearch", () => {
  it("no envía con el campo vacío y sin filtros", () => {
    expect(shouldSubmitSearch("", false)).toBe(false);
  });

  it("no envía cuando el texto es solo espacios", () => {
    expect(shouldSubmitSearch("   ", false)).toBe(false);
  });

  it("envía cuando hay texto real", () => {
    expect(shouldSubmitSearch("ana", false)).toBe(true);
  });

  it("envía solo con filtros activos aunque el texto esté vacío", () => {
    expect(shouldSubmitSearch("", true)).toBe(true);
  });
});
