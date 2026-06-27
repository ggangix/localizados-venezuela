import { createHash } from "crypto";
import { isSameOriginRequest, jsonResponse } from "@/lib/api";
import { subscribeToSavedSearch } from "@/lib/notifications";

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
    destination?: string;
  };

  const queryName = body.queryName?.trim();
  const cedula = body.cedula?.trim();
  const age = body.age?.trim();
  const destination = body.destination?.trim();

  if (!queryName || !destination) {
    return jsonResponse({ error: "Datos de suscripción inválidos" }, { status: 400 });
  }

  try {
    const result = await subscribeToSavedSearch({
      queryName,
      cedula,
      age,
      channel: "webpush",
      destination,
      ipHash: hashIp(req),
    });
    return jsonResponse({
      ok: true,
      status: result.status,
      mensaje: "Listo, te avisaremos en este dispositivo si aparece una coincidencia.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return jsonResponse({ error: msg }, { status: 400 });
  }
}
