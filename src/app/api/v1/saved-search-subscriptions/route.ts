import { createHash } from "crypto";
import { isSameOriginRequest, jsonResponse } from "@/lib/api";
import { isNotificationChannel, subscribeToSavedSearch } from "@/lib/notifications";

function hashIp(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return jsonResponse({ error: "Origen no permitido" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    queryName?: string;
    cedula?: string;
    age?: string;
    channel?: string;
    destination?: string;
  };

  const queryName = body.queryName?.trim();
  const cedula = body.cedula?.trim();
  const age = body.age?.trim();
  const channel = body.channel?.trim() ?? "";
  const destination = body.destination?.trim();

  if (!queryName || !destination || !isNotificationChannel(channel)) {
    return jsonResponse({ error: "Datos de suscripción inválidos" }, { status: 400 });
  }

  try {
    const result = await subscribeToSavedSearch({
      queryName,
      cedula,
      age,
      channel,
      destination,
      ipHash: hashIp(req),
    });
    return jsonResponse({
      ok: true,
      status: result.status,
      confirmationToken: result.confirmationToken,
      mensaje: "Revisa tu correo para confirmar el aviso.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return jsonResponse({ error: msg }, { status: 400 });
  }
}
