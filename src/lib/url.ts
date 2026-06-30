export function parsePageParam(value: string | undefined): number {
  return Math.max(1, Math.floor(Number(value ?? "1") || 1));
}

export function isSafeRedirect(url: string, allowedOrigin?: string): boolean {
  if (!url) return false;

  if (url.startsWith("/")) {
    if (url.startsWith("//")) return false;
    // Validar por RESOLUCIÓN, no por substring sobre el string crudo. El
    // navegador (y router.push) normalizan "\" a "/", eliminan tab/newline y
    // decodifican %5c, así que "/\evil.com" se vuelve "//evil.com" y termina
    // resolviendo a un dominio externo. Resolvemos contra un origen interno y
    // solo aceptamos si la ruta sigue siendo del mismo origen.
    try {
      const internal = "http://internal.invalid";
      return new URL(url, internal).origin === internal;
    } catch {
      return false;
    }
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
