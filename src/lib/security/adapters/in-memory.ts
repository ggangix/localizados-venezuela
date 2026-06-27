import type {
  IRateLimiter,
  RateLimiterConfig,
  RateLimitResult,
} from "@/lib/security/rate-limiter";

export class InMemoryRateLimiter implements IRateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  constructor(private config: RateLimiterConfig) {}

  async check(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + this.config.windowMs;
      this.store.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: this.config.maxRequests - 1, resetAt };
    }

    if (entry.count >= this.config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }
}
