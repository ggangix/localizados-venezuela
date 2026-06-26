import assert from "node:assert/strict";
import test from "node:test";
import { hashIp, rateLimitDecision, rateLimitWindow } from "@/lib/rate-limit";

test("hashIp uses the first forwarded IP address", () => {
  const headers = new Headers({
    "x-forwarded-for": "198.51.100.10, 10.0.0.2",
    "x-real-ip": "203.0.113.20",
  });

  assert.equal(hashIp(headers), "562ae54e815169e4");
});

test("rateLimitDecision allows requests up to the limit", () => {
  const now = new Date("2026-06-26T18:00:10.000Z");
  const resetAt = new Date("2026-06-26T18:01:00.000Z");

  assert.deepEqual(rateLimitDecision(5, 5, resetAt, now), {
    ok: true,
    limit: 5,
    remaining: 0,
    resetAt,
  });
});

test("rateLimitDecision blocks requests over the limit with Retry-After seconds", () => {
  const now = new Date("2026-06-26T18:00:10.100Z");
  const resetAt = new Date("2026-06-26T18:01:00.000Z");

  assert.deepEqual(rateLimitDecision(6, 5, resetAt, now), {
    ok: false,
    limit: 5,
    remaining: 0,
    resetAt,
    retryAfter: 50,
  });
});

test("rateLimitWindow buckets requests into a fixed one-minute window", () => {
  const now = new Date("2026-06-26T18:00:59.999Z");

  assert.deepEqual(rateLimitWindow(now, 60_000), {
    windowStart: new Date("2026-06-26T18:00:00.000Z"),
    resetAt: new Date("2026-06-26T18:01:00.000Z"),
  });
});
