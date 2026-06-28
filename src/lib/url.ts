export function parsePageParam(value: string | undefined): number {
  return Math.max(1, Math.floor(Number(value ?? "1") || 1));
}

export function isSafeRedirect(url: string, allowedOrigin?: string): boolean {
  if (!url) return false;

  if (url.startsWith("/")) {
    if (url.startsWith("//")) return false;
    if (url.includes("@")) return false;
    return true;
  }

  if (allowedOrigin) {
    try {
      const parsed = new URL(url);
      return parsed.origin === allowedOrigin;
    } catch {
      return false;
    }
  }

  return false;
}
