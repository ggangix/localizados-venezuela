import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { softDeleteLocalizados, updateLocalizado } from "@/lib/admin-localizado";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json();

  try {
    const doc = await updateLocalizado(id, body);
    return jsonResponse({ ok: true, id: String(doc._id) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return jsonResponse({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const count = await softDeleteLocalizados([id]);
  return jsonResponse({ ok: true, deleted: count });
}