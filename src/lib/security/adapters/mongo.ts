import { connectDB } from "@/lib/db";
import { RateLimit } from "@/lib/models/RateLimit";
import type {
  IRateLimiter,
  RateLimiterConfig,
  RateLimitResult,
} from "@/lib/security/rate-limiter";

export class MongoRateLimiter implements IRateLimiter {
  constructor(private config: RateLimiterConfig) {}

  async check(key: string): Promise<RateLimitResult> {
    await connectDB();

    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowMs) * this.config.windowMs;
    const resetAt = windowStart + this.config.windowMs;
    const windowKey = `${key}:${windowStart}`;

    const doc = await RateLimit.findOneAndUpdate(
      { key: windowKey },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(resetAt) } },
      { upsert: true, new: true }
    );

    const count = doc?.count ?? 1;

    return {
      allowed: count <= this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - count),
      resetAt,
    };
  }
}
