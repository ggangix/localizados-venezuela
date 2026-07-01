import { describe, expect, it } from "vitest";
import {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
} from "@/lib/errors";

describe("ApiError", () => {
  it("crea error con statusCode, message, code y details", () => {
    const err = new ApiError(418, "teapot", "TEAPOT", { extra: true });
    expect(err).toBeInstanceOf(Error);
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("teapot");
    expect(err.code).toBe("TEAPOT");
    expect(err.details).toEqual({ extra: true });
  });

  it("code y details son opcionales", () => {
    const err = new ApiError(500, "error");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBeUndefined();
    expect(err.details).toBeUndefined();
  });
});

describe("ValidationError", () => {
  it("status 400 y code VALIDATION_ERROR", () => {
    const err = new ValidationError("Campo requerido", {
      fieldErrors: { nombre: "required" },
    });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("Campo requerido");
    expect(err.details).toEqual({ fieldErrors: { nombre: "required" } });
  });

  it("details opcional", () => {
    const err = new ValidationError("simple");
    expect(err.statusCode).toBe(400);
    expect(err.details).toBeUndefined();
  });
});

describe("NotFoundError", () => {
  it("status 404, code NOT_FOUND y mensaje default", () => {
    const err = new NotFoundError();
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Recurso no encontrado");
  });

  it("acepta mensaje personalizado", () => {
    const err = new NotFoundError("Localizado no encontrado");
    expect(err.message).toBe("Localizado no encontrado");
  });
});

describe("UnauthorizedError", () => {
  it("status 401, code UNAUTHORIZED y mensaje default", () => {
    const err = new UnauthorizedError();
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("No autorizado");
  });

  it("acepta mensaje personalizado", () => {
    const err = new UnauthorizedError("Token inválido");
    expect(err.message).toBe("Token inválido");
  });
});

describe("RateLimitError", () => {
  it("status 429, code RATE_LIMIT y mensaje fijo", () => {
    const err = new RateLimitError();
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMIT");
    expect(err.message).toBe("Demasiadas solicitudes");
  });
});
