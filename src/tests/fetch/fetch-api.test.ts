import { describe, expect, it, vi } from "vitest";
import { fetchApi } from "@/lib/fetch-api";

function mockResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchApi", () => {
  it("retorna data en request exitoso", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse({ id: 1, name: "test" })
    );

    const result = await fetchApi<{ id: number; name: string }>("/api/test");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ id: 1, name: "test" });
    }
  });

  it("retorna error en 4xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockResponse({ error: "No autorizado", code: "UNAUTHORIZED" }, 401)
    );

    const result = await fetchApi("/api/test");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error).toBe("No autorizado");
      expect(result.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("retorna error genérico si body no tiene error field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(mockResponse({}, 400));

    const result = await fetchApi("/api/test");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error).toBe("HTTP 400");
    }
  });

  it("maneja TypeError (error de red)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(
      new TypeError("Failed to fetch")
    );

    const result = await fetchApi("/api/test");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error).toContain("Error de conexión");
    }
  });

  it("maneja error inesperado", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Algo raro"));

    const result = await fetchApi("/api/test");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.error).toBe("Error inesperado");
    }
  });

  it("incluye credentials: include por defecto", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockResponse({}));

    await fetchApi("/api/test");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("incluye Content-Type json por defecto", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockResponse({}));

    await fetchApi("/api/test");
    expect(fetchSpy).toHaveBeenCalledWith("/api/test", {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
  });

  it("mergea headers personalizados con los default", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockResponse({}));

    await fetchApi("/api/test", { headers: { Authorization: "Bearer x" } });
    expect(fetchSpy).toHaveBeenCalledWith("/api/test", {
      credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: "Bearer x" },
    });
  });

  it("usa fetch con init personalizado", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockResponse({}));

    await fetchApi("/api/test", { method: "POST", body: JSON.stringify({ a: 1 }) });
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ method: "POST" })
    );
  });
});
