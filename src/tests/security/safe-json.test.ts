import { describe, expect, it } from "vitest";
import { safeJsonParse, safeJsonParseBody } from "@/lib/safe-json";

describe("safeJsonParse", () => {
  it("parsea JSON válido", () => {
    const result = safeJsonParse<{ a: number }>('{"a":1}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ a: 1 });
    }
  });

  it("retorna error en JSON inválido", () => {
    const result = safeJsonParse("{a:1}");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("JSON inválido");
    }
  });

  it("parsea array", () => {
    const result = safeJsonParse<number[]>("[1,2,3]");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([1, 2, 3]);
    }
  });
});

describe("safeJsonParseBody", () => {
  it("parsea body válido", () => {
    const result = safeJsonParseBody<{ name: string }>('{"name":"test"}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ name: "test" });
    }
  });

  it("rechaza body vacío", () => {
    const result = safeJsonParseBody("");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Body vacío");
    }
  });

  it("rechaza body con solo espacios", () => {
    const result = safeJsonParseBody("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Body vacío");
    }
  });

  it("rechaza body con solo newlines", () => {
    const result = safeJsonParseBody("\n\n");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Body vacío");
    }
  });

  it("rechaza JSON inválido en body no vacío", () => {
    const result = safeJsonParseBody("not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("JSON inválido");
    }
  });
});
