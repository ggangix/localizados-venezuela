import { createHash } from "crypto";
import { ContributionRateLimit } from "@/lib/models/ContributionRateLimit";

export const CONTRIBUTION_RATE_LIMIT = {
  limit: 5,
  windowMs: 60 * 1000,
} as const;

type HeadersLike = {
  get(name: string): string | null;
};

export type RateLimitDecision =
  | {
      ok: true;
      limit: number;
      remaining: number;
      resetAt: Date;
    }
  | {
      ok: false;
      limit: number;
      remaining: 0;
      resetAt: Date;
      retryAfter: number;
    };

function clientIp(headers: HeadersLike): string {
  const forwarded = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .find(Boolean);

  return forwarded ?? headers.get("x-real-ip")?.trim() ?? "unknown";
}

export function hashIp(headers: HeadersLike): string {
  return createHash("sha256").update(clientIp(headers)).digest("hex").slice(0, 16);
}

export function rateLimitWindow(now: Date, windowMs: number) {
  const windowStartMs = Math.floor(now.getTime() / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs);
  const resetAt = new Date(windowStartMs + windowMs);

  return { windowStart, resetAt };
}

export function rateLimitDecision(
  count: number,
  limit: number,
  resetAt: Date,
  now: Date
): RateLimitDecision {
  if (count <= limit) {
    return {
      ok: true,
      limit,
      remaining: limit - count,
      resetAt,
    };
  }

  const retryAfter = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));

  return {
    ok: false,
    limit,
    remaining: 0,
    resetAt,
    retryAfter,
  };
}

export async function checkContributionRateLimit(
  ipHash: string,
  now = new Date()
): Promise<RateLimitDecision> {
  const { limit, windowMs } = CONTRIBUTION_RATE_LIMIT;
  const { windowStart, resetAt } = rateLimitWindow(now, windowMs);

  const bucket = await ContributionRateLimit.findOneAndUpdate(
    { key: ipHash, windowStart },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        key: ipHash,
        windowStart,
        resetAt,
        expiresAt: new Date(resetAt.getTime() + windowMs),
      },
    },
    { new: true, upsert: true }
  ).lean();

  return rateLimitDecision(bucket.count, limit, resetAt, now);
}
