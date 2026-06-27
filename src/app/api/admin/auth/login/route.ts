import { jsonResponse } from "@/lib/api";
import { withErrorHandler } from "@/lib/api-middleware";
import {
  isAdminConfigured,
  isValidAdminSecret,
  createAdminSessionResponse,
} from "@/lib/admin-auth";
import { loginRateLimiter } from "@/lib/rate-limiter";
import { safeJsonParseBody } from "@/lib/safe-json";

export const POST = withErrorHandler(async (req: Request) => {
  if (!isAdminConfigured()) {
    return jsonResponse({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const ipHash = ip;
  const rateCheck = loginRateLimiter.check(`login:${ipHash}`);
  if (!rateCheck.allowed) {
    return jsonResponse(
      { error: "Demasiados intentos. Espera 15 minutos." },
      { status: 429 }
    );
  }

  const bodyText = await req.text();
  const parsed = safeJsonParseBody<{ secret?: string }>(bodyText);
  if (!parsed.ok) {
    return jsonResponse({ error: "JSON inválido" }, { status: 400 });
  }

  const secret = String(parsed.data.secret ?? "").trim();
  if (!secret || !isValidAdminSecret(secret)) {
    return jsonResponse({ error: "Clave incorrecta" }, { status: 401 });
  }

  return await createAdminSessionResponse();
});
