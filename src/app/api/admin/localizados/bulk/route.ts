import { jsonResponse } from "@/lib/api";
import { withErrorHandler } from "@/lib/api-middleware";
import { requireAdmin } from "@/lib/admin-auth";
import {
  moveLocalizados,
  restoreLocalizados,
  setEstadoLocalizados,
  softDeleteLocalizados,
} from "@/lib/admin-localizado";
import { safeJsonParseBody } from "@/lib/safe-json";
import { ValidationError } from "@/lib/errors";
import mongoose from "mongoose";

export const POST = withErrorHandler(async (req: Request) => {
  const denied = await requireAdmin();
  if (denied) return denied;

  const bodyText = await req.text();
  const parsed = safeJsonParseBody<{
    ids?: string[];
    action?: string;
    lugarId?: string;
  }>(bodyText);
  if (!parsed.ok) {
    return jsonResponse({ error: "JSON inválido" }, { status: 400 });
  }

  const ids = parsed.data.ids?.filter(Boolean) as string[] | undefined;
  if (!ids?.length) {
    return jsonResponse({ error: "ids requerido" }, { status: 400 });
  }
  // `filter(Boolean)` conserva objetos: sin esto, ids como [{ "$ne": null }]
  // se castean a un operador en el $in y matchean un registro arbitrario
  // (inyección de operador NoSQL). Exigimos ObjectId string -> 400 limpio.
  if (
    !ids.every((id) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id))
  ) {
    throw new ValidationError("ids inválidos");
  }

  const body = parsed.data;

  switch (body.action) {
    case "delete": {
      const n = await softDeleteLocalizados(ids);
      return jsonResponse({ ok: true, affected: n });
    }
    case "restore": {
      const n = await restoreLocalizados(ids);
      return jsonResponse({ ok: true, affected: n });
    }
    case "move": {
      if (!body.lugarId) {
        return jsonResponse({ error: "lugarId requerido" }, { status: 400 });
      }
      if (!mongoose.Types.ObjectId.isValid(body.lugarId)) {
        throw new ValidationError("lugarId inválido");
      }
      const n = await moveLocalizados(ids, body.lugarId);
      return jsonResponse({ ok: true, affected: n });
    }
    case "publish": {
      const r = await setEstadoLocalizados(ids, "published");
      return jsonResponse({ ok: r.affected === r.total, ...r });
    }
    case "reject": {
      const r = await setEstadoLocalizados(ids, "rejected");
      return jsonResponse({ ok: r.affected === r.total, ...r });
    }
    default:
      throw new ValidationError("action inválida");
  }
});
