import { afterEach, describe, expect, it, vi } from "vitest";
import { InMemoryRateLimiter, contributionRateLimiter } from "@/lib/rate-limiter";

afterEach(() => {
  vi.useRealTimers();
});

describe("contributionRateLimiter", () => {
  it("permite 5 envíos y bloquea el 6º por la misma clave", () => {
    const key = `test-${"abusador"}`;
    for (let i = 0; i < 5; i++) {
      expect(contributionRateLimiter.check(key).allowed).toBe(true);
    }
    const blocked = contributionRateLimiter.check(key);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("InMemoryRateLimiter", () => {
  it("reinicia el contador cuando expira la ventana", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    const rl = new InMemoryRateLimiter({ windowMs: 1000, maxRequests: 2 });

    expect(rl.check("k").allowed).toBe(true);
    expect(rl.check("k").allowed).toBe(true);
    expect(rl.check("k").allowed).toBe(false);

    vi.setSystemTime(new Date(1001));
    expect(rl.check("k").allowed).toBe(true);
  });

  it("no mezcla el conteo entre claves distintas", () => {
    const rl = new InMemoryRateLimiter({ windowMs: 60_000, maxRequests: 1 });
    expect(rl.check("ip-1").allowed).toBe(true);
    expect(rl.check("ip-1").allowed).toBe(false);
    // Otra IP arranca con su propio presupuesto.
    expect(rl.check("ip-2").allowed).toBe(true);
  });
});
