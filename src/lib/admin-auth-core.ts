import { createHash, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "lv_admin";

export function getAdminSecrets(): string[] {
  return (process.env.ADMIN_SECRET ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdminConfigured(): boolean {
  return getAdminSecrets().length > 0;
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isValidAdminSecret(secret: string): boolean {
  return getAdminSecrets().some((s) => safeEqual(s, secret));
}