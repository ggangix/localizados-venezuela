import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { connectDB } from "@/lib/db";
import { Webhook, WEBHOOK_EVENTS } from "@/lib/models/Webhook";
import { isValidWebhookUrl } from "@/lib/webhooks";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    nombre?: string;
    url?: string;
    secret?: string;
    events?: string[];
    active?: boolean;
  };

  const update: Record<string, unknown> = {};
  if (typeof body.nombre === "string") update.nombre = body.nombre.trim();
  if (typeof body.url === "string") {
    const url = body.url.trim();
    if (!isValidWebhookUrl(url)) {
      return jsonResponse(
        { error: "URL inválida (usa http o https)" },
        { status: 400 }
      );
    }
    update.url = url;
  }
  if (typeof body.active === "boolean") update.active = body.active;
  if (Array.isArray(body.events)) {
    const invalid = body.events.filter(
      (e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e)
    );
    if (invalid.length) {
      return jsonResponse(
        { error: `Eventos inválidos: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }
    update.events = body.events;
  }
  // Secreto vacío lo borra; ausente lo deja igual.
  if (typeof body.secret === "string") {
    update.secret = body.secret.trim() || undefined;
  }

  await connectDB();
  const doc = await Webhook.findByIdAndUpdate(id, { $set: update }, { new: true });
  if (!doc) return jsonResponse({ error: "Webhook no encontrado" }, { status: 404 });
  return jsonResponse({ ok: true, id: String(doc._id) });
}

export async function DELETE(req: Request, { params }: Params) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  await connectDB();
  await Webhook.findByIdAndDelete(id);
  return jsonResponse({ ok: true });
}
