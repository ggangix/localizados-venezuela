import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { sendTestWebhook } from "@/lib/webhooks";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  try {
    const result = await sendTestWebhook(id);
    return jsonResponse({
      ok: result.ok,
      status: result.status ?? null,
      error: result.error ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return jsonResponse({ error: msg }, { status: 400 });
  }
}
