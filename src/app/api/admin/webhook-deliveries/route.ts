import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { connectDB } from "@/lib/db";
import { WebhookDelivery } from "@/lib/models/WebhookDelivery";

export async function GET(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  await connectDB();
  const url = new URL(req.url);
  const webhookId = url.searchParams.get("webhookId");
  const filter = webhookId ? { webhookId } : {};

  const deliveries = await WebhookDelivery.find(filter)
    .sort({ createdAt: -1 })
    .limit(50);

  return jsonResponse({
    data: deliveries.map((d) => ({
      id: String(d._id),
      webhookId: d.webhookId ? String(d.webhookId) : null,
      targetLabel: d.targetLabel,
      event: d.event,
      url: d.url,
      status: d.status,
      attempts: d.attempts,
      maxAttempts: d.maxAttempts,
      responseStatus: d.responseStatus ?? null,
      error: d.error ?? null,
      nextRetryAt: d.nextRetryAt ?? null,
      sentAt: d.sentAt ?? null,
      createdAt: d.createdAt,
    })),
  });
}
