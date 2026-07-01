import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAdminSecrets,
  isAdminConfigured,
  isValidAdminSecret,
} from "@/lib/admin-auth-core";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAdminSecrets", () => {
  it("retorna array con un secreto", () => {
    vi.stubEnv("ADMIN_SECRET", "s3cr3t");
    expect(getAdminSecrets()).toEqual(["s3cr3t"]);
  });

  it("retorna array con múltiples secretos separados por coma", () => {
    vi.stubEnv("ADMIN_SECRET", "s1,s2,s3");
    expect(getAdminSecrets()).toEqual(["s1", "s2", "s3"]);
  });

  it("trim espacios alrededor de cada secreto", () => {
    vi.stubEnv("ADMIN_SECRET", "  s1 , s2  ");
    expect(getAdminSecrets()).toEqual(["s1", "s2"]);
  });

  it("filtra secretos vacíos", () => {
    vi.stubEnv("ADMIN_SECRET", "s1,,s3,");
    expect(getAdminSecrets()).toEqual(["s1", "s3"]);
  });

  it("retorna array vacío si no hay env var", () => {
    vi.stubEnv("ADMIN_SECRET", "");
    expect(getAdminSecrets()).toEqual([]);
  });
});

describe("isAdminConfigured", () => {
  it("retorna true si hay secretos", () => {
    vi.stubEnv("ADMIN_SECRET", "s3cr3t");
    expect(isAdminConfigured()).toBe(true);
  });

  it("retorna false si no hay secretos", () => {
    vi.stubEnv("ADMIN_SECRET", "");
    expect(isAdminConfigured()).toBe(false);
  });
});

describe("isValidAdminSecret", () => {
  it("retorna true para secreto válido", () => {
    vi.stubEnv("ADMIN_SECRET", "s3cr3t");
    expect(isValidAdminSecret("s3cr3t")).toBe(true);
  });

  it("retorna false para secreto inválido", () => {
    vi.stubEnv("ADMIN_SECRET", "s3cr3t");
    expect(isValidAdminSecret("wrong")).toBe(false);
  });

  it("retorna true si coincide con cualquiera de múltiples secretos", () => {
    vi.stubEnv("ADMIN_SECRET", "s1,s2,s3");
    expect(isValidAdminSecret("s2")).toBe(true);
  });

  it("retorna false si no hay secretos configurados", () => {
    vi.stubEnv("ADMIN_SECRET", "");
    expect(isValidAdminSecret("anything")).toBe(false);
  });

  it("usa comparación timing-safe (no lanza error con strings largos)", () => {
    vi.stubEnv("ADMIN_SECRET", "a".repeat(1000));
    expect(isValidAdminSecret("b".repeat(1000))).toBe(false);
    expect(isValidAdminSecret("a".repeat(1000))).toBe(true);
  });
});
