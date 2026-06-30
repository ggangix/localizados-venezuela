export function safeJsonParse<T>(
  text: string
): { ok: true; data: T } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, error: "JSON inválido" };
  }
}

export function safeJsonParseBody<T>(
  text: string
): { ok: true; data: T } | { ok: false; error: string } {
  if (!text || !text.trim()) {
    return { ok: false, error: "Body vacío" };
  }
  return safeJsonParse<T>(text);
}
