import { InMemoryRateLimiter } from "@/lib/security/adapters/in-memory";
import { MongoRateLimiter } from "@/lib/security/adapters/mongo";

export interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export interface IRateLimiter {
  check(key: string): Promise<RateLimitResult>;
}

export function createRateLimiter(config: RateLimiterConfig): IRateLimiter {
  const backend = process.env.RATE_LIMIT_BACKEND || "memory";

  if (backend === "mongo") {
    return new MongoRateLimiter(config);
  }

  if (backend !== "memory") {
    console.warn(
      `[rate-limiter] RATE_LIMIT_BACKEND="${backend}" no reconocido; usando "memory".`
    );
  }

  return new InMemoryRateLimiter(config);
}
