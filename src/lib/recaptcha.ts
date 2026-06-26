const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
const MIN_SCORE = 0.5;

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  "error-codes"?: string[];
}

export async function verifyRecaptcha(
  token: string,
  expectedAction = "contribuir"
): Promise<{ ok: true; score: number } | { ok: false; error: string }> {
  const secret = process.env.RECAPTCHA_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "development") {
      console.warn("RECAPTCHA_SECRET no configurado — omitiendo verificación en dev");
      return { ok: true, score: 1 };
    }
    return { ok: false, error: "Verificación de seguridad no configurada" };
  }

  if (!token.trim()) {
    return { ok: false, error: "Token de verificación requerido" };
  }

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });

  const data = (await res.json()) as RecaptchaVerifyResponse;

  if (!data.success) {
    return { ok: false, error: "Verificación de seguridad fallida" };
  }

  if (data.action && data.action !== expectedAction) {
    return { ok: false, error: "Verificación de seguridad inválida" };
  }

  const score = data.score ?? 0;
  if (score < MIN_SCORE) {
    return { ok: false, error: "Verificación de seguridad fallida" };
  }

  return { ok: true, score };
}
