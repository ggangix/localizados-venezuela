import { createRateLimiter } from "@/lib/security/rate-limiter";

export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});
