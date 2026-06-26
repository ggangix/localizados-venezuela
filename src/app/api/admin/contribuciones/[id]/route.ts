import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import { approveContribucion, rejectContribucion } from "@/lib/admin-contribucion";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const body = (await req.json()) as {
    action?: "approve" | "reject";
    notasModeracion?: string;
    lugarId?: string;
    lugarNombre?: string;
    persona?: Record<string, string | undefined>;
  };

  try {
    if (body.action === "approve") {
      const result = await approveContribucion(id, {
        notasModeracion: body.notasModeracion,
        lugarId: body.lugarId,
        lugarNombre: body.lugarNombre,
        personaPatch: body.persona,
      });
      return jsonResponse({ ok: true, ...result });
    }

    if (body.action === "reject") {
      const result = await rejectContribucion(id, {
        notasModeracion: body.notasModeracion,
      });
      return jsonResponse({ ok: true, ...result });
    }

    return jsonResponse({ error: "action inválida" }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return jsonResponse({ error: msg }, { status: 400 });
  }
}