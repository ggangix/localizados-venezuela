import { createHash } from "crypto";
import { subscribeToLocalizado } from "@/lib/notifications";
import { isSameOriginRequest, jsonResponse } from "@/lib/api";

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
    slug?: string;
    destination?: string;
  };

  const slug = body.slug?.trim();
  const destination = body.destination?.trim();

  if (!slug || !destination) {
    return jsonResponse({ error: "Datos de suscripción inválidos" }, { status: 400 });
  }

  try {
    const result = await subscribeToLocalizado({
      slug,
      channel: "webpush",
      destination,
      ipHash: hashIp(req),
    });
    return jsonResponse({
      ok: true,
      status: result.status,
      mensaje: "Listo, te avisaremos en este dispositivo.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return jsonResponse({ error: msg }, { status: 400 });
  }
}
