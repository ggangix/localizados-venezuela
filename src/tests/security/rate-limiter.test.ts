import { describe, expect, it, vi } from "vitest";
import {
  InMemoryRateLimiter,
  loginRateLimiter,
  contributionRateLimiter,
} from "@/lib/rate-limiter";

describe("InMemoryRateLimiter", () => {
  it("permite primer request", () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60000, maxRequests: 5 });
    const result = limiter.check("ip-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it("decrementa remaining en cada request", () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60000, maxRequests: 3 });
    expect(limiter.check("ip-1").remaining).toBe(2);
    expect(limiter.check("ip-1").remaining).toBe(1);
    expect(limiter.check("ip-1").remaining).toBe(0);
  });

  it("bloquea cuando excede maxRequests", () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60000, maxRequests: 2 });
    limiter.check("ip-1");
    limiter.check("ip-1");
    const result = limiter.check("ip-1");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("claves diferentes no interfieren", () => {
    const limiter = new InMemoryRateLimiter({ windowMs: 60000, maxRequests: 2 });
    limiter.check("ip-1");
    limiter.check("ip-1");
    const result = limiter.check("ip-2");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("reinicia contador cuando expira la ventana", () => {
    vi.useFakeTimers();
    const limiter = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 1 });

    limiter.check("ip-1"); // primer request
    const blocked = limiter.check("ip-1"); // debería bloquear
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(1001); // ventana expira

    const allowed = limiter.check("ip-1"); // se reinicia
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(0); // maxRequests - 1

    vi.useRealTimers();
  });

  it("retorna resetAt correcto", () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);

    const limiter = new InMemoryRateLimiter({ windowMs: 60000, maxRequests: 5 });
    const result = limiter.check("ip-1");
    expect(result.resetAt).toBe(now + 60000);

    vi.useRealTimers();
  });
});

describe("loginRateLimiter preconfigurado", () => {
  it("permite 10 requests por IP", () => {
    for (let i = 0; i < 10; i++) {
      const result = loginRateLimiter.check("ip-test");
      expect(result.allowed).toBe(true);
    }
    const blocked = loginRateLimiter.check("ip-test");
    expect(blocked.allowed).toBe(false);
  });

  it("IPs diferentes tienen contadores independientes", () => {
    loginRateLimiter.check("ip-a");
    expect(loginRateLimiter.check("ip-b").remaining).toBe(9); // fresh start
  });
});

describe("contributionRateLimiter preconfigurado", () => {
  it("permite 5 requests por minuto", () => {
    for (let i = 0; i < 5; i++) {
      const result = contributionRateLimiter.check("ip-test");
      expect(result.allowed).toBe(true);
    }
    const blocked = contributionRateLimiter.check("ip-test");
    expect(blocked.allowed).toBe(false);
  });
});
