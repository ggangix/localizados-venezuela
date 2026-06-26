import { jsonResponse } from "@/lib/api";
import { requireAdmin } from "@/lib/admin-auth";
import {
  moveLocalizados,
  restoreLocalizados,
  softDeleteLocalizados,
  updateLocalizado,
} from "@/lib/admin-localizado";

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json()) as {
    ids?: string[];
    action?: "delete" | "restore" | "move" | "publish" | "reject";
    lugarId?: string;
  };

  const ids = body.ids?.filter(Boolean) ?? [];
  if (!ids.length) return jsonResponse({ error: "ids requerido" }, { status: 400 });

  try {
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
        const n = await moveLocalizados(ids, body.lugarId);
        return jsonResponse({ ok: true, affected: n });
      }
      case "publish": {
        let n = 0;
        for (const id of ids) {
          try {
            await updateLocalizado(id, { estado: "published" });
            n++;
          } catch {
            // skip dupes
          }
        }
        return jsonResponse({ ok: true, affected: n });
      }
      case "reject": {
        let n = 0;
        for (const id of ids) {
          try {
            await updateLocalizado(id, { estado: "rejected" });
            n++;
          } catch {
            // skip
          }
        }
        return jsonResponse({ ok: true, affected: n });
      }
      default:
        return jsonResponse({ error: "action inválida" }, { status: 400 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return jsonResponse({ error: msg }, { status: 400 });
  }
}