interface RateLimiterConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export class InMemoryRateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  constructor(private config: RateLimiterConfig) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + this.config.windowMs });
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
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

export const loginRateLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

export const contributionRateLimiter = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 5,
});
