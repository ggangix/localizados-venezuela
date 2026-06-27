import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { processPendingWebhookDeliveries } from "@/lib/webhooks";

// Reprocesa entregas fallidas vencidas. Pensado para un cron (recuperación durable
// tras reinicios) o para disparar manualmente desde el panel.
export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const processed = await processPendingWebhookDeliveries();
  return jsonResponse({ ok: true, processed });
}
