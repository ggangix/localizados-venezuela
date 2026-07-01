import { afterEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter } from "@/lib/security/rate-limiter";
import { InMemoryRateLimiter } from "@/lib/security/adapters/in-memory";
import { MongoRateLimiter } from "@/lib/security/adapters/mongo";

const config = { windowMs: 1000, maxRequests: 5 };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("createRateLimiter", () => {
  it("usa InMemoryRateLimiter por defecto", () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "");
    expect(createRateLimiter(config)).toBeInstanceOf(InMemoryRateLimiter);
  });

  it("usa MongoRateLimiter cuando RATE_LIMIT_BACKEND=mongo", () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "mongo");
    expect(createRateLimiter(config)).toBeInstanceOf(MongoRateLimiter);
  });

  it("cae a InMemoryRateLimiter ante un backend desconocido", () => {
    vi.stubEnv("RATE_LIMIT_BACKEND", "redis");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(createRateLimiter(config)).toBeInstanceOf(InMemoryRateLimiter);
    expect(warn).toHaveBeenCalledOnce();
  });
});
