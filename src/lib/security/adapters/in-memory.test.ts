import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryRateLimiter } from "@/lib/security/adapters/in-memory";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("InMemoryRateLimiter", () => {
  it("permite solicitudes hasta el máximo y decrementa remaining", async () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 3 });

    expect(await limiter.check("ip:1")).toEqual({
      allowed: true,
      remaining: 2,
      resetAt: 1000,
    });
    expect(await limiter.check("ip:1")).toEqual({
      allowed: true,
      remaining: 1,
      resetAt: 1000,
    });
    expect(await limiter.check("ip:1")).toEqual({
      allowed: true,
      remaining: 0,
      resetAt: 1000,
    });
  });

  it("bloquea la solicitud que supera el máximo", async () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 2 });
    await limiter.check("ip:1");
    await limiter.check("ip:1");

    expect(await limiter.check("ip:1")).toEqual({
      allowed: false,
      remaining: 0,
      resetAt: 1000,
    });
  });

  it("mantiene contadores independientes por clave", async () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 1 });

    expect((await limiter.check("ip:A")).allowed).toBe(true);
    expect((await limiter.check("ip:B")).allowed).toBe(true);
  });

  it("reinicia el contador cuando expira la ventana", async () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 1 });

    expect((await limiter.check("ip:1")).allowed).toBe(true);
    expect((await limiter.check("ip:1")).allowed).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(await limiter.check("ip:1")).toEqual({
      allowed: true,
      remaining: 0,
      resetAt: 2001,
    });
  });
});
