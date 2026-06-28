import { jsonResponse } from "@/lib/api";
import { withErrorHandler } from "@/lib/api-middleware";
import { requireAdmin } from "@/lib/admin-auth";
import { approveContribucion, rejectContribucion } from "@/lib/admin-contribucion";
import { safeJsonParseBody } from "@/lib/safe-json";
import { ValidationError } from "@/lib/errors";
import mongoose from "mongoose";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withErrorHandler(async (req: Request, { params }: Params) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("ID inválido");
  }

  const bodyText = await req.text();
  const parsed = safeJsonParseBody<{
    action?: string;
    notasModeracion?: string;
    lugarId?: string;
    lugarNombre?: string;
    persona?: Record<string, string | undefined>;
  }>(bodyText);
  if (!parsed.ok) {
    return jsonResponse({ error: "JSON inválido" }, { status: 400 });
  }

  const body = parsed.data;

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
});
