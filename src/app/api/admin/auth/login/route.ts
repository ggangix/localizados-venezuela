import { jsonResponse } from "@/lib/api";
import {
  isAdminConfigured,
  isValidAdminSecret,
  setAdminCookieResponse,
} from "@/lib/admin-auth";

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return jsonResponse({ error: "ADMIN_SECRET no configurado" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { secret?: string };
  const secret = body.secret?.trim();
  if (!secret || !isValidAdminSecret(secret)) {
    return jsonResponse({ error: "Clave incorrecta" }, { status: 401 });
  }

  return setAdminCookieResponse(secret);
}
