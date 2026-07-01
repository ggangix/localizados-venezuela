import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn().mockResolvedValue(undefined) }));

const { findOneAndUpdate } = vi.hoisted(() => ({
  findOneAndUpdate: vi.fn(),
}));

vi.mock("@/lib/models/RateLimit", () => ({
  RateLimit: { findOneAndUpdate },
}));

// Importado después de registrar los mocks.
import { MongoRateLimiter } from "@/lib/security/adapters/mongo";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MongoRateLimiter", () => {
  it("permite la primera solicitud y calcula remaining/resetAt", async () => {
    findOneAndUpdate.mockResolvedValue({ count: 1 });
    const limiter = new MongoRateLimiter({ windowMs: 1000, maxRequests: 3 });

    const res = await limiter.check("login:ip");

    expect(res).toEqual({ allowed: true, remaining: 2, resetAt: 1000 });
  });

  it("bloquea cuando el contador supera el máximo", async () => {
    findOneAndUpdate.mockResolvedValue({ count: 4 });
    const limiter = new MongoRateLimiter({ windowMs: 1000, maxRequests: 3 });

    const res = await limiter.check("login:ip");

    expect(res).toEqual({ allowed: false, remaining: 0, resetAt: 1000 });
  });

  it("incrementa de forma atómica con upsert sobre la clave de ventana", async () => {
    findOneAndUpdate.mockResolvedValue({ count: 1 });
    const limiter = new MongoRateLimiter({ windowMs: 1000, maxRequests: 3 });

    await limiter.check("login:ip");

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { key: "login:ip:0" },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(1000) } },
      { upsert: true, new: true }
    );
  });

  it("alinea la ventana fija según el reloj", async () => {
    vi.setSystemTime(1500);
    findOneAndUpdate.mockResolvedValue({ count: 1 });
    const limiter = new MongoRateLimiter({ windowMs: 1000, maxRequests: 3 });

    const res = await limiter.check("login:ip");

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { key: "login:ip:1000" },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(2000) } },
      { upsert: true, new: true }
    );
    expect(res.resetAt).toBe(2000);
  });
});
