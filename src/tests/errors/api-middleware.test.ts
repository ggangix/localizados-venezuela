import { describe, expect, it, vi } from "vitest";
import { withErrorHandler } from "@/lib/api-middleware";
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
} from "@/lib/errors";
import { NextResponse } from "next/server";

vi.mock("next/server", () => {
  const mockJson = vi.fn((body: unknown, init?: ResponseInit) => {
    const status = (init as { status?: number })?.status ?? 200;
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  });

  return {
    NextResponse: {
      json: mockJson,
    },
  };
});

describe("withErrorHandler", () => {
  it("retorna respuesta del handler exitoso", async () => {
    const handler = withErrorHandler(async () => new Response("ok", { status: 200 }));
    const res = await handler();
    expect(res.status).toBe(200);
  });

  it("captura ValidationError como 400", async () => {
    const handler = withErrorHandler(async () => {
      throw new ValidationError("Campo requerido");
    });
    const res = await handler();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Campo requerido", code: "VALIDATION_ERROR" });
  });

  it("captura NotFoundError como 404", async () => {
    const handler = withErrorHandler(async () => {
      throw new NotFoundError("Recurso no encontrado");
    });
    const res = await handler();
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Recurso no encontrado", code: "NOT_FOUND" });
  });

  it("captura UnauthorizedError como 401", async () => {
    const handler = withErrorHandler(async () => {
      throw new UnauthorizedError();
    });
    const res = await handler();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toMatchObject({ error: "No autorizado", code: "UNAUTHORIZED" });
  });

  it("captura RateLimitError como 429", async () => {
    const handler = withErrorHandler(async () => {
      throw new RateLimitError();
    });
    const res = await handler();
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Demasiadas solicitudes", code: "RATE_LIMIT" });
  });

  it("captura Error genérico como 500", async () => {
    const handler = withErrorHandler(async () => {
      throw new Error("Algo explotó");
    });
    const res = await handler();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Error interno del servidor" });
  });

  it("incluye details de ApiError en la respuesta", async () => {
    const handler = withErrorHandler(async () => {
      throw new ValidationError("Datos inválidos", {
        fieldErrors: { nombre: "required" },
      });
    });
    const res = await handler();
    const body = await res.json();
    expect(body.details).toEqual({ fieldErrors: { nombre: "required" } });
  });
});
