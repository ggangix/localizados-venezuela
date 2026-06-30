import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { connectDB } from "@/lib/db";
import { Webhook, WEBHOOK_EVENTS } from "@/lib/models/Webhook";
import { isValidWebhookUrl, serializeWebhook } from "@/lib/webhooks";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  await connectDB();
  const hooks = await Webhook.find().sort({ createdAt: -1 });
  return jsonResponse({
    data: hooks.map(serializeWebhook),
    events: WEBHOOK_EVENTS,
  });
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => ({}))) as {
    nombre?: string;
    url?: string;
    secret?: string;
    events?: string[];
    active?: boolean;
  };

  const nombre = body.nombre?.trim();
  const url = body.url?.trim();
  const secret = body.secret?.trim() || undefined;
  const events =
    Array.isArray(body.events) && body.events.length
      ? body.events
      : ["localizado.published"];

  if (!nombre || !url) {
    return jsonResponse({ error: "nombre y url requeridos" }, { status: 400 });
  }
  if (!isValidWebhookUrl(url)) {
    return jsonResponse({ error: "URL inválida (usa http o https)" }, { status: 400 });
  }
  const invalid = events.filter(
    (e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e)
  );
  if (invalid.length) {
    return jsonResponse(
      { error: `Eventos inválidos: ${invalid.join(", ")}` },
      { status: 400 }
    );
  }

  await connectDB();
  const doc = await Webhook.create({
    nombre,
    url,
    secret,
    events,
    active: body.active !== false,
  });
  return jsonResponse({ ok: true, id: String(doc._id) });
}
